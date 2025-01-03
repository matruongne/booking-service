const checkIsAdminUser = (req, res, next) => {
	try {
		if (req.user?.role !== 'admin') {
			return res.status(403).json({
				message: 'Permission denied: Only admins can perform this action',
			})
		}
		next()
	} catch (err) {
		console.error('Error checking admin privileges:', err)
		res.status(500).json({
			message: 'An error occurred while checking permissions',
		})
	}
}

module.exports = checkIsAdminUser
