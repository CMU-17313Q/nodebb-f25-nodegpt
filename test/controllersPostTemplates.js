'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

/**
 * Repo-specific paths
 * Adjust ROOT if your working directory differs when running "npm test".
 */
const ROOT = process.cwd(); // usually the repo root
const CONTROLLER_CANDIDATES = [
	path.join(ROOT, 'nodebb-f25-nodegpt', 'src', 'controllers', 'postTemplates.js'),
	path.join(ROOT, 'src', 'controllers', 'postTemplates.js'),
];

const TEMPLATES_CANDIDATES = [
	path.join(ROOT, 'nodebb-f25-nodegpt', 'src', 'templates.js'),
	path.join(ROOT, 'nodebb-f25-nodegpt', 'src', 'templates', 'index.js'),
	path.join(ROOT, 'src', 'templates.js'),
	path.join(ROOT, 'src', 'templates', 'index.js'),
];

function resolveFirstExisting(candidates, errLabel) {
	for (const p of candidates) {
		if (fs.existsSync(p)) return p;
	}
	throw new Error(`Cannot find ${errLabel}. Tried:\n- ` + candidates.join('\n- '));
}

// prime require.cache for the templates module so the controller will import our stub
function primeTemplatesStub(templatesAbsPath, stubExports) {
	const resolved = require.resolve(templatesAbsPath);
	require.cache[resolved] = {
		id: resolved,
		filename: resolved,
		loaded: true,
		exports: stubExports,
	};
}

function mkRes() {
	const res = {};
	res.statusCode = 200;
	res._json = null;
	res.status = (code) => { res.statusCode = code; return res; };
	res.json = (obj) => { res._json = obj; return res; };
	return res;
}

describe('controllers/postTemplates (unit, no external modules)', () => {
	let controller;
	let TemplatesStub;

	beforeEach(() => {
		// Fresh stubs each test
		TemplatesStub = {
			list: async () => [{ id: 't1', title: 'A' }],
			read: async (id) => ({ id, title: 'A' }),
			create: async (data) => ({ id: 't2', ...data }),
			update: async (id, data) => ({ id, ...data }),
			remove: async (id) => ({ removed: id }),
		};

		// Resolve paths
		const templatesAbs = resolveFirstExisting(TEMPLATES_CANDIDATES, 'src/templates');
		const controllerAbs = resolveFirstExisting(CONTROLLER_CANDIDATES, 'controllers/postTemplates.js');

		// Clear previous controller from cache so each test sees a clean import
		const controllerKey = require.resolve(controllerAbs);
		delete require.cache[controllerKey];

		// Prime the templates module cache with our stub BEFORE requiring controller
		primeTemplatesStub(templatesAbs, TemplatesStub);

		// Now require the controller; it will get our stubbed templates module
		controller = require(controllerAbs);
	});

	describe('public endpoints', () => {
		it('list returns templates', async () => {
			const req = { params: {}, user: null };
			const res = mkRes();

			await controller.list(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.ok(Array.isArray(res._json.templates));
			assert.strictEqual(res._json.templates[0].id, 't1');
		});

		it('read returns a template by id', async () => {
			const req = { params: { id: 't1' }, user: null };
			const res = mkRes();

			await controller.read(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.id, 't1');
		});
	});

	describe('staff-only endpoints', () => {
		const nonStaff = { isAdmin: false, isGlobalMod: false, groups: [], privileges: {} };
		const admin = { isAdmin: true };
		const globalMod = { isGlobalMod: true };
		const staffGroup = { groups: ['staff'] };
		const templPriv = { privileges: { templates: { manage: true } } };

		it('create denies non-staff (403)', async () => {
			const req = { user: nonStaff, body: { title: 'X' } };
			const res = mkRes();

			await assert.rejects(() => controller.create(req, res), (err) => err && err.status === 403);
		});

		it('update denies non-staff (403)', async () => {
			const req = { user: nonStaff, params: { id: 't1' }, body: { title: 'Y' } };
			const res = mkRes();

			await assert.rejects(() => controller.update(req, res), (err) => err && err.status === 403);
		});

		it('remove denies non-staff (403)', async () => {
			const req = { user: nonStaff, params: { id: 't1' } };
			const res = mkRes();

			await assert.rejects(() => controller.remove(req, res), (err) => err && err.status === 403);
		});

		it('create works for admin', async () => {
			const req = { user: admin, body: { title: 'S' } };
			const res = mkRes();

			await controller.create(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.title, 'S');
		});

		it('update works for global mod', async () => {
			const req = { user: globalMod, params: { id: 't1' }, body: { title: 'A2' } };
			const res = mkRes();

			await controller.update(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.title, 'A2');
		});

		it('remove works for staff group member', async () => {
			const req = { user: staffGroup, params: { id: 't1' } };
			const res = mkRes();

			await controller.remove(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
		});

		it('create works for templates:manage privilege', async () => {
			const req = { user: templPriv, body: { title: 'P' } };
			const res = mkRes();

			await controller.create(req, res);

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.title, 'P');
		});
	});

	describe('errors from data layer', () => {
		it('list bubbles up model error', async () => {
			// swap in a throwing stub
			TemplatesStub.list = async () => { throw new Error('boom'); };

			const req = {};
			const res = mkRes();

			await assert.rejects(() => controller.list(req, res), /boom/);
		});

		it('update bubbles up model error (staff)', async () => {
			TemplatesStub.update = async () => { throw new Error('db down'); };

			const req = { user: { isAdmin: true }, params: { id: 't1' }, body: { title: 'Z' } };
			const res = mkRes();

			await assert.rejects(() => controller.update(req, res), /db down/);
		});
	});
});
