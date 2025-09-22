// src/templates.js
'use strict';

const db = require.main.require('./src/database');
const { v4: uuidv4 } = require('uuid');

const TEMPLATE_PREFIX = 'template:';
const TEMPLATE_LIST = 'templates:all';

const ALLOWED_TYPES = new Set([
	'text', 'textarea', 'number', 'date', 'datetime', 'select', 'url',
]);

const Template = module.exports = {};

function keyFor(id) {
	return `${TEMPLATE_PREFIX}${id}`;
}

function assertString(val, fieldName) {
	if (typeof val !== 'string' || !val.trim()) {
		throw new Error(`[[error:invalid-${fieldName}]]`);
	}
}

function assertBoolean(val, fieldName) {
	if (typeof val !== 'boolean') {
		throw new Error(`[[error:invalid-${fieldName}]]`);
	}
}

function validateFieldDef(field) {
	if (!field || typeof field !== 'object') {
		throw new Error('[[error:invalid-field-definition]]');
	}
	assertString(field.key, 'field-key');
	assertString(field.label, 'field-label');

	// Type
	if (typeof field.type !== 'string' || !ALLOWED_TYPES.has(field.type)) {
		throw new Error(`[[error:invalid-field-type, ${field.type}]]`);
	}

	// Required
	assertBoolean(Boolean(field.required), 'field-required');
}

function validateFields(fields) {
	if (!Array.isArray(fields) || fields.length === 0) {
		throw new Error('[[error:invalid-fields-array]]');
	}
	const keys = new Set();
	fields.forEach((f) => {
		validateFieldDef(f);
		if (keys.has(f.key)) {
			throw new Error(`[[error:duplicate-field-key, ${f.key}]]`);
		}
		keys.add(f.key);
	});
}

function sanitizeTemplateInput({ title, fields }) {
	assertString(title, 'title');
	validateFields(fields);
	return {
		title: title.trim(),
		fields: fields.map(f => ({
			key: f.key.trim(),
			label: f.label.trim(),
			type: f.type,
			required: !!f.required,
			// Optional extras are ignored here; extend as needed (e.g., options for select)
		})),
	};
}

/**
 * Create a new template and store it in the database
 * @param {{ title: string, fields: Array<{key,label,type,required}> }} data
 * @returns {Promise<{id, title, fields, createdAt, updatedAt}>}
 */
Template.create = async function ({ title, fields }) {
	const { title: tTitle, fields: tFields } = sanitizeTemplateInput({ title, fields });
	const id = uuidv4();
	const now = Date.now();

	const template = {
		id,
		title: tTitle,
		fields: tFields,
		createdAt: now,
		updatedAt: now,
	};

	await db.setObject(keyFor(id), template);
	await db.sortedSetAdd(TEMPLATE_LIST, now, id);

	return template;
};

/**
 * Get a single template by its ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
Template.get = async function (id) {
	assertString(id, 'id');
	return await db.getObject(keyFor(id));
};

/**
 * Get all templates in the database, ordered by creation time
 * @returns {Promise<Array<object>>}
 */
Template.list = async function () {
	const ids = await db.getSortedSetRange(TEMPLATE_LIST, 0, -1);
	if (!ids || !ids.length) return [];
	const keys = ids.map(keyFor);
	return await db.getObjects(keys);
};

/**
 * Update an existing template
 * @param {string} id
 * @param {{ title?: string, fields?: Array }} data
 * @returns {Promise<object>}
 */
Template.update = async function (id, data = {}) {
	assertString(id, 'id');
	const existing = await Template.get(id);
	if (!existing || !existing.id) {
		throw new Error('[[error:not-found]]');
	}

	const updated = { ...existing };

	if (typeof data.title !== 'undefined') {
		assertString(data.title, 'title');
		updated.title = data.title.trim();
	}
	if (typeof data.fields !== 'undefined') {
		validateFields(data.fields);
		updated.fields = data.fields.map(f => ({
			key: f.key.trim(),
			label: f.label.trim(),
			type: f.type,
			required: !!f.required,
		}));
	}

	updated.updatedAt = Date.now();
	await db.setObject(keyFor(id), updated);
	// Keep sorted set by creation time; do not move position here.
	return updated;
};

/**
 * Remove template by ID
 * @param {string} id
 * @returns {Promise<void>}
 */
Template.remove = async function (id) {
	assertString(id, 'id');
	// Remove object + remove from index
	await Promise.all([
		db.deleteAll([keyFor(id)]),
		db.sortedSetRemove(TEMPLATE_LIST, [id]),
	]);
};
