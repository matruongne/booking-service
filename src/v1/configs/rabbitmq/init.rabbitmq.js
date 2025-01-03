const amqp = require('amqplib')

let connection
let channel

async function rabbitmqConnection(RABBITMQ_URL) {
	if (!connection) {
		try {
			connection = await amqp.connect(RABBITMQ_URL)
			channel = await connection.createChannel()

			console.log('RabbitMQ connection established.')
		} catch (error) {
			console.error('Error establishing RabbitMQ connection:', error)
			throw new Error('Failed to connect to RabbitMQ')
		}
	}
	return channel
}

module.exports = {
	rabbitmqConnection,
}
