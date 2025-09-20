// src/polls/votes.js
'use strict';

const db = require.main.require('./src/database');

const Votes = {
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

    // Uniqueness: add user to voters set; SADD returns 1 if new, 0 if already present
    const added = await db.setAdd(`poll:voters:${pollId}`, String(userId));
    if (!added) {
      const err = new Error('User has already voted on this poll');
      err.code = 'ALREADY_VOTED';
      throw err;
    }

    // (Optional) store user choice for “you voted X” UX later
    await db.setObject(`poll:vote:${pollId}:${userId}`, {
      optionIndex: String(optionIndex),
      createdAt: String(Date.now()),
    });

    // Increment aggregate count for the chosen option
    await db.incrObjectField(`poll:counts:${pollId}`, String(optionIndex), 1);
    return true;
  },

  async getCounts(pollId) {
    const counts = await db.getObject(`poll:counts:${pollId}`) || {};
    const out = {};
    for (const k of Object.keys(counts)) out[k] = Number(counts[k]);
    return out;
  },

  async getUserChoice(pollId, userId) {
    const obj = await db.getObject(`poll:vote:${pollId}:${userId}`);
    if (!obj || typeof obj.optionIndex === 'undefined') return null;
    return Number(obj.optionIndex);
  },
};

module.exports = Votes;
