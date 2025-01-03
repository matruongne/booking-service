const bindMethodsWithThisContext = require('../utils/classes/bindMethodsWithThisContext')
const BasicController = require('../utils/controllers/basicController')

class bookingController extends BasicController {
	constructor() {
		super()
		bindMethodsWithThisContext(this)
	}
}

module.exports = new bookingController()
