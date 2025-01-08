const Booking = require('./booking.model')
const Screen = require('./screen.model')
const ScreenSeat = require('./screenSeat.model')
const ShowDate = require('./showdate.model')
const Showtime = require('./showtime.model')

Screen.hasMany(ScreenSeat, { foreignKey: 'screen_id', onDelete: 'CASCADE' })
ScreenSeat.belongsTo(Screen, { foreignKey: 'screen_id' })

Showtime.hasMany(Booking, { foreignKey: 'showtime_id', onDelete: 'CASCADE' })
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id', onDelete: 'CASCADE' })

ShowDate.hasMany(Showtime, { foreignKey: 'show_date_id', onDelete: 'CASCADE' })
Showtime.belongsTo(ShowDate, { foreignKey: 'show_date_id', onDelete: 'CASCADE' })

module.exports = {
	ScreenSeat,
	Screen,
	Booking,
}
