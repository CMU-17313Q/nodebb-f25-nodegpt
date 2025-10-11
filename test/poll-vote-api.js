'use strict';

// Prime NodeBB require paths + use the mock DB (so this test doesn't hit real Redis)
require('../require-main');
require('./mocks/databasemock');

const assert = require('assert');
const Polls = require('../src/polls/model');
const Votes = require('../src/polls/votes');

describe('Poll Vote API (Issue 4)', function () {
	let pollId;
	const testUid = 'user123';
	const testPid = 'post456';

	before(async function () {
		// Create a test poll attached to a post
		const poll = await Polls.createPoll({
			postId: testPid,
			question: 'Test Poll Question',
			options: ['Option A', 'Option B', 'Option C'],
			createdBy: 'admin',
		});
		pollId = poll.pollId;
	});

	it('should allow a user to vote on a poll', async function () {
		// Test the core voting logic
		const result = await Votes.recordVote({ pollId, userId: testUid, optionIndex: 0 });
		assert.strictEqual(result, true);

		// Verify the vote was recorded
		const hasVoted = await Votes.hasUserVoted(pollId, testUid);
		assert.strictEqual(hasVoted, true);

		// Check the user's choice
		const choice = await Votes.getUserChoice(pollId, testUid);
		assert.strictEqual(choice, 0);

		// Check vote counts
		const counts = await Votes.getCounts(pollId);
		assert.strictEqual(counts[0], 1);
		assert.strictEqual(counts[1] || 0, 0);
		assert.strictEqual(counts[2] || 0, 0);
	});

	it('should prevent double voting by the same user', async function () {
		let err;
		try {
			await Votes.recordVote({ pollId, userId: testUid, optionIndex: 1 });
		} catch (e) { err = e; }
		assert.ok(err, 'Expected an error for double voting');
		assert.strictEqual(err.code, 'ALREADY_VOTED');
	});

	it('should handle multiple users voting on different options', async function () {
		const anotherUser = 'user456';
		const thirdUser = 'user789';

		// Second user votes for option 1
		const result1 = await Votes.recordVote({ pollId, userId: anotherUser, optionIndex: 1 });
		assert.strictEqual(result1, true);

		// Third user votes for option 2
		const result2 = await Votes.recordVote({ pollId, userId: thirdUser, optionIndex: 2 });
		assert.strictEqual(result2, true);

		// Check final vote counts
		const counts = await Votes.getCounts(pollId);
		assert.strictEqual(counts[0], 1); // First user's vote
		assert.strictEqual(counts[1], 1); // Second user's vote
		assert.strictEqual(counts[2], 1); // Third user's vote
	});

	it('should validate vote parameters', async function () {
		// Test missing pollId
		let err;
		try {
			await Votes.recordVote({ userId: 'test', optionIndex: 0 });
		} catch (e) { err = e; }
		assert.ok(err, 'Expected an error for missing pollId');
		assert.strictEqual(err.code, 'BAD_INPUT');

		// Test missing userId
		err = null;
		try {
			await Votes.recordVote({ pollId, optionIndex: 0 });
		} catch (e) { err = e; }
		assert.ok(err, 'Expected an error for missing userId');
		assert.strictEqual(err.code, 'BAD_INPUT');

		// Test invalid optionIndex
		err = null;
		try {
			await Votes.recordVote({ pollId, userId: 'newuser', optionIndex: 'invalid' });
		} catch (e) { err = e; }
		assert.ok(err, 'Expected an error for invalid optionIndex');
		assert.strictEqual(err.code, 'BAD_INPUT');
	});
});