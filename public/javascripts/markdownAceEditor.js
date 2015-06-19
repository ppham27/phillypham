var Markdown = require('../../lib/markdown.js');

var ace = require('brace');
require('brace/mode/plain_text');
require('brace/theme/xcode');
require('./brace/keybinding/emacs');

var defaultsStrings = {
  bold: "Strong <strong>",
  boldexample: "strong text",
  italic: "Emphasis <em> Ctrl+I",
  italicexample: "emphasized text",
  link: "Hyperlink <a> Ctrl+L",
  linkdescription: "enter link description here",
  linkdialog: "<p><b>Insert Hyperlink</b></p><p>http://example.com/ \"optional title\"</p>",
  quote: "Blockquote <blockquote> Ctrl+Q",
  quoteexample: "Blockquote",
  code: "Code Sample <pre><code> Ctrl+K",
  codeexample: "enter code here",
  image: "Image <img> Ctrl+G",
  imagedescription: "enter image description here",
  imagedialog: "<p><b>Insert Image</b></p><p>http://example.com/images/diagram.jpg \"optional title\"<br><br>Need <a href='http://www.google.com/search?q=free+image+hosting' target='_blank'>free image hosting?</a></p>",
  olist: "Numbered List <ol> Ctrl+O",
  ulist: "Bulleted List <ul> Ctrl+U",
  litem: "List item",
  heading: "Heading <h1>/<h2> Ctrl+H",
  headingexample: "Heading",
  hr: "Horizontal Rule <hr> Ctrl+R",
  undo: "Undo",
  redo: "Redo",
  redomac: "Redo",
  help: "Markdown Editing Help"
};


function MarkdownAceEditor(converter, idPostfix, options) {
  this.converter = converter;  
  this.options = options;
  this.idPostfix = idPostfix || '';
  this.panels = new PanelCollection(this.idPostfix);
  this.editor = createEditor(this.panels);
  var panels = this.panels;
  var editor = this.editor;
  var hooks = this.hooks = new Markdown.HookCollection();
  hooks.addNoop("onPreviewRefresh");
  hooks.addNoop("postBlockquoteCreation");
  hooks.addNoop("insertImageDialog");
  editor.on('change', function() {
    panels.preview.innerHTML = converter.makeHtml(editor.getValue());
    hooks.onPreviewRefresh();
  });  

  var buttons = this.buttons = new ButtonCollection(panels.buttonBar);
  
}

MarkdownAceEditor.prototype.getConverter = function() {
  return this.converter;
}

MarkdownAceEditor.prototype.run = function() {
  return this.hooks.onPreviewRefresh();
}

module.exports = MarkdownAceEditor;

function ButtonCollection(buttonBar) {
  
}

function PanelCollection(idPostfix) {
  this.input = document.getElementById('wmd-input' + idPostfix);
  this.preview = document.getElementById('wmd-preview' + idPostfix);
  this.buttonBar = document.getElementById('wmd-button-bar' + idPostfix);
  this.editor = document.getElementById('wmd-editor' + idPostfix);
}

function createEditor(panels) {
  var editor = ace.edit(panels.editor.id);
  // my preferred options, should change later for more customizability
  editor.setTheme('ace/theme/xcode');
  editor.getSession().setMode('ace/mode/plain_text');
  editor.renderer.setShowGutter(false);
  editor.renderer.setHighlightGutterLine(false);
  editor.setHighlightActiveLine(false);
  editor.setKeyboardHandler('ace/keyboard/emacs');
  editor.on('change', function() {
    panels.input.value = editor.getValue();
  });
  editor.on('focus', function(e) {
    panels.editor.classList.add('focused');
  });
  editor.on('blur', function(e) {
    panels.editor.classList.remove('focused');
  });
  return editor;
}