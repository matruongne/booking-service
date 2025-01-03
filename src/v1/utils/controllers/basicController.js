const { CommonException } = require('../exceptions/commonException')
const logger = require('../logs/logger')

class BasicController {
	handleResponseError(res, error) {
		if (error instanceof CommonException) {
			logger.error(
				`${error.statusCode || 500} - ${
					error.message || 'Something went wrong, please check the information and try again later'
				}`
			)
			return res.status(error.statusCode || 500).json(error.message)
		}
		console.log(error)
		return res.status(error.statusCode || 500).json({
			message:
				error.message || 'Something went wrong, please check the information and try again later',
		})
	}
}

module.exports = BasicController
