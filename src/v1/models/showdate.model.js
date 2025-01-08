const { DataTypes } = require('sequelize')
const { sequelize } = require('../configs/databases/init.mysql')
const { v4: uuidv4 } = require('uuid')

const ShowDate = sequelize.define(
	'ShowDate',
	{
		show_date_id: {
			type: DataTypes.STRING(24),
			defaultValue: () => uuidv4().replace(/-/g, '').slice(0, 24),
			primaryKey: true,
		},
		movie_id: {
			type: DataTypes.STRING(24),
			allowNull: false,
		},
		show_date: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
	},
	{
		tableName: 'show_dates',
		timestamps: false,
	}
)

module.exports = ShowDate
