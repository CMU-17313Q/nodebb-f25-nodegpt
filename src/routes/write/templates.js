'use strict';

module.exports = function (params) {
	const { router, middleware, helpers } = params;

	// Base middlewares used across write API routes
	const base = [middleware.pluginHooks, middleware.authenticate];

	// Admin-only (your "staff") — must be logged in and an admin
	const adminOnly = [...base, middleware.ensureLoggedIn, middleware.admin.check];

	// Controllers
	const staffTemplates = require('../../controllers/write/staff-templates');
	const publicTemplates = require('../../controllers/write/public-templates');

	// ===== Admin-only CRUD =====
	router.get('/staff/templates', adminOnly, helpers.tryRoute(staffTemplates.list));
	router.get('/staff/templates/composer', adminOnly, helpers.tryRoute(staffTemplates.listForComposer));
	router.get('/staff/templates/:id', adminOnly, helpers.tryRoute(staffTemplates.get));

	router.post('/staff/templates', [...adminOnly, middleware.applyCSRF], helpers.tryRoute(staffTemplates.create));
	router.put('/staff/templates/:id', [...adminOnly, middleware.applyCSRF], helpers.tryRoute(staffTemplates.update));
	router.delete('/staff/templates/:id', [...adminOnly, middleware.applyCSRF], helpers.tryRoute(staffTemplates.remove));

	// ===== Public read-only (regular users) =====
	router.get('/templates/:id', base, helpers.tryRoute(publicTemplates.get));
};
