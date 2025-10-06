'use strict';

// Wait for the page to fully load
$(document).ready(function () {
  $(document).on('click', '#new_topic', async function (e) {
    e.preventDefault();

    try {
			// Make a request to the server to get the list of templates
      const res = await fetch('/api/plugins/template-selector/templates', {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch templates');

      const data = await res.json();
      const templates = data.templates || [];

      // Add blank template at the end of the list
      templates.push({ id: '', title: 'Blank Template' });

      let html = '<form id="template-selection">';

			// Loop through each template and add it as a radio button
      templates.forEach(template => {
        html += `<div><label><input type="radio" name="template" value="${template.id}" ${template.id === '' ? 'checked' : ''}> ${template.title}</label></div>`;
      });
      html += '</form>';

			// Show a pop-up dialog using Bootbox to let the user choose a template
      bootbox.dialog({
        title: 'Select a Template',
        message: html,
        buttons: {
          submit: {
            label: 'Submit',
            className: 'btn-primary',
            callback: function () {
              const selected = $('#template-selection input[name=template]:checked').val() || '';
              const href = $('#new_topic').attr('href');
              const url = selected ? `${href}&template=${encodeURIComponent(selected)}` : href;
              window.location.href = url;
            },
          },
        },
        onEscape: false,
        backdrop: 'static',
      });
    } catch (err) {
      alert(err.message);
    }
  });
});
