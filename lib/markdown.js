var pagedown = require('../node_modules/pagedown/Markdown.Converter');

var Markdown = {};
Markdown.Converter = new pagedown.Converter();
Markdown.HookCollection = pagedown.HookCollection;

module.exports = Markdown;