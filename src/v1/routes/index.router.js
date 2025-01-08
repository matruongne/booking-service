const express = require('express')
const router = express.Router()
const bookingsRouter = require('./booking.router')

router.get('/checkstatus', (req, res, next) => {
	res.status(200).json({
		status: 'success',
		message: 'api ok',
	})
})

router.use('/v1/bookings', bookingsRouter)

module.exports = router
