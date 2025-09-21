'use strict';

const db = require.main.require('./src/database');

const Votes = {
	/**
	 * Check if a user already voted in a poll
	 */
	async hasUserVoted(pollId, userId) {
		return db.isSetMember(`poll:voters:${pollId}`, String(userId));
	},

	/**
	 * Record a vote and increment counts.
	 * Throws { code: 'ALREADY_VOTED' } if same user votes again.
	 */
	async recordVote({ pollId, userId, optionIndex }) {
		if (!pollId || !userId || typeof optionIndex !== 'number' || Number.isNaN(optionIndex)) {
			const e = new Error('Missing pollId/userId or bad optionIndex');
			e.code = 'BAD_INPUT';
			throw e;
		}

		// Uniqueness: check first, then add
		const already = await db.isSetMember(`poll:voters:${pollId}`, String(userId));
		if (already) {
			const err = new Error('User has already voted on this poll');
			err.code = 'ALREADY_VOTED';
			throw err;
		}
		await db.setAdd(`poll:voters:${pollId}`, String(userId));

		// Optional: store the user’s choice
		await db.setObject(`poll:vote:${pollId}:${userId}`, {
			optionIndex: String(optionIndex),
			createdAt: String(Date.now()),
		});

		// Increment aggregate count for the chosen option
		await db.incrObjectField(`poll:counts:${pollId}`, String(optionIndex), 1);
		return true;
	},

	/**
	 * Get aggregate counts for all options in a poll
	 */
	async getCounts(pollId) {
		const counts = await db.getObject(`poll:counts:${pollId}`) || {};
		const out = {};
		for (const k of Object.keys(counts)) {
			out[k] = Number(counts[k]);
		}
		return out;
	},

	/**
	 * Get the option a specific user voted for
	 */
	async getUserChoice(pollId, userId) {
		const obj = await db.getObject(`poll:vote:${pollId}:${userId}`);
		if (!obj || typeof obj.optionIndex === 'undefined') {
			return null;
		}
		return Number(obj.optionIndex);
	},
};

module.exports = Votes;
