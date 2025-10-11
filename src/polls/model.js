'use strict';

const db = require('../database');
const { v4: uuid } = require('uuid');

const PollModel = {
	/**
	 * Create a poll and index it by postId.
	 * @param {Object} p
	 * @param {string|number} p.postId
	 * @param {string} p.question
	 * @param {string[]} p.options - at least 2
	 * @param {string|number} p.createdBy
	 * @param {number|null} [p.closesAt]
	 */
	async createPoll({ postId, question, options, createdBy, closesAt = null }) {
		if (!postId || !question || !Array.isArray(options) || options.length < 2) {
			throw new Error('Invalid poll: need postId, question, and at least 2 options');
		}

		const pollId = uuid();

		const pollKey = `poll:${pollId}`;
		const data = {
			pollId,
			postId: String(postId),
			question: String(question),
			options: JSON.stringify(options),
			createdBy: String(createdBy ?? ''),
			createdAt: String(Date.now()),
			closesAt: closesAt ? String(closesAt) : '',
		};

		// Store main poll object
		await db.setObject(pollKey, data);

		// Index polls by post (future-proof if you ever allow >1 poll/post)
		await db.setAdd(`poll:byPost:${postId}`, pollId);

		// Initialize counts for each option to 0
		const counts = {};
		options.forEach((_, idx) => { counts[idx] = 0; });
		await db.setObject(`poll:counts:${pollId}`, counts);

		return { ...data, options };
	},

	async getPollById(pollId) {
		const obj = await db.getObject(`poll:${pollId}`);
		if (!obj || !obj.pollId) return null;
		return { ...obj, options: JSON.parse(obj.options || '[]') };
	},

	async getPollIdsByPostId(postId) {
		return db.getSetMembers(`poll:byPost:${postId}`);
	},

	// Common case: one poll per post — return the first if it exists
	async getPollByPostId(postId) {
		const ids = await db.getSetMembers(`poll:byPost:${postId}`);
		if (!ids || !ids.length) return null;
		return this.getPollById(ids[0]);
	},
};

module.exports = PollModel;
