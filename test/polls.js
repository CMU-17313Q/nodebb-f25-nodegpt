'use strict';

// Prime NodeBB require paths + use the mock DB (so this test doesn't hit real Redis)
require('../require-main');
require('./mocks/databasemock');

const assert = require('assert');
const Polls = require('../src/polls/model');
const Votes = require('../src/polls/votes');

describe('Polls Data Model (Issue 1)', function () {
	let pollId;

	it('creates a poll with question + options', async function () {
		const poll = await Polls.createPoll({
			postId: 'post-123',
			question: 'Which chapter?',
			options: ['Ch3', 'Ch4', 'Ch5'],
			createdBy: 'ta-42',
		});
		pollId = poll.pollId;

		assert.ok(pollId);
		assert.strictEqual(poll.postId, 'post-123');
		assert.strictEqual(poll.question, 'Which chapter?');
		assert.deepStrictEqual(poll.options, ['Ch3', 'Ch4', 'Ch5']);
	});

	it('rejects polls with fewer than 2 options', async function () {
		let err;
		try {
			await Polls.createPoll({
				postId: 'post-999',
				question: 'Bad poll',
				options: ['Only one'],
				createdBy: 'ta-42',
			});
		} catch (e) { err = e; }
		assert.ok(err, 'Expected an error for invalid poll');
	});

	it('allows a user to vote once', async function () {
		const ok = await Votes.recordVote({ pollId, userId: 'u1', optionIndex: 1 });
		assert.strictEqual(ok, true);
	});

	it('prevents double voting by same user and tracks counts', async function () {
		let err;
		try {
			await Votes.recordVote({ pollId, userId: 'u1', optionIndex: 2 });
		} catch (e) { err = e; }
		assert.ok(err, 'Expected error when voting twice');
		assert.strictEqual(err.code, 'ALREADY_VOTED');

		await Votes.recordVote({ pollId, userId: 'u2', optionIndex: 2 });
		const counts = await Votes.getCounts(pollId);
		// After u1 voted option 1 and u2 voted option 2:
		assert.deepStrictEqual(counts, { '0': 0, '1': 1, '2': 1 });
	});
});
