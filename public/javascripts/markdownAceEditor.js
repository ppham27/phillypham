/*
 * Basically a refactored version of the pagedown editor
 * that relys on the ACE editor undo manager and keybindings
 */

var Markdown = require('../../lib/markdown.js');

var ace = require('brace');
var Range = ace.acequire('ace/range').Range;
require('brace/mode/markdown');
require('brace/theme/xcode');
require('./brace/keybinding/emacs');

var defaultStrings = {
  bold: 'Strong <strong>',
  boldExample: "strong text",
  italic: 'Emphasis <em>',
  italicExample: 'emphasized text',
  link: 'Hyperlink <a>',
  linkdescription: 'enter link description here',
  linkdialog: '<p><b>Insert Hyperlink</b></p><p>http://example.com/ "optional title"</p>',
  quote: 'Blockquote <blockquote>',
  quoteexample: 'Blockquote',
  code: 'Code Sample <pre><code>',
  codeexample: 'enter code here',
  image: 'Image <img>',
  imagedescription: 'enter image description here',
  imagedialog: '<p><b>Insert Image</b></p><p>http://example.com/images/diagram.jpg "optional title"<br><br>Need <a href="http://www.google.com/search?q=free+image+hosting" target="_blank">free image hosting?</a></p>',
  olist: 'Numbered List <ol>',
  ulist: 'Bulleted List <ul>',
  litem: 'List item',
  heading: 'Heading <h1>/<h2>',
  headingexample: 'Heading',
  hr: 'Horizontal Rule <hr>',
  undo: 'Undo',
  redo: 'Redo',
  redomac: 'Redo',
  help: 'Markdown Editing Help'
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
  // hooks.addNoop("postBlockquoteCreation");
  // hooks.addFalse("insertImageDialog");
  editor.on('change', function() {
    panels.preview.innerHTML = converter.makeHtml(editor.getValue());
    hooks.onPreviewRefresh();
  });  
  window.aceEditor = editor; // DEBUG CODE
  var buttons = this.buttons = new ButtonCollection(panels.buttonBar);
  buttons.makeButton('bold', defaultStrings['bold'], '0px');
  bindButtonToCommand(buttons.buttonElements.bold,
                      fenceEditor,
                      {editor: editor, 
                       fence: '**', defaultString: defaultStrings['boldExample']});
  buttons.makeButton('italic', defaultStrings['italic'], '-20px');
  bindButtonToCommand(buttons.buttonElements.italic,
                      fenceEditor,
                      {editor: editor, 
                       fence: '*', defaultString: defaultStrings['italicExample']});
  buttons.makeSpacer(1);  
  buttons.makeButton('link', defaultStrings['link'], '-40px');
  buttons.makeButton('quote', defaultStrings['quote'], '-60px');
  buttons.makeButton('code', defaultStrings['code'], '-80px');
  buttons.makeButton('image', defaultStrings['image'], '-100px');
  buttons.makeSpacer(2);
  buttons.makeButton('olist', defaultStrings['olist'], '-120px');
  buttons.makeButton('ulist', defaultStrings['ulist'], '-140px');
  buttons.makeButton('heading', defaultStrings['heading'], '-160px');
  buttons.makeButton('hr', defaultStrings['hr'], '-180px');
  buttons.makeSpacer(3);
  buttons.makeButton('undo', defaultStrings['undo'], '-200px');
  bindButtonToCommand(buttons.buttonElements.undo,
                      function() { editor.getSession().getUndoManager().undo(); })
  buttons.makeButton('redo', defaultStrings['redo'], '-220px');
  bindButtonToCommand(buttons.buttonElements.redo,
                      function() { editor.getSession().getUndoManager().redo(); })
  if (options.helpButton) {
    buttons.makeButton('help', defaultStrings['help'], '-240px');
    // extra attributes
    buttons.buttonElements.help.classList.add('wmd-help-button');
    buttons.buttonElements.help.style.right = '0px';
    bindButtonToCommand(buttons.buttonElements.help, options.helpButton);    
    // undo to button collection
    buttons.buttonElements.help.style.left = null;
    buttons.xPosition -= 25;
  }    
}

MarkdownAceEditor.prototype.getConverter = function() {
  return this.converter;
}

MarkdownAceEditor.prototype.run = function() {
  return this.hooks.onPreviewRefresh();
}

module.exports = MarkdownAceEditor;

function bindButtonToCommand(button, command,
                             options) {
  button.onclick = function() {
    if (this.onmouseout) {
      this.onmouseout();
    }
    if (options) return command.call(button, options);
    return command.call(button);
  };
}


function ButtonCollection(buttonBar) {
  this.idPostfix = buttonBar.id.match(/^wmd-button-bar(.*)/)[1];
  this.buttonBar = buttonBar;  
  this.normalYShift = '0px';
  this.disabledYShift = '-20px';
  this.highlightYShift = '-40px';
  this.buttonRow = document.createElement('ul');
  this.buttonRow.id = 'wmd-button-row' + this.idPostfix;
  this.buttonRow.className = 'wmd-button-row';
  this.buttonRow = this.buttonBar.appendChild(this.buttonRow);  
  this.xPosition = 0;
  this.buttonElements = {};
}

ButtonCollection.prototype.makeButton = function(id, title, XShift) {
  var button = document.createElement('li');
  button.className = 'wmd-button';
  button.style.left = this.xPosition + 'px';
  this.xPosition += 25;
  var buttonImage = document.createElement('span');
  button.id = 'wmd-' + id + '-button' + this.idPostfix;
  button.appendChild(buttonImage);
  button.title = title;
  button.XShift = XShift;
  // if (textOp) button.textOp = textOp;
  setupButton(button, true);
  this.buttonRow.appendChild(button);
  this.buttonElements[id] = button;
  return button;
}

ButtonCollection.prototype.makeSpacer = function(num) {
  var spacer = document.createElement('li');
  spacer.className = 'wmd-spacer wmd-spacer' + num;
  spacer.id = 'wmd-spacer' + num + this.idPostfix;
  this.buttonRow.appendChild(spacer);
  this.xPosition += 25;
}

function setupButton(button, isEnabled) {  
  var normalYShift = "0px";
  var disabledYShift = "-20px";
  var highlightYShift = "-40px";
  var image = button.getElementsByTagName("span")[0];
  if (isEnabled) {
    image.style.backgroundPosition = button.XShift + " " + normalYShift;
    button.onmouseover = function () {
      image.style.backgroundPosition = this.XShift + " " + highlightYShift;
    };
    button.onmouseout = function () {
      image.style.backgroundPosition = this.XShift + " " + normalYShift;
    };
  } else {
    image.style.backgroundPosition = button.XShift + " " + disabledYShift;
    button.onmouseover = button.onmouseout = button.onclick = function () { };
  }
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
  editor.getSession().setMode('ace/mode/markdown');
  editor.getSession().setUseWrapMode(true);
  editor.getSession().setWrapLimitRange(80, 80);
  // editor.renderer.setShowLineNumbers(false);
  editor.renderer.setShowInvisibles(true);
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
  
function fenceEditor(options) {
  var editor = options.editor;
  var session = editor.getSession();
  var fence = options.fence;
  var defaultString = options.defaultString;
  var selection = session.getSelection();
  var lastRange;
  selection.getAllRanges()
  .forEach(function(range, idx, ranges) {    
    var isEmpty = range.isEmpty();
    session.replace(range,
                    fenceString(isEmpty ? defaultString : session.getTextRange(range), 
                                fence));	
    if (idx === ranges.length - 1) lastRange = range;
  });  
  if (lastRange.isEmpty()) {
    editor.moveCursorTo(lastRange.end.row, 
                        lastRange.end.column + fence.length + defaultString.length);
    selection.addRange(new Range(lastRange.start.row, lastRange.start.column + fence.length,
                                 lastRange.end.row, 
                                 lastRange.end.column + defaultString.length + fence.length));
  } else {
    editor.moveCursorTo(lastRange.end.row, 
                        lastRange.end.column + 2*fence.length);
    editor.clearSelection();
  }
  editor.focus();

}

function fenceString(string, fence) {
  return fence + string + fence;
}
