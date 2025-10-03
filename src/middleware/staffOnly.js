
// file for middleware that restricts access to staff members only
'use strict';

module.exports = function staffOnly(req, res, next) {
	const user = req.user || {};
	// Treat "staff" as: admin OR in group 'staff' OR explicit privilege flag
	const isStaff = !!(user.isAdmin || user.isGlobalMod || user.groups?.includes?.('staff') || user.privileges?.templates?.manage);
	if (!isStaff) {
		return res.status(403).json({ success: false, status: 403, message: 'Forbidden: staff only' });
	}
	next();
};
