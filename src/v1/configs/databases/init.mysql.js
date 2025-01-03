const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(
	process.env.MYSQL_DATABASE,
	process.env.MYSQL_USERNAME,
	process.env.MYSQL_PASSWORD,
	{
		host: process.env.MYSQL_HOST,
		port: process.env.MYSQL_PORT,
		dialect: 'mysql',
		logging: false,
	}
)

sequelize
	.authenticate()
	.then(() => console.log('Connect to database sequelize(sql) successfully.'))
	.catch(error => console.error('Unable to connect to the database:', error))

// Sync Database
sequelize
	.sync({ force: false, alter: false })
	.then(() => console.log('Database synced'))
	.catch(err => console.log('Error syncing database:', err))

module.exports = { sequelize }
