const { DataTypes } = require('sequelize')
const { sequelize } = require('../configs/databases/init.mysql')
const { v4: uuidv4 } = require('uuid')

const Booking = sequelize.define(
	'Booking',
	{
		booking_id: {
			type: DataTypes.STRING(24),
			defaultValue: () => uuidv4().replace(/-/g, '').slice(0, 24),
			primaryKey: true,
		},
		user_id: { type: DataTypes.STRING(24), allowNull: false },
		showtime_id: { type: DataTypes.STRING(24), allowNull: false },
		seats: { type: DataTypes.JSON, allowNull: false },
		total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
		payment_status: {
			type: DataTypes.ENUM('PENDING', 'COMPLETED', 'CANCELED'),
			defaultValue: 'PENDING',
		},
	},
	{
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
	}
)

module.exports = Booking
