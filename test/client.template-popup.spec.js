/* test/client.template-popup.spec.js */
'use strict';

const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');

// path to your client file
const CLIENT_FILE = path.join(process.cwd(), 'plugins/nodebb-plugin-template-selector/static/template-popup.js');

// helper to boot a DOM + jQuery + globals
function setupDom(html = `
  <html><head></head><body>
    <div class="composer">
      <div class="write"></div>
      <textarea component="composer/textarea"></textarea>
      <button component="composer/submit" class="btn btn-primary">Submit</button>
    </div>
  </body></html>
`) {
	const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });
	const window = dom.window;
	const $ = require('jquery')(window);

	// Minimal ajaxify mock
	window.ajaxify = { data: {}, go: () => {} };

	// global jQuery/$ for the client file
	window.$ = $; window.jQuery = $;
	// Provide a fake AMD require (not used in tests; we use global bootbox)
	window.require = undefined;

	// stubbed bootbox that immediately "selects" a radio value and calls select
	// We will set window.__nextChoice before triggering composer.loaded
	window.bootbox = {
		dialog: (opts) => {
			// inject the dialog HTML into DOM so radio can be found
			const wrap = window.document.createElement('div');
			wrap.innerHTML = opts.message;
			window.document.body.appendChild(wrap);

			// set the chosen radio
			const choice = window.__nextChoice || '__blank';
			const radios = wrap.querySelectorAll('input[name="ts-template"]');
			radios.forEach(r => { if (r.value === choice) r.checked = true; });

			// simulate shown event
			const dlg = {
				on: (evt, cb) => { if (evt === 'shown.bs.modal') cb(); },
				find: () => ({ addClass: () => {} }),
			};

			// immediately call the select callback (simulate user click)
			// small delay to mimic user action
			setTimeout(() => { opts.buttons.select.callback(); }, 0);

			return dlg;
		},
	};

	// wire a trivial GET for templates API used by client (only needed for non-blank remote ids)
	window.$.get = (url) => {
		const d = $.Deferred();
		if (/\/api\/plugins\/template-selector\/templates$/.test(url)) {
			d.resolve({
				templates: [
					{ id: 'assignment', title: 'Assignment Template', description: 'desc' },
					{ id: '__blank', title: 'Blank Template', description: 'blank' },
				],
			});
		} else if (/\/api\/plugins\/template-selector\/templates\//.test(url)) {
			// not used for 'assignment' in client code (assignment is handled locally)
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

	// load your client file into this window context
	const code = fs.readFileSync(CLIENT_FILE, 'utf8');
	const scriptEl = window.document.createElement('script');
	scriptEl.textContent = code;
	window.document.body.appendChild(scriptEl);

	return { window, $, dom };
}

describe('Client: template-popup.js', function () {
	this.timeout(5000);

	it('Assignment (local schema): picker shows, 10 fields inject, submit blocks until all required are filled', async () => {
		const { window, $ } = setupDom();
		// tell bootbox stub to pick the special-cased local schema
		window.__nextChoice = 'assignment';

		// trigger composer loaded (what your code listens to)
		$(window).trigger('action:composer.loaded');

		// wait a moment for async modal select + injection
		await new Promise(r => setTimeout(r, 80));

		expect($('#ts-context').length).to.equal(1, 'context panel should render');

		// Local ASSIGNMENT_FIELDS has 10 fields
		expect($('#ts-form [data-ts-key]').length).to.equal(10);

		// initially submit should be disabled (required fields empty)
		const isDisabled = $('.composer [component="composer/submit"]').prop('disabled');
		expect(isDisabled).to.equal(true);

		// Fill all required fields in local schema:
		// course, assignment_name, due_date, due_time, description
		$('#ts-field-course').val('CS101').trigger('input');
		$('#ts-field-assignment_name').val('HW1').trigger('input');
		$('#ts-field-due_date').val('2025-10-20').trigger('input');
		$('#ts-field-due_time').val('23:59').trigger('input');
		$('#ts-field-description').val('Writeup').trigger('input');

		await new Promise(r => setTimeout(r, 20));

		// submit should enable
		expect($('.composer [component="composer/submit"]').prop('disabled')).to.equal(false);

		// simulate submit and capture payload
		const payload = {};
		$(window).trigger('action:composer.submit', [payload]);

		expect(payload).to.have.property('data');
		expect(payload.data).to.have.property('tsTemplateId', 'assignment');
		expect(payload.data).to.have.property('tsValues');

		// verify required values are attached
		expect(payload.data.tsValues.course).to.equal('CS101');
		expect(payload.data.tsValues.assignment_name).to.equal('HW1');
		expect(payload.data.tsValues.due_date).to.equal('2025-10-20');
		expect(payload.data.tsValues.due_time).to.equal('23:59');
		expect(payload.data.tsValues.description).to.equal('Writeup');
	});

	it('Blank: no UI injected, submit allowed, payload persists', async () => {
		const { window, $ } = setupDom();
		window.__nextChoice = '__blank';

		$(window).trigger('action:composer.loaded');
		await new Promise(r => setTimeout(r, 40));

		// no panel for blank
		expect($('#ts-context').length).to.equal(0);

		// submit should NOT be disabled
		expect($('.composer [component="composer/submit"]').prop('disabled')).to.equal(false);

		const payload = {};
		$(window).trigger('action:composer.submit', [payload]);

		expect(payload).to.have.property('data');
		expect(payload.data.tsTemplateId).to.equal('__blank');
		expect(payload.data.tsFields).to.be.an('array').that.is.empty;
		expect(payload.data.tsValues).to.deep.equal({});
	});
});
