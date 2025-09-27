'use strict';

const templates = require('../../templates');

exports.list = async (req, res, next) => {
	try {
		const all = await templates.list();
		res.status(200).json(Array.isArray(all) ? all : []);
	} catch (err) { next(err); }
};

exports.listForComposer = async (req, res, next) => {
	try {
		const all = await templates.list();
		const out = (all || []).map(({ id, title, fields }) => ({ id, title, fields }));
		res.status(200).json(out);
	} catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
	try {
		const t = await templates.get(String(req.params.id));
		if (!t) return res.status(404).json({ error: 'not-found' });
		res.status(200).json(t);
	} catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
	try {
		const { title, fields } = req.body || {};
		const created = await templates.create({ title, fields });
		// Keep 200 to satisfy schema/tests
		res.status(200).json(created);
	} catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
	try {
		const { title, fields } = req.body || {};
		const updated = await templates.update(String(req.params.id), { title, fields });
		res.status(200).json(updated);
	} catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
	try {
		const id = String(req.params.id);
		await templates.remove(id);
		res.status(200).json({ status: { code: 'ok' }, id });
	} catch (err) { next(err); }
};
