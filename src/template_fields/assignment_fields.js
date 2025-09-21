'use strict';

const assignmentFields = [
	{ key: 'course', label: 'Course', type: 'text', required: true },
	{ key: 'assignment_name', label: 'Assignment Name', type: 'text', required: true },
	{ key: 'due_date', label: 'Due Date', type: 'text', required: true },
	{ key: 'due_time', label: 'Due Time', type: 'text', required: true },
	{ key: 'weight', label: 'Weight', type: 'text', required: false },
	{ key: 'description', label: 'Assignment Description', type: 'textarea', required: true },
	{ key: 'example_solution', label: 'Example Solution', type: 'textarea', required: false },
	{ key: 'faqs', label: 'FAQs', type: 'textarea', required: false },
	{ key: 'late_policy', label: 'Late Policy', type: 'textarea', required: false },
	{ key: 'resources', label: 'Resources', type: 'textarea', required: false },
];

module.exports = assignmentFields;
