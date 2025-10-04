'use strict';

const express = require('express');
const uploadsController = require('../controllers/uploads');
const helpers = require('./helpers');
const Polls = require('../polls/model');
const Votes = require('../polls/votes');
module.exports = function (app, middleware, controllers) {
	const middlewares = [middleware.autoLocale, middleware.authenticateRequest];
	const router = express.Router();
	app.use('/api', router);
	
	// GET /api/posts/:pid/poll
	async function getPollForPost(req, res, next) {
		try {
			const pid = parseInt(req.params.pid, 10);
			if (!Number.isInteger(pid)) {
				return res.status(400).json({ error: 'bad pid' });
			}
			const poll = await Polls.getPollByPostId(pid);
			if (!poll) {
				return res.json({ postId: pid, poll: {} });
			const uid = (req.user && req.user.uid) || 0;
			const hasVoted = uid ? await Votes.hasUserVoted(poll.pollId, uid) : false;
			const selectedOptionIndex = hasVoted ? await Votes.getUserChoice(poll.pollId, uid) : null;
			// Shape options for the client: [{ index, text }]
			const options = Array.isArray(poll.options) ?
				poll.options.map((text, index) => ({ index, text })) :
				[];
			// Show counts after the user has voted 
			let counts = null;
			let totalVotes = null;
			if (hasVoted) {
				// Votes.getCounts returns an object like { "0": 3, "1": 5 }
				const obj = await Votes.getCounts(poll.pollId);
				counts = options.map(o => Number(obj?.[o.index] || 0));
				totalVotes = counts.reduce((a, b) => a + b, 0);
			}
			return res.json({
				postId: pid,
				poll: {
					id: String(poll.pollId),
					question: poll.question || '',
					options,
					hasVoted,
					selectedOptionIndex, // single-choice model
					counts, // null until user votes
					totalVotes, // null until user votes
					allowsMultiple: false,
					allowsViewResultsBeforeVote: false,
				},
			});
		} catch (err) {
			next(err);
		}
	}
	router.get('/config', [...middlewares, middleware.applyCSRF], helpers.tryRoute(controllers.api.getConfig));
	router.get('/self', [...middlewares], helpers.tryRoute(controllers.user.getCurrentUser));
	router.get('/posts/:pid/poll', [...middlewares], helpers.tryRoute(getPollForPost));
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
