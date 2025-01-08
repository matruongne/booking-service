const cron = require('node-cron')
const { REDIS_GET, REDIS_KEYS, REDIS_DEL } = require('../services/redis.service')
const BookingService = require('../services/booking.service')
const moment = require('moment')
const bookingService = require('../services/booking.service')

const releaseHeldSeats = async () => {
	try {
		const keys = await REDIS_KEYS('hold:showtime:*')
		const now = moment()

		if (!keys || keys.length === 0 || keys === null) {
			console.info(`[Cron Release Seats] Info: No hold seat available for release`)
		} else {
			for (const key of keys) {
				const seatInfo = JSON.parse(await REDIS_GET(key))
				const holdTime = seatInfo.time

				if (moment(holdTime).isBefore(now)) {
					const showtimeId = seatInfo.showtimeId
					const seatId = seatInfo.seatId

					const result = await BookingService.releaseSeats({ showtimeId, seatId })

					if (result.success) {
						console.log(`[Cron Release Seats] Info: Release Seats-${seatId} Success`)
					}
				}
			}
		}
	} catch (error) {
		console.error(`[Cron Release Seats] Error: ${error.message}`)
	}
}
const cancelPendingBookings = async () => {
	try {
		const keys = await REDIS_KEYS('bookings:showtime:*')
		const now = moment()

		if (!keys || keys.length === 0 || keys === null) {
			console.info('[Cron Cancel Pending Booking] Info: No pending bookings to cancel.')
		} else
			for (const key of keys) {
				const bookingInfo = JSON.parse(await REDIS_GET(key))
				const expirationTime = bookingInfo.expirationTime

				if (moment(expirationTime).isBefore(now)) {
					const bookingId = bookingInfo?.newBooking.booking_id

					const result = await bookingService.cancelPendingBooking(bookingId)

					if (result.success) {
						console.log(`[Cron Cancel Pending Booking] Info: Booking-${bookingId} canceled.`)
						await REDIS_DEL(key)
					} else {
						console.warn(`[Cron Cancel Pending Booking] Warning: ${result.message}`)
					}
				}
			}
	} catch (error) {
		console.error(`[Cron Cancel Pending Booking] Error: ${error.message}`)
	}
}
const startCronJob = () => {
	cron.schedule('*/10 * * * * *', releaseHeldSeats)
	cron.schedule('*/10 * * * * *', cancelPendingBookings)
}

module.exports = startCronJob
