// src/controllers/admin/templates.js
'use strict';

const templates = require('../../templates');
const privileges = require('../../privileges');

// Admin-only guard
async function assertAdmin(uid) {
	if (!uid) {
		const err = new Error('[[error:no-privileges]]');
		err.status = 403;
		throw err;
	}
	const isAdmin = await privileges.users.isAdministrator(uid);
	if (!isAdmin) {
		const err = new Error('[[error:no-privileges]]');
		err.status = 403;
		throw err;
	}
}

const ctrl = module.exports;

ctrl.list = async (req, res) => {
	await assertAdmin(req.uid);
	const list = await templates.list();
	res.json({ templates: list });
};

ctrl.get = async (req, res) => {
	await assertAdmin(req.uid);
	const tpl = await templates.get(String(req.params.id || ''));
	if (!tpl) {
		return res.status(404).json({ error: 'not-found' });
	}
	res.json({ template: tpl });
};

ctrl.create = async (req, res) => {
	await assertAdmin(req.uid);
	const { title, fields } = req.body || {};
	const tpl = await templates.create({ title, fields });
	res.json({ template: tpl });
};

ctrl.update = async (req, res) => {
	await assertAdmin(req.uid);
	const { title, fields } = req.body || {};
	const updated = await templates.update(String(req.params.id), { title, fields });
	res.json({ template: updated });
};

ctrl.remove = async (req, res) => {
	await assertAdmin(req.uid);
	await templates.remove(String(req.params.id));
	res.json({ ok: true });
};

// For composer loading — admin-only as well
ctrl.listForComposer = async (req, res) => {
	await assertAdmin(req.uid);
	const list = await templates.list();
	res.json({ templates: list });
};
