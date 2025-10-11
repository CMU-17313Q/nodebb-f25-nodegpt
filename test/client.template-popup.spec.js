/* test/client.template-popup.spec.js */
'use strict';

const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

const CLIENT_FILE = path.join(process.cwd(), 'plugins/nodebb-plugin-template-selector/static/template-popup.js');

function setupDom(html = `
  <html><head></head><body>
    <div class="composer">
      <div class="write"></div>
      <textarea component="composer/textarea"></textarea>
      <button component="composer/submit" class="btn btn-primary">Submit</button>
    </div>
  </body></html>
`) {
	const dom = new JSDOM(html, {
		runScripts: 'dangerously',
		resources: 'usable',
		url: 'http://localhost',
		pretendToBeVisual: true,
	});
	const { window } = dom;

	// 1) Load jQuery UMD directly into the window (most reliable under jsdom)
	const jqueryPath = require.resolve('jquery/dist/jquery.js');
	const jquerySrc = fs.readFileSync(jqueryPath, 'utf8');
	const jqScript = window.document.createElement('script');
	jqScript.textContent = jquerySrc;
	window.document.head.appendChild(jqScript);

	const $ = window.$; // now a callable function

	// 2) Minimal globals your client code expects
	window.ajaxify = { data: {}, go: () => {} };
	window.require = undefined; // force bootbox global path

	// 3) Stub bootbox to auto-select a value and click "Select"
	window.bootbox = {
		dialog: (opts) => {
			const wrap = window.document.createElement('div');
			wrap.innerHTML = opts.message;
			window.document.body.appendChild(wrap);

			const choice = window.__nextChoice || '__blank';
			wrap.querySelectorAll('input[name="ts-template"]').forEach(r => {
				if (r.value === choice) r.checked = true;
			});

			const dlg = {
				on: (evt, cb) => { if (evt === 'shown.bs.modal') cb(); },
				find: () => ({ addClass: () => {} }),
			};
			setTimeout(() => { opts.buttons.select.callback(); }, 0);
			return dlg;
		},
	};

	// 4) Stub $.get for templates API (used only for listing here)
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

	// 5) Load your client file into the window
	const clientSrc = fs.readFileSync(CLIENT_FILE, 'utf8');
	const clientScript = window.document.createElement('script');
	clientScript.textContent = clientSrc;
	window.document.body.appendChild(clientScript);

	return { window, $, dom };
}

describe('Client: template-popup.js', function () {
	this.timeout(8000);

	it('Assignment (local schema): picker shows, 10 fields inject, submit blocks until all required are filled', async () => {
		const { window, $ } = setupDom();
		window.__nextChoice = 'assignment';

		// trigger what your plugin listens to
		$(window).trigger('action:composer.loaded');
		await sleep(100);

		expect($('#ts-context').length).to.equal(1, 'context panel should render');
		expect($('#ts-form [data-ts-key]').length).to.equal(10, 'local ASSIGNMENT_FIELDS has 10 inputs');

		// initially blocked
		expect($('.composer [component="composer/submit"]').prop('disabled')).to.equal(true);

		// fill required: course, assignment_name, due_date, due_time, description
		$('#ts-field-course').val('CS101').trigger('input');
		$('#ts-field-assignment_name').val('HW1').trigger('input');
		$('#ts-field-due_date').val('2025-10-20').trigger('input');
		$('#ts-field-due_time').val('23:59').trigger('input');
		$('#ts-field-description').val('Writeup').trigger('input');
		await sleep(40);

		expect($('.composer [component="composer/submit"]').prop('disabled')).to.equal(false);

		const payload = {};
		$(window).trigger('action:composer.submit', [payload]);

		expect(payload).to.have.property('data');
		expect(payload.data.tsTemplateId).to.equal('assignment');
		expect(payload.data.tsValues.course).to.equal('CS101');
		expect(payload.data.tsValues.assignment_name).to.equal('HW1');
		expect(payload.data.tsValues.due_date).to.equal('2025-10-20');
		expect(payload.data.tsValues.due_time).to.equal('23:59');
		expect(payload.data.tsValues.description).to.equal('Writeup');
	});

	it('Blank: no UI, submit allowed, payload persists with __blank', async () => {
		const { window, $ } = setupDom();
		window.__nextChoice = '__blank';

		$(window).trigger('action:composer.loaded');
		await sleep(60);

		expect($('#ts-context').length).to.equal(0, 'no panel for blank');
		expect($('.composer [component="composer/submit"]').prop('disabled')).to.equal(false);

		const payload = {};
		$(window).trigger('action:composer.submit', [payload]);

		expect(payload).to.have.property('data');
		expect(payload.data.tsTemplateId).to.equal('__blank');
		expect(Array.isArray(payload.data.tsFields)).to.equal(true);
		expect(payload.data.tsFields.length).to.equal(0);
		expect(payload.data.tsValues).to.deep.equal({});
	});
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
