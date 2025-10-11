/* plugins/nodebb-plugin-template-selector/static/template-popup.js */
/* global $, ajaxify */
(function () {
  'use strict';

  // safe html escaper
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // minimal styles to ensure it always works
  function ensureStyles() {
    if (document.getElementById('ts-styles')) return;
    const css = `
      #ts-context.ts-card {
        background: #f8fafc; border:1px solid #e5e7eb; border-radius:12px;
        padding:16px; margin:10px 0;
      }
      #ts-context .ts-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
      #ts-context .ts-title { font-weight:700; font-size:16px; line-height:1.25; }
      #ts-context .ts-actions { display:flex; gap:8px; }
      #ts-context .form-label { font-weight:600; }
      #ts-context .badge.bg-danger { background:#e11d48!important; }
      /* validation only when invalid */
      #ts-context .invalid-feedback { display:none; font-size:12px; margin-top:4px; }
      #ts-context .is-invalid + .invalid-feedback { display:block; }
      #ts-context .is-invalid { border-color:#e11d48; box-shadow:none; }
      #ts-context .ts-alert { margin-bottom:10px; }
      #ts-context .ts-grid { display:grid; grid-template-columns:1fr; gap:12px; }
    `;
    const style = document.createElement('style');
    style.id = 'ts-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // assignment field schema
  const ASSIGNMENT_FIELDS = [
    { key: 'course',            label: 'Course',                 type: 'text',     required: true  },
    { key: 'assignment_name',   label: 'Assignment Name',        type: 'text',     required: true  },
    { key: 'due_date',          label: 'Due Date',               type: 'text',     required: true  },
    { key: 'due_time',          label: 'Due Time',               type: 'text',     required: true  },
    { key: 'weight',            label: 'Weight',                 type: 'text',     required: false },
    { key: 'description',       label: 'Assignment Description', type: 'textarea', required: true  },
    { key: 'example_solution',  label: 'Example Solution',       type: 'textarea', required: false },
    { key: 'faqs',              label: 'FAQs',                   type: 'textarea', required: false },
    { key: 'late_policy',       label: 'Late Policy',            type: 'textarea', required: false },
    { key: 'resources',         label: 'Resources',              type: 'textarea', required: false },
  ];

  // -template picker function
  async function showTemplatePicker() {
    let list = [];
    try {
      const resp = await $.get('/api/plugins/template-selector/templates');
      list = Array.isArray(resp && resp.templates) ? resp.templates : [];
    } catch (e) { /* ignore – fallback below */ }

    if (!list.length) {
      list = [
        { id: '__blank',     title: 'Blank Template',      description: 'Start with an empty post.' },
        { id: 'assignment',  title: 'Assignment Template', description: 'Course, repro steps, expected vs actual.' },
      ];
    }

    // make sure blank appears last by spec (if needed)
    list = list.sort((a, b) => (a.id === '__blank') - (b.id === '__blank'));

    const body = `
      <div class="list-group">
        ${list.map((t, idx) => `
          <label class="list-group-item">
            <input class="form-check-input me-2" type="radio" name="ts-template" value="${t.id}"
                   ${idx === list.length - 1 ? 'checked' : ''}>
            <div class="fw-semibold">${esc(t.title)}</div>
            ${t.description ? `<small class="text-muted d-block">${esc(t.description)}</small>` : ''}
          </label>
        `).join('')}
      </div>`;

    return new Promise((resolve) => {
      const useBootbox = (bb) => {
        const bootbox = bb || window.bootbox;
        const dlg = bootbox.dialog({
          title: 'Select a template',
          message: body,
          closeButton: true,
          buttons: {
            cancel: { label: 'Cancel', className: 'btn-secondary', callback: () => resolve(null) },
            select: { label: 'Select', className: 'btn-primary',   callback: () => {
              const v = $('input[name="ts-template"]:checked').val();
              console.log('[ts] picker selected:', v);
              resolve(v);
            } },
          },
        });
        // center modal
        dlg.on('shown.bs.modal', () => {
          dlg.find('.modal-dialog').addClass('modal-dialog-centered');
          console.log('[ts] picker shown');
        });
      };
      try { require(['bootbox'], (bb) => useBootbox(bb)); }  // AMD
      catch { useBootbox(window.bootbox); }                  // global
    });
  }

  // composer state function helpers
  function tsSetSubmitDisabled(disabled) {
    const $btn = $('.composer [component="composer/submit"], .composer button[data-action="post"], .composer .composer-submit, .composer .btn-primary');
    $btn.prop('disabled', !!disabled);
  }

  function tsRemoveUIOnly() {
    $('#ts-context').remove();
    $('#ts-alert').remove();
    $(document).off('input.ts-form change.ts-form click.ts-clear');
  }

  // For BLANK: keep a context marker + empty payload, but NO UI and NO blocking
  function tsSetBlankContext(templateId = '__blank') {
    tsRemoveUIOnly();
    const $cmp = $('.composer');
    $cmp.attr('data-ts-has-context', 'true')        
        .data('ts-fields', [])                     
        .data('ts-values', {})                      
        .data('ts-template-id', templateId);        
    tsSetSubmitDisabled(false);                     
    console.log('[ts] blank context set');
  }

  function tsClearAllContext() {
    tsRemoveUIOnly();
    const $cmp = $('.composer');
    $cmp.removeAttr('data-ts-has-context')
        .removeData('ts-fields')
        .removeData('ts-values')
        .removeData('ts-template-id');
    tsSetSubmitDisabled(false);
  }

  // UI and error/validation handlers
  function tsFieldRow(field) {
    const id = `ts-field-${field.key}`;
    const req = field.required ? ' <span class="badge bg-danger">required</span>' : '';
    const base = `data-ts-required="${field.required ? 'true' : 'false'}" data-ts-key="${field.key}" class="form-control"`;
    let input = '';
    switch ((field.type || 'text').toLowerCase()) {
      case 'textarea': input = `<textarea id="${id}" ${base}></textarea>`; break;
      case 'number':  input = `<input id="${id}" type="number" ${base} />`; break;
      default:        input = `<input id="${id}" type="text" ${base} />`;
    }
    const fb = field.required ? `<div class="invalid-feedback">This field is required.</div>` : '';
    return `
      <div class="mb-1">
        <label for="${id}" class="form-label">${esc(field.label || field.key)}${req}</label>
        ${input}
        ${fb}
      </div>`;
  }

  function tsComputeMissing(fields, values) {
    const missing = [];
    fields.forEach(f => {
      if (!f || !f.required) return;
      const v = (values[f.key] ?? '').toString().trim();
      if (!v) missing.push({ key: f.key, label: f.label || f.key });
    });
    return missing;
  }

  function tsApplyErrors(missingList) {
    $('#ts-form [data-ts-key]').removeClass('is-invalid');
    $('#ts-alert').remove();

    if (!missingList.length) return;

    missingList.forEach(m => {
      const $el = $(`#ts-form [data-ts-key][data-ts-key="${m.key}"]`);
      $el.addClass('is-invalid');
    });

    const msg = `Please complete required fields: ${missingList.map(m => esc(m.label)).join(', ')}`;
    const alert = $(`<div id="ts-alert" class="alert alert-danger ts-alert" role="alert">${msg}</div>`);
    $('#ts-context .ts-header').after(alert);

    const $first = $(`#ts-form [data-ts-key].is-invalid`).first();
    if ($first.length) {
      const rect = $first[0].getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight - 80) {
        $first[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      $first.trigger('focus');
    }
  }

  // where to insert 
  function tsFindInsertionPoint() {
    const probes = [
      { sel: '.composer [component="composer/textarea"]', how: 'before' },
      { sel: '.composer [component="composer/editor"]',    how: 'before' },
      { sel: '.composer textarea',                         how: 'before' },
      { sel: '.composer .write',                           how: 'prepend' },
      { sel: '[component="composer"] .write',              how: 'prepend' },
      { sel: '[component="composer"]',                     how: 'prepend' },
      { sel: '.composer-container .composer',              how: 'prepend' },
      { sel: '.composer-container',                        how: 'prepend' },
      { sel: '.composer',                                  how: 'prepend' },
    ];
    for (const p of probes) {
      const $el = $(p.sel);
      if ($el.length) return { $el, how: p.how, sel: p.sel };
    }
    return null;
  }

  function tsWaitForComposer(callback) {
    const existing = tsFindInsertionPoint();
    if (existing) return callback(existing);
    const mo = new MutationObserver(() => {
      const point = tsFindInsertionPoint();
      if (point) { mo.disconnect(); callback(point); }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 5000);
  }

  // inject the form and live validation
  function tsInjectForm(template, chosenId) {
    ensureStyles();
    const fields = Array.isArray(template.fields) ? template.fields : [];

    tsWaitForComposer((point) => {
      if (!fields.length) {
        // if a server template came back with empty fields, treat like blank context
        tsSetBlankContext(chosenId || '__blank');
        return;
      }

      const html = `
        <div id="ts-context" class="ts-card">
          <div class="ts-header">
            <div class="ts-title">Context — ${esc(template.title || 'Template')}</div>
            <div class="ts-actions">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="ts-clear-fields">Clear</button>
            </div>
          </div>
          <div class="ts-grid">
            <form id="ts-form">
              ${fields.map(tsFieldRow).join('')}
            </form>
          </div>
        </div>`;

      tsRemoveUIOnly();
      if (point.how === 'before') point.$el.first().before(html);
      else point.$el.first().prepend(html);
      console.log('[ts] injected near:', point.sel, 'mode:', point.how);

      // composer state for submit guard
      $('.composer')
        .attr('data-ts-has-context', 'true')
        .data('ts-fields', fields)
        .data('ts-values', {})
        .data('ts-template-id', chosenId || template.id || null);

      // clear button
      $(document).off('click.ts-clear').on('click.ts-clear', '#ts-clear-fields', () => {
        $('#ts-form [data-ts-key]').val('').removeClass('is-invalid');
        $('#ts-alert').remove();
        $('.composer').data('ts-values', {});
        tsSetSubmitDisabled(tsComputeMissing(fields, {}).length > 0);
      });

      // live validation
      $(document).off('input.ts-form change.ts-form')
        .on('input.ts-form change.ts-form', '#ts-form [data-ts-key]', function () {
          const values = {};
          $('#ts-form [data-ts-key]').each(function () {
            const $el = $(this);
            values[$el.data('ts-key')] = ($el.val() || '').toString();
          });
          $('.composer').data('ts-values', values);

          const missing = tsComputeMissing(fields, values);
          $('#ts-form [data-ts-key]').each(function () {
            const key = $(this).data('ts-key');
            const isMissing = !!missing.find(m => m.key === key);
            $(this).toggleClass('is-invalid', isMissing);
          });
          if (!missing.length) $('#ts-alert').remove();
          tsSetSubmitDisabled(missing.length > 0);
        });

      // initial disable if any required exist
      tsSetSubmitDisabled(tsComputeMissing(fields, {}).length > 0);
    });
  }

  // submit gaurd
  function tsAttachSubmitGuard() {
    $(window).off('action:composer.submit.ts-guard');
    $(window).on('action:composer.submit.ts-guard', (ev, payload) => {
      const $cmp = $('.composer');
      if ($cmp.attr('data-ts-has-context') === 'true') {
        const fields = $cmp.data('ts-fields') || [];
        const values = $cmp.data('ts-values') || {};
        const templateId = $cmp.data('ts-template-id') || null;
        const missing = tsComputeMissing(fields, values);

        if (missing.length) {
          ev.stopImmediatePropagation();
          ev.stopPropagation();
          tsApplyErrors(missing);
          tsSetSubmitDisabled(true);
          return;
        }

        // Always attach payload when context is set, including BLANK
        payload.data = payload.data || {};
        payload.data.tsTemplateId = templateId;
        payload.data.tsFields = fields.map(({ key, label, required }) => ({ key, label, required }));
        payload.data.tsValues = values;
      }
      // if no context at all, do nothing
    });
  }

  // functions run after the composer
  async function injectForChoice(choice) {
    // BLANK: no UI, but set an empty context and allow submit; still save payload on submit
    if (!choice || choice === '__blank') {
      tsSetBlankContext('__blank');
      tsAttachSubmitGuard();
      return;
    }

    let chosenId = choice;
    let template = { title: 'Blank Template', fields: [] };
    if (choice === 'assignment') {
      template = { title: 'Assignment Template', fields: ASSIGNMENT_FIELDS };
    } else {
      try {
        const resp = await $.get(`/api/plugins/template-selector/templates/${choice}`);
        const t = resp && resp.template;
        if (t) {
          chosenId = t.id || choice;
          if (Array.isArray(t.fields)) {
            template = { id: t.id, title: t.title || 'Template', fields: t.fields };
          }
        }
      } catch { /* ignore; keep fallback */ }
    }
    tsInjectForm(template, chosenId);
    tsAttachSubmitGuard();
  }

  // Show picker when the composer is ready
  $(window).on('action:composer.loaded.ts', async function () {
    try {
      if (window.__ts_busy) return;
      window.__ts_busy = true;

      const choice = await showTemplatePicker();
      window.__ts_busy = false;

      if (choice !== null) {                // null means user hit Cancel
        window.__ts_pending_choice = choice;
        await injectForChoice(choice);
        window.__ts_pending_choice = null;
      }
    } catch (e) {
      console.warn('[ts] composer.loaded handler error:', e);
      window.__ts_busy = false;
    }
  });

  // Fallback: if a theme doesn’t emit composer.loaded
  $(window).on('action:ajaxify.end.ts-fallback', async function () {
    const t = ajaxify && ajaxify.data && ajaxify.data.template && ajaxify.data.template.name;
    if (t === 'compose' && window.__ts_pending_choice) {
      console.log('[ts] ajaxify.end fallback → injecting…');
      await injectForChoice(window.__ts_pending_choice);
      window.__ts_pending_choice = null;
    }
  });

  console.log('[ts] picker + field injection ready (blank persists payload, centered modal)');
}());
