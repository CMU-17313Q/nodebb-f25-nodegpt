'use strict';

const Template = require.main.require('./src/templates');

const Plugin = {};

// This function runs when NodeBB starts and loads this plugin
Plugin.init = function (params, callback) {
  const router = params.router;
  const middleware = params.middleware;

	//GET API route to return a list of available templates
  router.get('/api/plugins/template-selector/templates', middleware.requireUser, async function (req, res) {
    try {
      const templates = await Template.list();
      const response = templates.map(t => ({ id: t.id, title: t.title }));

			// Send the templates back to the browser as JSON
      res.json({ templates: response }); 
    } catch (err) {
      console.error('Failed to load templates:', err);
      res.status(500).json({ error: 'Failed to load templates' });
    }
  });

  callback();
};

module.exports = Plugin;