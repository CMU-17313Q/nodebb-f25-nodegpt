'use strict';

const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();
const assert = require('assert');

describe('routes/templates', () => {
	let app;
	let reached = {};

	// Stubs
	const controllersStub = {
		list: (req, res) => { reached.list = true; res.json({ success: true, where: 'list'}); },
		read: (req, res) => { reached.read = true; res.json({ success: true, where: 'read', id: req.params.id }); },
		create: (req, res) => { reached.create = true; res.json({ success: true, where: 'create', body: req.body }); },
		update: (req, res) => { reached.update = true; res.json({ success: true, where: 'update', id: req.params.id, body: req.body }); },
		remove: (req, res) => { reached.remove = true; res.json({ success: true, where: 'remove', id: req.params.id }); },
	};

	// staffOnly stub we'll swap per test
	const allowStaffOnly = (req, res, next) => next();
	const denyStaffOnly = (req, res, next) => res.status(403).json({ success: false, status: 403, message: 'Forbidden: staff only' });

	// ../templates stub for /test-template
	const coreTemplatesStub = {
		create: async (payload) => ({ id: 'stubbed', ...payload }),
	};

	function makeApp(staffOnlyImpl) {
		reached = {};
		const router = proxyquire('../../routes/templates', {
			'../controllers/postTemplates': controllersStub,
			'../middleware/staffOnly': staffOnlyImpl,
			'../templates': coreTemplatesStub,
			'../template_fields/assignment_fields': [{ name: 'course', type: 'text' }],
		});

		const a = express();
		a.use(express.json());

		// attach a trivial auth injector if you rely on req.user in staffOnly (our stub ignores it)
		a.use((req, _res, next) => { req.user = req.headers['x-user'] ? JSON.parse(req.headers['x-user']) : null; next(); });

		a.use('/templates', router);
		return a;
	}

	it('GET /templates (public list) returns success', async () => {
		app = makeApp(allowStaffOnly); // staffOnly irrelevant for GETs
		const res = await request(app).get('/templates');
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.success, true);
		assert.strictEqual(reached.list, true);
	});

	it('GET /templates/:id (public read) returns success', async () => {
		app = makeApp(allowStaffOnly);
		const res = await request(app).get('/templates/abc123');
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.success, true);
		assert.strictEqual(res.body.id, 'abc123');
		assert.strictEqual(reached.read, true);
	});

	it('POST /templates denied for non-staff (403)', async () => {
		app = makeApp(denyStaffOnly);
		const res = await request(app).post('/templates').send({ title: 'X' });
		assert.strictEqual(res.status, 403);
		assert.strictEqual(res.body.success, false);
		assert.strictEqual(reached.create, undefined); // handler never reached
	});

	it('POST /templates allowed for staff (200)', async () => {
		app = makeApp(allowStaffOnly);
		const res = await request(app).post('/templates').send({ title: 'X' });
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.success, true);
		assert.strictEqual(res.body.where, 'create');
		assert.strictEqual(reached.create, true);
	});

	it('PUT /templates/:id allowed for staff', async () => {
		app = makeApp(allowStaffOnly);
		const res = await request(app).put('/templates/t1').send({ title: 'Y' });
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.where, 'update');
		assert.strictEqual(res.body.id, 't1');
		assert.strictEqual(reached.update, true);
	});

	it('DELETE /templates/:id allowed for staff', async () => {
		app = makeApp(allowStaffOnly);
		const res = await request(app).delete('/templates/t1');
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.where, 'remove');
		assert.strictEqual(res.body.id, 't1');
		assert.strictEqual(reached.remove, true);
	});

	it('GET /templates/test-template creates a test template via core stub', async () => {
		app = makeApp(allowStaffOnly);
		const res = await request(app).get('/templates/test-template');
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.success, true);
		assert.strictEqual(res.body.template.id, 'stubbed');
		assert.strictEqual(res.body.template.title, 'Assignment Template'); // from your route
	});
});
