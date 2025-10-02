'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');


function resolveFirstExisting(candidates, errLabel) {
	for (const p of candidates) {
		if (fs.existsSync(p)) return p;
	}
	throw new Error(`Cannot find ${errLabel}. Tried:\n- ${candidates.join('\n- ')}`);
}

function resolveTemplatesEntryFromController(controllerAbs) {
	const controllerDir = path.dirname(controllerAbs);
	const target = path.resolve(controllerDir, '../templates');
	try {
		return require.resolve(target); // resolves ../templates(.js|/index.js)
	} catch {
		const tried = [`${target}.js`, path.join(target, 'index.js')];
		throw new Error(
			`Cannot resolve controller's ../templates from:\n  ${controllerAbs}\nTried:\n- ${tried.join('\n- ')}`
		);
	}
}

function primeTemplatesStub(absPathToTemplatesEntry, stubExports) {
	const key = require.resolve(absPathToTemplatesEntry);
	delete require.cache[key]; // wipe any prior instance
	require.cache[key] = {
		id: key,
		filename: key,
		loaded: true,
		exports: stubExports,
	};
}

function clearFromCache(absPath) {
	const key = require.resolve(absPath);
	delete require.cache[key];
}

function mkRes() {
	const res = {};
	res.statusCode = 200;
	res._json = null;
	res._sent = false;
	res.status = (code) => { res.statusCode = code; return res; };
	res.json = (obj) => { res._json = obj; res._sent = true; return res; };
	return res;
}


const ROOT = process.cwd();

const CONTROLLER_ABS = resolveFirstExisting([
	path.join(ROOT, 'nodegpt-25', 'src', 'controllers', 'postTemplates.js'),
	path.join(ROOT, 'src', 'controllers', 'postTemplates.js'),
], 'controllers/postTemplates.js');

const TEMPLATES_ABS = resolveTemplatesEntryFromController(CONTROLLER_ABS);


describe('controllers/postTemplates (unit — controller only)', () => {
	let controller;
	let TemplatesStub;

	const staff = { isAdmin: true };

	async function setupFreshControllerWithStub(stubOverrides = {}) {
		TemplatesStub = {
			list:   async () => [{ id: 't1', title: 'A' }],
			read:   async (id) => ({ id, title: 'A' }),
			create: async (data) => ({ id: 't2', ...data }),
			update: async (id, data) => ({ id, ...data }),
			remove: async () => ({ ok: true }),
			...stubOverrides,
		};
		clearFromCache(CONTROLLER_ABS);
		primeTemplatesStub(TEMPLATES_ABS, TemplatesStub);
		controller = require(CONTROLLER_ABS);
	}

	afterEach(() => {
		try { clearFromCache(CONTROLLER_ABS); } catch {}
		try { clearFromCache(TEMPLATES_ABS); } catch {}
	});

	describe('happy paths (with staff user)', () => {
		it('list returns templates', async () => {
			await setupFreshControllerWithStub();
			const req = { params: {}, user: staff };
			const res = mkRes();
			await controller.list(req, res);
			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.ok(Array.isArray(res._json.templates));
			assert.strictEqual(res._json.templates[0].id, 't1');
		});

		it('read returns a template', async () => {
			await setupFreshControllerWithStub();
			const req = { params: { id: 't1' }, user: staff };
			const res = mkRes();
			await controller.read(req, res);
			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.id, 't1');
		});

		it('create returns created template', async () => {
			await setupFreshControllerWithStub();
			const req = { user: staff, body: { title: 'New' } };
			const res = mkRes();
			await controller.create(req, res);
			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.title, 'New');
		});

		it('update returns updated template', async () => {
			await setupFreshControllerWithStub();
			const req = { user: staff, params: { id: 't1' }, body: { title: 'Upd' } };
			const res = mkRes();
			await controller.update(req, res);
			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
			assert.strictEqual(res._json.template.id, 't1');
			assert.strictEqual(res._json.template.title, 'Upd');
		});

		it('remove returns success', async () => {
			await setupFreshControllerWithStub();
			const req = { user: staff, params: { id: 't1' } };
			const res = mkRes();
			await controller.remove(req, res);
			assert.strictEqual(res.statusCode, 200);
			assert.ok(res._json && res._json.success);
		});
	});

	describe('data-layer error propagation', () => {
		it('list bubbles model error', async () => {
			await setupFreshControllerWithStub({
				list: async () => { throw new Error('boom'); },
			});
			const req = { user: staff };
			const res = mkRes();
			await assert.rejects(() => controller.list(req, res), /boom/);
		});

		it('update bubbles model error', async () => {
			await setupFreshControllerWithStub({
				update: async () => { throw new Error('db down'); },
			});
			const req = { user: staff, params: { id: 't1' }, body: { title: 'any' } };
			const res = mkRes();
			await assert.rejects(() => controller.update(req, res), /db down/);
		});
	});
});
