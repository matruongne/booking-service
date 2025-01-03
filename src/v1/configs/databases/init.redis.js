const { createClient } = require('redis')
const redisClient = createClient({
	url: process.env.REDIS_URL || process.env.REDIS_CLOUD_URL,
	legacyMode: true,
})
;(async () => {
	try {
		await redisClient.connect()
		console.log('Redis client connected')
	} catch (error) {
		console.error('Redis connection error:', error)
	}
})()

redisClient.ping(function (err, result) {
	console.log(result)
})

redisClient.on('error', error => {
	console.error(error)
})

module.exports = redisClient
