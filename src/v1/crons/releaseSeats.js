const cron = require('node-cron')
const { REDIS_GET } = require('../services/redis.service')
const BookingService = require('../services/booking.service')
const moment = require('moment')

const releaseHeldSeats = async () => {
	try {
		const keys = await REDIS_GET('hold:*')
		const now = moment()

		if (keys === null || keys === undefined) {
			console.info(`[Cron Release Seats] Info: No hold seat available for release`)
		} else {
			for (const key of keys) {
				const holdTime = await REDIS_GET(key)
				if (moment(holdTime).isBefore(now)) {
					const seatInfo = key.split(':')
					const showtimeId = seatInfo[2]
					const seatId = seatInfo[4]

					await BookingService.releaseSeats(showtimeId, [seatId])
				}
			}
		}
	} catch (error) {
		console.error(`[Cron Release Seats] Error: ${error.message}`)
	}
}
const startCronJob = () => {
	cron.schedule('* * * * *', releaseHeldSeats)
}

module.exports = startCronJob
