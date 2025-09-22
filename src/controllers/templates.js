// src/controllers/templates.js
'use strict';

const templates = require('../templates');

const ctrl = module.exports;

// Public read-only: fetch a specific template (no listing)
ctrl.get = async (req, res) => {
	const tpl = await templates.get(String(req.params.id || ''));
	if (!tpl) {
		return res.status(404).json({ error: 'not-found' });
	}
	res.json({ template: tpl });
};
