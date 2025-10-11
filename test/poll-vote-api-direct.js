'use strict';

// Prime NodeBB require paths + use the mock DB (so this test doesn't hit real Redis)
require('../require-main');
require('./mocks/databasemock');

const assert = require('assert');
const Polls = require('../src/polls/model');
const apiPosts = require('../src/api/posts');

describe('Poll Vote API Function (Issue 4)', function () {
	let pollId;
	let testPid;
	const testUid = 123;

	before(async function () {
		// Create a test poll
		const poll = await Polls.createPoll({
			postId: 'post-456',
			question: 'API Test Poll Question',
			options: ['Option A', 'Option B', 'Option C'],
			createdBy: 'admin',
		});
		pollId = poll.pollId;
		testPid = 'post-456';
	});

	it('should allow a user to vote via the API function', async function () {
		const caller = {
			uid: testUid,
			ip: '127.0.0.1',
		};
		
		const data = {
			pid: testPid,
			optionIndex: 1,
		};
		
		const result = await apiPosts.submitPollVote(caller, data);
		
		// Check the response
		assert.ok(result);
		assert.strictEqual(result.optionIndex, 1);
		assert.strictEqual(result.voted, true);
		assert.ok(result.pollId);
		assert.strictEqual(result.counts['1'], 1);
	});

	it('should prevent double voting via the API function', async function () {
		const caller = {
			uid: testUid,
			ip: '127.0.0.1',
		};
		
		const data = {
			pid: testPid,
			optionIndex: 2, // Try to vote for a different option
		};
		
		let err;
		try {
			await apiPosts.submitPollVote(caller, data);
		} catch (e) {
			err = e;
		}
		
		assert.ok(err, 'Expected error for double voting');
		assert.ok(err.message.includes('already-voted'), `Expected "already-voted" error, got: ${err.message}`);
	});
	
	it('should reject unauthenticated users', async function () {
		const caller = {
			uid: 0, // Unauthenticated user
			ip: '127.0.0.1',
		};
		
		const data = {
			pid: testPid,
			optionIndex: 0,
		};
		
		let err;
		try {
			await apiPosts.submitPollVote(caller, data);
		} catch (e) {
			err = e;
		}
		
		assert.ok(err, 'Expected error for unauthenticated user');
		assert.ok(err.message.includes('not-logged-in'), `Expected "not-logged-in" error, got: ${err.message}`);
	});
});