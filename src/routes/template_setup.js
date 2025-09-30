'use strict';

const router = require('express').Router();

const Template = require('../templates'); 
const assignmentFields = require('../template_fields/assignment_fields');

// routes for managing templates
const staffOnly = require('../middleware/staffOnly');
const Templates = require('../controllers/postTemplates');

// READ (public)
router.get('/', Templates.list);
router.get('/:id', Templates.read);

// CREATE / UPDATE / DELETE (staff only)
router.post('/', staffOnly, Templates.create);
router.put('/:id', staffOnly, Templates.update);
router.delete('/:id', staffOnly, Templates.remove);

module.exports = router;

/**
 * GET /test-template
 * Route to create a new assignment template and return it as JSON.
 * This is mainly for testing or initial setup purposes.
 */
router.get('/test-template', async (req, res) => {
	try {
		const template = await Template.create({
			title: 'Assignment Template',
			fields: assignmentFields,
		});

		// Respond with success status and the created template data
		res.json({
			success: true,
			template,
		});
	} catch (err) {
		console.error('Error creating template:', err);

		// Respond with a 500 status and error message
		res.status(500).json({
			success: false,
			error: err.message,
		});
	}
});

module.exports = router;

