const moment = require('moment')
const Booking = require('../models/booking.model')
const ScreenSeat = require('../models/screenSeat.model')
const { REDIS_GET, REDIS_SETEX, REDIS_DEL } = require('./redis.service')

class BookingService {
	async holdSeats({ showtimeId, requestedSeats, selectedSeats }) {
		try {
			const availableSeats = await ScreenSeat.findAll({
				where: { showtime_id: showtimeId, status: 'available' },
				attributes: ['seat_id', 'seat_row', 'seat_number'],
				raw: true,
			})

			const seatList = availableSeats.map(seat => `${seat.seat_row}${seat.seat_number}`)

			const result = allocateSeatsWithNoLonelySeats(seatList, requestedSeats, selectedSeats)
			if (!result.success) {
				return { success: false, message: result.message }
			}

			const holdSeats = result.seats
			const holdKey = `hold:showtime:${showtimeId}:seats`

			await Promise.all(
				holdSeats.map(seat =>
					REDIS_SETEX(`${holdKey}:${seat}`, 300, moment().add(5, 'minutes').toISOString())
				)
			)

			await ScreenSeat.update(
				{ status: 'held' },
				{ where: { seat_id: holdSeats.map(seat => seat.seat_id) } }
			)

			return { success: true, seats: holdSeats, message: 'Seats held successfully.' }
		} catch (error) {
			console.error(`[Hold Seats] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to hold seats.')
		}
	}
	async releaseSeats({ showtimeId, seatIds }) {
		try {
			const releaseKey = `hold:showtime:${showtimeId}:seats`

			await Promise.all(seatIds.map(seat => REDIS_DEL(`${releaseKey}:${seat}`)))

			await ScreenSeat.update({ status: 'available' }, { where: { seat_id: seatIds } })

			return { success: true, message: 'Seats released successfully.' }
		} catch (error) {
			console.error(`[Release Seats] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to release seats.')
		}
	}

	async createBooking({ showtimeId, userId, seatIds, totalPrice }) {
		const transaction = await sequelize.transaction()
		try {
			// Lấy thông tin ghế và kiểm tra trạng thái
			const seats = await ScreenSeat.findAll({
				where: { seat_id: seatIds },
				attributes: ['seat_id', 'seat_row', 'seat_number', 'status'],
				transaction,
			})

			if (seats.length !== seatIds.length) {
				throw new Error('Some seats are invalid.')
			}

			const unavailableSeats = seats.filter(seat =>
				['reserved', 'held', 'occupied'].includes(seat.status)
			)
			if (unavailableSeats.length > 0) {
				throw new Error(
					`Seats not available: ${unavailableSeats
						.map(s => `${s.seat_row}${s.seat_number}`)
						.join(', ')}`
				)
			}

			// Lấy danh sách mã ghế (A01, B02, ...)
			const seatCodes = seats.map(seat => `${seat.seat_row}${seat.seat_number}`)

			// Tạo booking mới với danh sách mã ghế
			const newBooking = await Booking.create(
				{
					showtime_id: showtimeId,
					user_id: userId,
					seats: seatCodes, // Lưu mã ghế vào booking
					total_price: totalPrice,
					status: 'PENDING',
				},
				{ transaction }
			)

			// Cập nhật trạng thái ghế
			await ScreenSeat.update(
				{ status: 'reserved', booking_id: newBooking.booking_id },
				{ where: { seat_id: seatIds }, transaction }
			)

			// Xóa cache cũ
			const cacheKey = `bookings:showtime:${showtimeId}`
			await REDIS_DEL(cacheKey)

			await transaction.commit()
			return newBooking
		} catch (error) {
			await transaction.rollback()
			console.error(`[Create Booking] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to create booking.')
		}
	}

	async confirmBooking({ bookingId }) {
		const transaction = await sequelize.transaction()
		try {
			// Lấy thông tin booking
			const booking = await Booking.findByPk(bookingId, { transaction })
			if (!booking) {
				throw new Error('Booking not found.')
			}

			if (booking.status !== 'PENDING') {
				throw new Error('Booking is not in a valid state for confirmation.')
			}

			// Cập nhật trạng thái booking
			await booking.update({ status: 'COMPLETED' }, { transaction })

			// Cập nhật trạng thái ghế
			await ScreenSeat.update(
				{ status: 'occupied' },
				{ where: { booking_id: bookingId }, transaction }
			)

			// Xóa cache liên quan
			const cacheKey = `bookings:showtime:${booking.showtime_id}`
			await REDIS_DEL(cacheKey)
			const cacheKey2 = `hold:showtime:${booking.showtime_id}:seats`
			await REDIS_DEL(cacheKey2)

			await transaction.commit()
			return { message: 'Booking COMPLETED successfully.' }
		} catch (error) {
			await transaction.rollback()
			console.error(`[Confirm Booking] Error: ${error.message}`)
			throw new Error(error.message || 'Failed to confirm booking.')
		}
	}

	async cancelBooking({ bookingId }) {
		const transaction = await sequelize.transaction()
		try {
			// Lấy thông tin booking
			const booking = await Booking.findByPk(bookingId, { transaction })
			if (!booking) {
				throw new Error('Booking not found.')
			}

			if (booking.status === 'CANCELED') {
				throw new Error('Booking is already CANCELED.')
			}

			// Cập nhật trạng thái booking
			await booking.update({ status: 'CANCELED' }, { transaction })

			// Cập nhật trạng thái ghế
			await ScreenSeat.update(
				{ status: 'available' },
				{ where: { booking_id: bookingId }, transaction }
			)

			// Xóa cache liên quan
			const cacheKey = `bookings:showtime:${booking.showtime_id}`
			await REDIS_DEL(cacheKey)

			await transaction.commit()
			return { message: 'Booking CANCELED successfully.' }
		} catch (error) {
			await transaction.rollback()
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
}

module.exports = new BookingService()
