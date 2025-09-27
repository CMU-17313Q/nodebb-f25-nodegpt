'use strict';

const templates = require('../../templates');

exports.get = async (req, res, next) => {
	try {
		const t = await templates.get(String(req.params.id));
		if (!t) return res.status(404).json({ error: 'not-found' });
		res.status(200).json({ id: t.id, title: t.title, fields: t.fields });
	} catch (err) { next(err); }
};
