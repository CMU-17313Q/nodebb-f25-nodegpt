/* test/client.template-popup.spec.js */
'use strict';

const assert = require('assert');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

const CLIENT_FILE = path.join(
	process.cwd(),
	'plugins/nodebb-plugin-template-selector/static/template-popup.js'
);

function setupDom(
	html = `
  <html><head></head><body>
    <div class="composer">
      <div class="write"></div>
      <textarea component="composer/textarea"></textarea>
      <button component="composer/submit" class="btn btn-primary">Submit</button>
    </div>
  </body></html>
`
) {
	const dom = new JSDOM(html, {
		runScripts: 'dangerously',
		resources: 'usable',
		pretendToBeVisual: true,
		url: 'http://localhost',
	});
	const { window } = dom;

	// Load jQuery UMD directly into the window (reliable under jsdom)
	const jqueryPath = require.resolve('jquery/dist/jquery.js');
	const jquerySrc = fs.readFileSync(jqueryPath, 'utf8');
	const jqScript = window.document.createElement('script');
	jqScript.textContent = jquerySrc;
	window.document.head.appendChild(jqScript);

	const $ = window.$; // now callable
	assert.strictEqual(typeof $, 'function', 'window.$ should be a function after UMD injection');

	// minimal globals expected by client
	window.ajaxify = { data: {}, go: () => {} };
	window.require = undefined; // force global bootbox path

	// bootbox stub: render radios, auto-pick choice, call "Select"
	window.bootbox = {
		dialog: (opts) => {
			const wrap = window.document.createElement('div');
			wrap.innerHTML = opts.message;
			window.document.body.appendChild(wrap);

			const pick = window.__nextChoice || '__blank';
			wrap.querySelectorAll('input[name="ts-template"]').forEach((r) => {
				if (r.value === pick) r.checked = true;
			});

			const dlg = {
				on: (evt, cb) => { if (evt === 'shown.bs.modal') cb(); },
				find: () => ({ addClass: () => {} }),
			};

			setTimeout(() => { opts?.buttons?.select?.callback?.(); }, 0);
			return dlg;
		},
	};

	// stub the GET calls the picker makes
	$.get = (url) => {
		const d = $.Deferred();
		if (/\/api\/plugins\/template-selector\/templates$/.test(url)) {
			d.resolve({
				templates: [
					{ id: 'assignment', title: 'Assignment Template', description: 'desc' },
					{ id: '__blank', title: 'Blank Template', description: 'blank' },
				],
			});
		} else if (/\/api\/plugins\/template-selector\/templates\//.test(url)) {
			d.resolve({
				template: {
					id: 'assignment',
					title: 'Assignment Template',
					fields: [
						{ key: 'course', label: 'Course', type: 'text', required: true },
						{ key: 'description', label: 'Assignment Description', type: 'textarea', required: true },
					],
				},
			});
		} else {
			d.reject(new Error('not found'));
		}
		return d.promise();
	};

	// load your client code after jQuery is present
	const clientSrc = fs.readFileSync(CLIENT_FILE, 'utf8');
	const clientScript = window.document.createElement('script');
	clientScript.textContent = clientSrc;
	window.document.body.appendChild(clientScript);

	// expose both for convenience
	return { window, $, dom };
}

describe('Client: template-popup.js (assert-only, UMD jQuery)', function () {
	this.timeout(8000);

	it('Assignment: shows picker, injects 10 fields, and only enables submit after required are filled', async () => {
		const { window, $ } = setupDom();

		window.__nextChoice = 'assignment';
		$(window).trigger('action:composer.loaded');

		await sleep(120);

		assert.strictEqual($('#ts-context').length, 1, 'context panel should render');
		const fieldCount = $('#ts-form [data-ts-key]').length;
		assert.strictEqual(fieldCount, 10, `expected 10 fields, got ${fieldCount}`);

		assert.strictEqual($('.composer [component="composer/submit"]').prop('disabled'), true);

		// fill required: course, assignment_name, due_date, due_time, description
		$('#ts-field-course').val('CS101').trigger('input');
		$('#ts-field-assignment_name').val('HW1').trigger('input');
		$('#ts-field-due_date').val('2025-10-20').trigger('input');
		$('#ts-field-due_time').val('23:59').trigger('input');
		$('#ts-field-description').val('Read chapter 3').trigger('input');

		await sleep(50);

		assert.strictEqual($('.composer [component="composer/submit"]').prop('disabled'), false);

		const payload = {};
		$(window).trigger('action:composer.submit', [payload]);

		assert.ok(payload.data, 'payload.data should exist');
		assert.strictEqual(payload.data.tsTemplateId, 'assignment');
		assert.ok(payload.data.tsValues, 'payload.data.tsValues should exist');
		assert.strictEqual(payload.data.tsValues.course, 'CS101');
		assert.strictEqual(payload.data.tsValues.assignment_name, 'HW1');
	});

	it('Blank: no panel, submit allowed, payload carries __blank with no fields/values', async () => {
		const { window, $ } = setupDom();

		window.__nextChoice = '__blank';
		$(window).trigger('action:composer.loaded');

		await sleep(100);

		assert.strictEqual($('#ts-context').length, 0);
		assert.strictEqual($('.composer [component="composer/submit"]').prop('disabled'), false);

		const payload = {};
		$(window).trigger('action:composer.submit', [payload]);

		assert.ok(payload.data, 'payload.data should exist for blank');
		assert.strictEqual(payload.data.tsTemplateId, '__blank');

		const fields = payload.data.tsFields || [];
		const values = payload.data.tsValues || {};
		assert.ok(Array.isArray(fields), 'tsFields should be an array');
		assert.strictEqual(fields.length, 0, 'no fields for blank');
		assert.strictEqual(typeof values, 'object', 'tsValues should be object-like');
		assert.strictEqual(Object.keys(values).length, 0, 'no values for blank');
	});
});

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}
