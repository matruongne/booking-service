const client = require('../configs/databases/init.redis')
const { promisify } = require('util')

const REDIS_GET = promisify(client.get).bind(client)
const REDIS_SET = promisify(client.set).bind(client)
const REDIS_SETEX = promisify(client.setEx).bind(client)
const REDIS_DEL = promisify(client.del).bind(client)
const REDIS_LRANGE = promisify(client.lRange).bind(client)
const REDIS_KEYS = promisify(client.keys).bind(client)

module.exports = {
	REDIS_GET,
	REDIS_SET,
	REDIS_SETEX,
	REDIS_KEYS,
	REDIS_DEL,
	REDIS_LRANGE,
}
