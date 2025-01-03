const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const logger = require('./v1/utils/logs/logger')
const releaseSeatsJob = require('./v1/crons/releaseSeats')
const app = express()

//init dbs
require('./v1/configs/databases/init.redis')
require('./v1/configs/databases/init.mysql')

//user middleware
app.use(helmet())
app.use(
	morgan('combined', {
		stream: {
			write: message => logger.info(message.trim()), // Direct Morgan's logs to Winston's info level
		},
	})
)

// compress responses
app.use(compression())

// add body-parser
app.use(express.json())
app.use(
	express.urlencoded({
		extended: true,
	})
)
//model
require('./v1/models/index.model')

//crons
releaseSeatsJob()

//router
app.use(require('./v1/routes/index.router'))

// Error Handling Middleware called

app.use((req, res, next) => {
	const error = new Error('Not found')
	error.status = 404
	next(error)
})

// error handler middleware
app.use((error, req, res, next) => {
	res.status(error.status || 500).send({
		error: {
			status: error.status || 500,
			message: error.message || 'Internal Server Error',
		},
	})
})

module.exports = app
