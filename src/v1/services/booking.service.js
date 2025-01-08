const moment = require('moment')
const { ScreenSeat, Booking, Screen } = require('../models/index.model')
const { REDIS_GET, REDIS_SETEX, REDIS_DEL } = require('./redis.service')
const allocateSeatsWithNoLonelySeats = require('../utils/seatAllocation/allocateSeatsWithNoLonelySeats')
const { sequelize } = require('../configs/databases/init.mysql')
const { Op } = require('sequelize')
const Showtime = require('../models/showtime.model')
const ShowDate = require('../models/showdate.model')

class BookingService {
	async holdSeats({ showtimeId, requestedSeats, selectedSeats }) {
		const transaction = await sequelize.transaction()
		try {
			const availableSeats = await ScreenSeat.findAll({
				include: [
					{
						model: Screen,
						where: { showtime_id: showtimeId },
						attributes: [],
					},
				],
				where: { status: 'available' },
				attributes: ['seat_id', 'seat_row', 'seat_number'],
				raw: true,
				transaction,
			})

			const seatList = availableSeats.map(seat => ({
				seat_code: `${seat.seat_row}${seat.seat_number}`,
				seat_id: seat.seat_id,
			}))

			const result = allocateSeatsWithNoLonelySeats(seatList, requestedSeats, selectedSeats)

			if (!result.success) {
				await transaction.rollback()
				return { success: false, message: result.message }
			}

			const holdSeats = result.seats

			const holdKey = `hold:showtime:${showtimeId}:seats`
			await Promise.all(
				holdSeats.map(seat =>
					REDIS_SETEX(
						`${holdKey}:${seat.seat_id}`,
						400,
						JSON.stringify({
							time: moment().add(5, 'minutes').toISOString(),
							seatId: seat.seat_id,
							showtimeId,
						})
					)
				)
			)

			await ScreenSeat.update(
				{ status: 'held' },
				{ where: { seat_id: holdSeats.map(seat => seat.seat_id) }, transaction }
			)

			await transaction.commit()
			return { success: true, seats: holdSeats, message: 'Seats held successfully.' }
		} catch (error) {
			await transaction.rollback()
			console.error(`[Hold Seats] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to hold seats.')
		}
	}

	async releaseSeats({ showtimeId, seatId }) {
		const transaction = await sequelize.transaction()
		try {
			const releaseKey = `hold:showtime:${showtimeId}:seats:${seatId}`
			await REDIS_DEL(releaseKey)

			await ScreenSeat.update({ status: 'available' }, { where: { seat_id: seatId }, transaction })

			await transaction.commit()
			return { success: true, message: 'Seats released successfully.' }
		} catch (error) {
			await transaction.rollback()
			console.error(`[Release Seats] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to release seats.')
		}
	}

	async createBooking({ showtimeId, userId, seatIds, totalPrice }) {
		const transaction = await sequelize.transaction()
		try {
			const seats = await ScreenSeat.findAll({
				where: { seat_id: seatIds },
				attributes: ['seat_id', 'seat_row', 'seat_number', 'status'],
				transaction,
			})

			if (seats.length !== seatIds.length) {
				throw new Error('Some seats are invalid.')
			}

			const unavailableSeats = seats.filter(seat => ['reserved', 'occupied'].includes(seat.status))

			if (unavailableSeats.length > 0) {
				throw new Error(
					`Seats not available: ${unavailableSeats
						.map(s => `${s.seat_row}${s.seat_number}`)
						.join(', ')}`
				)
			}

			const seatCodes = seats.map(seat => {
				return { seat_id: seat.seat_id, seat_code: `${seat.seat_row}${seat.seat_number}` }
			})

			const newBooking = await Booking.create(
				{
					showtime_id: showtimeId,
					user_id: userId,
					seats: seatCodes,
					total_price: parseFloat(totalPrice),
					payment_status: 'PENDING',
				},
				{ transaction }
			)

			await ScreenSeat.update(
				{ status: 'reserved', booking_id: newBooking.booking_id },
				{ where: { seat_id: seatIds }, transaction }
			)
			const expirationTime = moment().add(30, 'minutes').toISOString()

			const cacheKey = `bookings:showtime:${showtimeId}:${newBooking.booking_id}`
			await REDIS_SETEX(cacheKey, 3000, JSON.stringify({ expirationTime, newBooking }))

			for (const seat of seatIds) {
				const cacheKey2 = `hold:showtime:${newBooking.showtime_id}:seats:${seat}`
				await REDIS_DEL(cacheKey2)
			}

			await transaction.commit()
			return newBooking
		} catch (error) {
			await transaction.rollback()
			console.error(`[Create Booking] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to create booking.')
		}
	}

	async cancelPendingBooking(bookingId) {
		const transaction = await sequelize.transaction()
		try {
			const booking = await Booking.findOne({
				where: { booking_id: bookingId, payment_status: 'PENDING' },
				attributes: ['booking_id', 'seats'],
			})

			if (!booking) {
				return { success: false, message: 'Booking not found or not eligible for cancellation.' }
			}

			const seatIds = JSON.parse(booking.seats).map(seat => seat.seat_id)

			await ScreenSeat.update(
				{ status: 'available', booking_id: null },
				{ where: { seat_id: seatIds }, transaction }
			)

			await Booking.update(
				{ payment_status: 'CANCELED' },
				{ where: { booking_id: bookingId }, transaction }
			)

			await transaction.commit()
			return { success: true, message: 'Booking canceled successfully.' }
		} catch (error) {
			await transaction.rollback()
			console.error(`[Cancel Pending Booking] Error: ${error.message}`)
			throw new Error('Failed to cancel pending booking.')
		}
	}

	async confirmBooking({ bookingId }) {
		const transaction = await sequelize.transaction()
		try {
			const booking = await Booking.findByPk(bookingId, { transaction })
			if (!booking) {
				throw new Error('Booking not found.')
			}

			if (booking.payment_status !== 'PENDING') {
				throw new Error('Booking is not in a valid state for confirmation.')
			}

			await booking.update({ payment_status: 'COMPLETED' }, { transaction })

			await ScreenSeat.update(
				{ status: 'occupied' },
				{ where: { booking_id: bookingId }, transaction }
			)

			const cacheKey = `bookings:showtime:${booking.showtime_id}:${booking.booking_id}`
			await REDIS_DEL(cacheKey)

			await transaction.commit()
			return { success: true, message: 'Booking COMPLETED successfully.' }
		} catch (error) {
			await transaction.rollback()
			console.error(`[Confirm Booking] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to confirm booking.')
		}
	}

	async cancelBooking({ userId, bookingId }) {
		const transaction = await sequelize.transaction()
		try {
			const booking = await Booking.findOne({
				where: { booking_id: bookingId, user_id: userId },
				include: {
					model: Showtime,
					attributes: ['show_time', 'show_date_id'],
					include: {
						model: ShowDate,
						attributes: ['show_date'],
					},
				},
			})

			if (!booking) {
				throw new Error('Booking not found.')
			}

			if (booking.payment_status === 'CANCELED') {
				throw new Error('Booking is already CANCELED.')
			}

			const showtime = booking.Showtime
			const showDate = new Date(showtime.ShowDate.show_date)
			const showTime = new Date(`${showDate.toDateString()} ${showtime.show_time}`)
			const currentTime = new Date()
			const hoursUntilShowtime = (showTime - currentTime) / (1000 * 60 * 60)

			if (hoursUntilShowtime < 0) {
				throw new Error('Cannot cancel after showtime.')
			}

			let refundAmount = 0
			if (hoursUntilShowtime >= process.env.REFUND_POLICY_HOURS) {
				refundAmount = booking.total_price
			} else {
				refundAmount = 0
			}

			const transaction = await sequelize.transaction()

			await booking.update({ payment_status: 'CANCELED' }, { transaction })

			const seatIds = JSON.parse(booking.seats).map(seat => seat.seatId)
			await ScreenSeat.update({ status: 'available' }, { where: { seat_id: seatIds }, transaction })

			const cacheKey = `bookings:showtime:${booking.showtime_id}:${booking.booking_id}`
			await REDIS_DEL(cacheKey)

			await transaction.commit()

			return {
				success: true,
				message: `Booking canceled. Refund amount: ${refundAmount}.`,
				refund: refundAmount,
			}
		} catch (error) {
			if (transaction) await transaction.rollback()
			console.error(`[Cancel Booking] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to cancel booking.')
		}
	}

	async getBookingsByShowtime({ showtimeId }) {
		const cacheKey = `bookings:showtime:${showtimeId}`
		try {
			const cachedBookings = await REDIS_GET(cacheKey)
			if (cachedBookings) {
				return JSON.parse(cachedBookings)
			}

			const bookings = await Booking.findAll({ where: { showtime_id: showtimeId } })

			await REDIS_SETEX(cacheKey, 3600, JSON.stringify(bookings))

			return bookings
		} catch (error) {
			console.error('[Get Bookings] Error:', error.message)
			throw new Error('Failed to fetch bookings.')
		}
	}
	async getBookingHistory({ userId }) {
		try {
			const bookings = await Booking.findAll({
				where: { user_id: userId },
				attributes: [
					'booking_id',
					'showtime_id',
					'seats',
					'total_price',
					'payment_status',
					'created_at',
				],
				order: [['created_at', 'DESC']],
			})

			if (!bookings.length) {
				return { success: true, data: [], message: 'No bookings found.' }
			}

			const history = {
				completed: [],
				canceled: [],
				pending: [],
			}

			bookings.forEach(booking => {
				history[booking.payment_status.toLowerCase()].push(booking)
			})

			return history
		} catch (error) {
			console.error(`[Get Booking History] Error: ${error.message}`)
			throw new Error('Failed to fetch booking history.')
		}
	}
}

module.exports = new BookingService()
