var pagedown = require('../node_modules/pagedown/Markdown.Converter');
var linkTargeter = require('./linkTargeter');
var mathJax = require('./mathJax');
var htmlSanitizer = require('./htmlSanitizer');
var pagedownExtra = require('./pagedownExtra');

var Markdown = {};
Markdown.Converter = new pagedown.Converter();
Markdown.HookCollection = pagedown.HookCollection;

// extensions
pagedownExtra.hookConverter(Markdown.Converter);
linkTargeter.hookConverter(Markdown.Converter);
mathJax.hookConverter(Markdown.Converter);
htmlSanitizer.hookConverter(Markdown.Converter); //make this last for security

module.exports = Markdown;