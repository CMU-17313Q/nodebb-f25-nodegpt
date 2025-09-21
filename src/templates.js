'use strict';

const db = require.main.require('./src/database');
const { v4: uuidv4 } = require('uuid');

const TEMPLATE_PREFIX = 'template:';
const TEMPLATE_LIST = 'templates:all';

//Empty object to hold methods
const Template = {};

/**
 * Create a new template and store it in the database
 * @returns The saved template object
 */
Template.create = async function ({ title, fields }) {
	const id = uuidv4();
	const now = Date.now();

	const template = {
		id,
		title,
		visibility: 'public',
		fields,
		tagMap: {}, // future feature
		version: 1,
		createdAt: now,
		updatedAt: now,
	};

	await db.setObject(`${TEMPLATE_PREFIX}${id}`, template);
	await db.sortedSetAdd(TEMPLATE_LIST, now, id);

	return template;
};

/**
 * Get a single template by its ID
 * @returns The template object or null if not found
 */
Template.get = async function (id) {
	return await db.getObject(`${TEMPLATE_PREFIX}${id}`);
};

/**
 * Get all templates in the database, ordered by creation time
 * @returns An array of all template objects
 */
Template.list = async function () {
	const ids = await db.getSortedSetRange(TEMPLATE_LIST, 0, -1);
	const keys = ids.map(id => `${TEMPLATE_PREFIX}${id}`);
	return await db.getObjects(keys);
};

module.exports = Template;
