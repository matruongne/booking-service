const { DataTypes } = require('sequelize')
const { sequelize } = require('../configs/databases/init.mysql')
const { v4: uuidv4 } = require('uuid')
const ShowDate = require('./showdate.model')

const Showtime = sequelize.define(
	'Showtime',
	{
		showtime_id: {
			type: DataTypes.STRING(24),
			defaultValue: () => uuidv4().replace(/-/g, '').slice(0, 24),
			primaryKey: true,
		},
		show_date_id: {
			type: DataTypes.STRING(24),
			references: {
				model: ShowDate,
				key: 'show_date_id',
			},
			allowNull: false,
		},
		show_time: {
			type: DataTypes.TIME,
			allowNull: false,
		},
	},
	{
		tableName: 'showtimes',
		timestamps: false,
	}
)

module.exports = Showtime
