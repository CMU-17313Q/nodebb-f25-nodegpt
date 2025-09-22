'use strict';

const staffTemplates = require('../controllers/admin/templates'); // admin-only
const publicTemplates = require('../controllers/templates');// public read

const express = require('express');

const uploadsController = require('../controllers/uploads');
const helpers = require('./helpers');

module.exports = function (app, middleware, controllers) {
	const middlewares = [middleware.autoLocale, middleware.authenticateRequest];
	const router = express.Router();
	app.use('/api', router);

	// ===== Admin-only Template CRUD =====
	const staffMiddlewares = [
		...middlewares,
		middleware.ensureLoggedIn, // must be logged in
	];

	// LIST (also for composer)
	router.get('/staff/templates',
		staffMiddlewares,
		helpers.tryRoute(staffTemplates.list));

	router.get('/staff/templates/composer',
		staffMiddlewares,
		helpers.tryRoute(staffTemplates.listForComposer));

	// GET one
	router.get('/staff/templates/:id',
		staffMiddlewares,
		helpers.tryRoute(staffTemplates.get));

	// CREATE
	router.post('/staff/templates',
		[...staffMiddlewares, middleware.applyCSRF],
		helpers.tryRoute(staffTemplates.create));

	// UPDATE
	router.put('/staff/templates/:id',
		[...staffMiddlewares, middleware.applyCSRF],
		helpers.tryRoute(staffTemplates.update));

	// DELETE
	router.delete('/staff/templates/:id',
		[...staffMiddlewares, middleware.applyCSRF],
		helpers.tryRoute(staffTemplates.remove));

	// ===== Public read-only (regular users) =====
	// Fetch a specific template by id (no catalog listing for non-admins)
	router.get('/templates/:id',
		[...middlewares],
		helpers.tryRoute(publicTemplates.get));

	router.get('/config', [...middlewares, middleware.applyCSRF], helpers.tryRoute(controllers.api.getConfig));

	router.get('/self', [...middlewares], helpers.tryRoute(controllers.user.getCurrentUser));
	router.get('/user/uid/:uid', [...middlewares, middleware.canViewUsers], helpers.tryRoute(controllers.user.getUserByUID));
	router.get('/user/username/:username', [...middlewares, middleware.canViewUsers], helpers.tryRoute(controllers.user.getUserByUsername));
	router.get('/user/email/:email', [...middlewares, middleware.canViewUsers], helpers.tryRoute(controllers.user.getUserByEmail));

	router.get('/categories/:cid/moderators', [...middlewares], helpers.tryRoute(controllers.api.getModerators));
	router.get('/recent/posts/:term?', [...middlewares], helpers.tryRoute(controllers.posts.getRecentPosts));
	router.get('/unread/total', [...middlewares, middleware.ensureLoggedIn], helpers.tryRoute(controllers.unread.unreadTotal));
	router.get('/topic/teaser/:topic_id', [...middlewares], helpers.tryRoute(controllers.topics.teaser));
	router.get('/topic/pagination/:topic_id', [...middlewares], helpers.tryRoute(controllers.topics.pagination));

	const multipart = require('connect-multiparty');
	const multipartMiddleware = multipart();
	const postMiddlewares = [
		middleware.maintenanceMode,
		multipartMiddleware,
		middleware.validateFiles,
		middleware.uploads.ratelimit,
		middleware.applyCSRF,
	];

	router.post('/post/upload', postMiddlewares, helpers.tryRoute(uploadsController.uploadPost));
	router.post('/user/:userslug/uploadpicture', [
		...middlewares,
		...postMiddlewares,
		middleware.exposeUid,
		middleware.ensureLoggedIn,
		middleware.canViewUsers,
		middleware.checkAccountPermissions,
	], helpers.tryRoute(controllers.accounts.edit.uploadPicture));
};
