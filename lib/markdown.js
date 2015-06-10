var pagedown = require('../node_modules/pagedown/Markdown.Converter');
var mathJax = require('./mathJax');
var htmlSanitizer = require('./htmlSanitizer');


var Markdown = {};
Markdown.Converter = new pagedown.Converter();
Markdown.HookCollection = pagedown.HookCollection;

// extensions
mathJax.hookConverter(Markdown.Converter);
htmlSanitizer.hookConverter(Markdown.Converter); //make this last for security

module.exports = Markdown;