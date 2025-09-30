'use strict';

const Templates = require('../src/templates');

function assertStaff(user) {
	if (!(user?.isAdmin ||
        user?.isGlobalMod ||
        user?.groups?.includes?.('staff') ||
        user?.privileges?.templates?.manage)) {
		const err = new Error('Forbidden: staff only');
		err.status = 403;
		throw err;
	}
}

exports.list = async (req, res) => {
	const templates = await Templates.list();
	res.json({ success: true, templates });
};

exports.read = async (req, res) => {
	const tpl = await Templates.read(req.params.id);
	res.json({ success: true, template: tpl });
};

exports.create = async (req, res) => {
	assertStaff(req.user); 
	const created = await Templates.create(req.body);
	res.json({ success: true, template: created });
};

exports.update = async (req, res) => {
	assertStaff(req.user);
	const updated = await Templates.update(req.params.id, req.body);
	res.json({ success: true, template: updated });
};

exports.remove = async (req, res) => {
	assertStaff(req.user); 
	await Templates.remove(req.params.id);
	res.json({ success: true });
};
