var pagedown = require('../node_modules/pagedown/Markdown.Converter');
var marked = require('marked');
var linkTargeter = require('./linkTargeter');
var mathJax = require('./mathJax');
var htmlSanitizer = require('./htmlSanitizer');

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  langPrefix: ''
});

var Markdown = {};
Markdown.Converter = {hooks: new pagedown.HookCollection()};
Markdown.Converter.hooks.addNoop("preConversion");
Markdown.Converter.hooks.addNoop("postConversion");
Markdown.HookCollection = pagedown.HookCollection;

Markdown.Converter.makeHtml = function(text) {  
  var state = {text: text, mathJaxMath: []};
  state = this.hooks.preConversion(state);
  state.text = marked(state.text);
  return this.hooks.postConversion(state).text.trim();
}

// extensions
linkTargeter.hookConverter(Markdown.Converter);
mathJax.hookConverter(Markdown.Converter);
htmlSanitizer.hookConverter(Markdown.Converter); //make this last for security

module.exports = Markdown;

