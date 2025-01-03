const jwt = require('jsonwebtoken')
const { BadRequestException } = require('../utils/exceptions/commonException')
const JWT_ACCESS_TOKEN_SECRET = Buffer.from(process.env.JWT_ACCESS_TOKEN_SECRET, 'base64')

const authenticateToken = (req, res, next) => {
	try {
		token = req.cookies?.accessToken
	} catch (e) {
		console.log('get token from cookies failed:', e.message)
		return res.sendStatus(403)
	}
	try {
		const user = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET)
		req.user = user.user
		next()
	} catch (err) {
		throw new BadRequestException('Unauthorized Error: Invalid token or token expired', 401, 401)
	}
}

module.exports = authenticateToken
