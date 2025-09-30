'use strict';

const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');
const fs = require('fs');

/**
 * You can explicitly point to your controller with:
 *   POST_TEMPLATES_CONTROLLER=controllers/postTemplates.js npm test
 *
 * You can also override the key used to stub the data layer require() inside the controller:
 *   TEMPLATES_STUB_KEY=../models/templates npm test
 * Default stub key assumes controller has: require('../src/templates')
 */
const OVERRIDE_CONTROLLER = process.env.POST_TEMPLATES_CONTROLLER || '';
const STUB_REQUIRE_KEY_USED_IN_CONTROLLER =
  process.env.TEMPLATES_STUB_KEY || '../src/templates';

function resolveFromCandidates() {
	// Add/modify candidates to match your repo if needed.
	const candidates = [
		// Common root-level locations
		path.join(process.cwd(), 'controllers', 'postTemplates.js'),
		path.join(process.cwd(), 'controllers', 'postTemplates/index.js'),

		// src-based
		path.join(process.cwd(), 'src', 'controllers', 'postTemplates.js'),
		path.join(process.cwd(), 'src', 'controllers', 'postTemplates', 'index.js'),

		// api-based
		path.join(process.cwd(), 'api', 'controllers', 'postTemplates.js'),
		path.join(process.cwd(), 'api', 'controllers', 'postTemplates', 'index.js'),

		// variations on name
		path.join(process.cwd(), 'controllers', 'templateManager.js'),
		path.join(process.cwd(), 'src', 'controllers', 'templateManager.js'),

		// Fallbacks relative to this test file (if tests not run from repo root)
		path.join(__dirname, '..', 'controllers', 'postTemplates.js'),
		path.join(__dirname, '..', '..', 'controllers', 'postTemplates.js'),
		path.join(__dirname, '..', '..', '..', 'controllers', 'postTemplates.js'),
	];

	for (const p of candidates) {
		if (fs.existsSync(p)) return p;
	}

	const tried = candidates
		.map(p => p.replace(process.cwd(), ''))
		.map(p => (p.startsWith(path.sep) ? p : path.sep + p))
		.join('\n');

	throw new Error(
		`Cannot find controllers/postTemplates.js.\n` +
    `Tried:${tried}\n\n` +
    `Fix it by either:\n` +
    `  1) Setting POST_TEMPLATES_CONTROLLER to your actual path (relative to repo root), e.g.:\n` +
    `     POST_TEMPLATES_CONTROLLER=controllers/postTemplates.js npm test\n` +
    `  2) Renaming/moving your controller to one of the common paths above, or\n` +
    `  3) Editing the candidates list in this test to match your repo.\n`
	);
}

function resolveControllerPath() {
	if (OVERRIDE_CONTROLLER) {
		const abs = path.isAbsolute(OVERRIDE_CONTROLLER) ?
			OVERRIDE_CONTROLLER :
			path.join(process.cwd(), OVERRIDE_CONTROLLER);
		if (!fs.existsSync(abs)) {
			throw new Error(
				`POST_TEMPLATES_CONTROLLER points to a non-existent file:\n  ${abs}`
			);
		}
		return abs;
	}
	return resolveFromCandidates();
}

// --- Test Suite ---

describe('controllers/postTemplates (unit tests)', () => {
	let TemplatesStub;
	let controller;

	// Minimal res mock
	function mkRes() {
		const res = {};
		res.statusCode = 200;
		res._json = null;
		res.status = (code) => { res.statusCode = code; return res; };
		res.json = (obj) => { res._json = obj; return res; };
		return res;
	}

	beforeEach(() => {
		TemplatesStub = {
			list: sinon.stub().resolves([{ id: 't1', title: 'A' }]),
			read: sinon.stub().resolves({ id: 't1', title: 'A' }),
			create: sinon.stub().resolves({ id: 't2', title: 'B' }),
			update: sinon.stub().resolves({ id: 't1', title: 'A2' }),
			remove: sinon.stub().resolves(),
		};

		const controllerPath = resolveControllerPath();

		controller = proxyquire(controllerPath, {
			[STUB_REQUIRE_KEY_USED_IN_CONTROLLER]: TemplatesStub,
		});
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('public endpoints', () => {
		it('list returns templates', async () => {
			const req = { params: {}, user: null };
			const res = mkRes();

			await controller.list(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json.success);
			assert.ok(Array.isArray(res._json.templates));
			sinon.assert.calledOnce(TemplatesStub.list);
		});

		it('read returns a template by id', async () => {
			const req = { params: { id: 't1' }, user: null };
			const res = mkRes();

			await controller.read(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json.success);
			assert.strictEqual(res._json.template.id, 't1');
			sinon.assert.calledWithExactly(TemplatesStub.read, 't1');
		});
	});

	describe('staff-only endpoints', () => {
		const nonStaff = { isAdmin: false, isGlobalMod: false, groups: [], privileges: {} };
		const admin = { isAdmin: true };
		const globalMod = { isGlobalMod: true };
		const staffGroup = { groups: ['staff'] };
		const templPriv = { privileges: { templates: { manage: true } } };

		it('create denies non-staff', async () => {
			const req = { user: nonStaff, body: { title: 'X' } };
			const res = mkRes();

			await assert.rejects(
				() => controller.create(req, res),
				(err) => err && err.status === 403
			);
			sinon.assert.notCalled(TemplatesStub.create);
		});

		it('update denies non-staff', async () => {
			const req = { user: nonStaff, params: { id: 't1' }, body: { title: 'Y' } };
			const res = mkRes();

			await assert.rejects(
				() => controller.update(req, res),
				(err) => err && err.status === 403
			);
			sinon.assert.notCalled(TemplatesStub.update);
		});

		it('remove denies non-staff', async () => {
			const req = { user: nonStaff, params: { id: 't1' } };
			const res = mkRes();

			await assert.rejects(
				() => controller.remove(req, res),
				(err) => err && err.status === 403
			);
			sinon.assert.notCalled(TemplatesStub.remove);
		});

		it('create works for admin', async () => {
			const req = { user: admin, body: { title: 'S' } };
			const res = mkRes();

			await controller.create(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json.success);
			sinon.assert.calledWithExactly(TemplatesStub.create, { title: 'S' });
		});

		it('update works for global mod', async () => {
			const req = { user: globalMod, params: { id: 't1' }, body: { title: 'A2' } };
			const res = mkRes();

			await controller.update(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json.success);
			sinon.assert.calledWithExactly(TemplatesStub.update, 't1', { title: 'A2' });
		});

		it('remove works for staff group member', async () => {
			const req = { user: staffGroup, params: { id: 't1' } };
			const res = mkRes();

			await controller.remove(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json.success);
			sinon.assert.calledWithExactly(TemplatesStub.remove, 't1');
		});

		it('create works for templates:manage privilege', async () => {
			const req = { user: templPriv, body: { title: 'P' } };
			const res = mkRes();

			await controller.create(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json.success);
			sinon.assert.calledWithExactly(TemplatesStub.create, { title: 'P' });
		});
	});

	describe('errors from data layer', () => {
		it('list bubbles up model error', async () => {
			const req = {};
			const res = mkRes();
			TemplatesStub.list.rejects(new Error('boom'));

			await assert.rejects(() => controller.list(req, res), /boom/);
		});

		it('update bubbles up model error (staff)', async () => {
			const req = { user: { isAdmin: true }, params: { id: 't1' }, body: { title: 'Z' } };
			const res = mkRes();
			TemplatesStub.update.rejects(new Error('db down'));

			await assert.rejects(() => controller.update(req, res), /db down/);
		});
	});
});
