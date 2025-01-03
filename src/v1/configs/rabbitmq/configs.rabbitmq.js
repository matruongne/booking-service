async function connectRabbitMQ({
	channel,
	EXCHANGE_NAME,
	EXCHANGE_TYPE,
	EXCHANGE_OPTIONS = {},
	queues = [],
}) {
	if (channel) {
		try {
			// Define the exchange
			await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, EXCHANGE_OPTIONS)
			console.log(`Exchange "${EXCHANGE_NAME}" of type "${EXCHANGE_TYPE}" created.`)

			// Define queues and bind them to the exchange with respective binding keys
			for (const { QUEUE_NAME, QUEUE_BINDING_KEY } of queues) {
				await channel.assertQueue(QUEUE_NAME, { durable: true })
				await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, QUEUE_BINDING_KEY)
				console.log(
					`Queue "${QUEUE_NAME}" bound to exchange "${EXCHANGE_NAME}" with binding key "${QUEUE_BINDING_KEY}".`
				)
			}
		} catch (error) {
			console.error('Error connecting to RabbitMQ:', error)
			throw new Error('Failed to initialize RabbitMQ channel')
		}
	}
	return channel
}

module.exports = {
	connectRabbitMQ,
}
