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

// default options

var defaultImageFormOptions = {title: 'Insert Image',
                               fields: [{name: 'image-url', label: 'Image URL', type: 'url'},
                                        {name: 'image-text', label: 'Text', placeholder: 'text describing the image'}],
                               description: 'If you need somewhere to host your images, I recommend the Dropbox Public folder or <a href="http://imgur.com" target="_blank">Imgur</a>.'}

var defaultLinkFormOptions = {title: 'Insert Link',
                               fields: [{name: 'url', label: 'URL', type: 'url'},
                                        {name: 'text', label: 'Text', placeholder: 'text describing the link'}],
                               description: 'The URL is the address of the website. The text is what others will see in your document.'}

var defaultStrings = {
  bold: 'Strong <strong>',
  boldExample: "strong text",
  italic: 'Emphasis <em>',
  italicExample: 'emphasized text',
  link: 'Hyperlink <a>',
  linkDescription: 'enter link description here',
  quote: 'Blockquote <blockquote>',
  quoteExample: 'Blockquote',
  code: 'Code Sample <pre><code>',
  codeExample: 'enter code here',
  image: 'Image <img>',
  imageDescription: 'enter image description here',
  olist: 'Numbered List <ol>',
  ulist: 'Bulleted List <ul>',
  litem: 'List item',
  heading: 'Heading <h1> to <h6>',
  headingExample: 'Heading',
  hr: 'Horizontal Rule <hr>',
  undo: 'Undo',
  redo: 'Redo',
  help: 'Markdown Editing Help'
};

function createEditor(panels) {
  var editor = ace.edit(panels.editor.id);
  // my preferred options, should change later for more customizability
  editor.setTheme('ace/theme/xcode');
  editor.getSession().setMode('ace/mode/markdown');
  editor.getSession().setUseWrapMode(true);
  editor.getSession().setWrapLimitRange(80, 80);
  editor.setPrintMarginColumn(80);
  // editor.renderer.$gutterLayer.setShowLineNumbers(false);
  editor.renderer.setShowGutter(false);
  editor.renderer.setShowInvisibles(true);
  editor.renderer.setDisplayIndentGuides(true);
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
  /* called with one parameter: a callback to be called with the URL of the image. 
   * If the application creates
   * its own image insertion dialog, this hook should return true, 
   * and the callback should be called with the chosen
   * image url (or null if the user cancelled). 
   * If this hook returns false, the default dialog will be used.
   */
  // hooks.addFalse("insertImageDialog"); TODO: currently doesn't do anything
  
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
  bindButtonToCommand(buttons.buttonElements.link,
                      dialogFormCommand,
                      {editor: editor, formOptions: defaultLinkFormOptions,
                       postProcess: createMarkdownLink,
                       inserter: replaceCurrentRangeEditor});
  buttons.makeButton('quote', defaultStrings['quote'], '-60px');
  bindButtonToCommand(buttons.buttonElements.quote,
                      toggleIndentEditor,
                      {editor: editor,
                       indent: '>', defaultString: defaultStrings['quoteExample']});
  buttons.makeButton('code', defaultStrings['code'], '-80px');
  bindButtonToCommand(buttons.buttonElements.code,
                      toggleIndentEditor,
                      {editor: editor,
                       indent: '    ', defaultString: defaultStrings['codeExample']});
  buttons.makeButton('image', defaultStrings['image'], '-100px');
  bindButtonToCommand(buttons.buttonElements.image,
                      dialogFormCommand,
                      {editor: editor, formOptions: defaultImageFormOptions,
                       postProcess: createMarkdownImageLink,
                       inserter: replaceCurrentRangeEditor});
  buttons.makeSpacer(2);
  buttons.makeButton('olist', defaultStrings['olist'], '-120px');
  bindButtonToCommand(buttons.buttonElements.olist,
                      toggleIndentEditor,
                      {editor: editor,
                       indent: ':olist', defaultString: defaultStrings['litem']});
  buttons.makeButton('ulist', defaultStrings['ulist'], '-140px');
  bindButtonToCommand(buttons.buttonElements.ulist,
                      toggleIndentEditor,
                      {editor: editor,
                       indent: ':ulist', defaultString: defaultStrings['litem']});
  buttons.makeButton('heading', defaultStrings['heading'], '-160px');
  bindButtonToCommand(buttons.buttonElements.heading,
                      toggleIndentEditor,
                      {editor: editor,
                       indent: '#', defaultString: defaultStrings['headingExample']});
  buttons.makeButton('hr', defaultStrings['hr'], '-180px');
  bindButtonToCommand(buttons.buttonElements.hr,
                      ruleInsertEditor,
                      {editor: editor, rule: '----------'});
  buttons.makeSpacer(3);
  // for these two buttons bind commands later
  buttons.makeButton('undo', defaultStrings['undo'], '-200px');
  buttons.makeButton('redo', defaultStrings['redo'], '-220px');

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
     
  this.refreshState = function() {
    panels.preview.innerHTML = converter.makeHtml(editor.getValue());
    // make links open in a new tab, perhabs better addressed with a plugin
    Array.prototype.slice.call(panels.preview.getElementsByTagName('a'))
    .forEach(function(a) {
      if (!a.target) a.target = '_blank';
    });
    
    if (editor.getSession().getUndoManager().hasUndo()) {
      setupButton(buttons.buttonElements.undo, 
                  true);
      bindButtonToCommand(buttons.buttonElements.undo,
                          function() { 
                            editor.getSession().getUndoManager().undo(); 
                            editor.focus();
                          })
    } else {
      setupButton(buttons.buttonElements.undo, false);
      buttons.buttonElements.undo.onmouseover = 
        buttons.buttonElements.undo.onmouseout = 
        buttons.buttonElements.undo.onclick = function () { };
    }
    // weird timing issue, i don't understand why i need to put this in a timeout block
    setTimeout(function() {
      if (editor.getSession().getUndoManager().hasRedo()) {
        setupButton(buttons.buttonElements.redo, true);
        bindButtonToCommand(buttons.buttonElements.redo,
                            function() { 
                              editor.getSession().getUndoManager().redo(); 
                              editor.focus();
                            })
      } else {
        setupButton(buttons.buttonElements.redo, 
                    false);
        buttons.buttonElements.redo.onmouseover = 
          buttons.buttonElements.redo.onmouseout = 
          buttons.buttonElements.redo.onclick = function () { };
      }
    }, 0);
    hooks.onPreviewRefresh();
  }
}

MarkdownAceEditor.prototype.getConverter = function() {
  return this.converter;
}

MarkdownAceEditor.prototype.run = function() {  
  this.editor.on('change', this.refreshState);
  return this.refreshState();
}

module.exports = MarkdownAceEditor;


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
  }
}

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


function PanelCollection(idPostfix) {
  this.input = document.getElementById('wmd-input' + idPostfix);
  this.preview = document.getElementById('wmd-preview' + idPostfix);
  this.buttonBar = document.getElementById('wmd-button-bar' + idPostfix);
  this.editor = document.getElementById('wmd-editor' + idPostfix);
}

// functions that act on the editor, these are linked to buttons

function fenceEditor(options) {
  var editor = options.editor;
  var session = editor.getSession();
  var fence = options.fence;
  var defaultString = options.defaultString;
  var selection = session.getSelection();
  var ranges = selection.getAllRanges();
  ranges.forEach(function(range) {    
    session.replace(range,
                    fenceString(range.isEmpty() ? defaultString : session.getTextRange(range), 
                                fence));
  });  
  if (ranges.length === 1 && ranges[0].isEmpty()) {
    var range = ranges[0];
    editor.clearSelection();
    editor.moveCursorTo(range.end.row, 
                        range.end.column + fence.length + defaultString.length);
    selection.addRange(new Range(range.start.row, range.start.column + fence.length,
                                 range.end.row, 
                                 range.end.column + defaultString.length + fence.length));
  } else {
    editor.navigateFileEnd();
  }
  editor.focus();
}

function fenceString(string, fence) {
  return fence + string + fence;
}


function toggleIndentEditor(options) {
  var editor = options.editor;
  var session = editor.getSession();
  var indent = options.indent;
  var defaultString = options.defaultString;
  var selection = session.getSelection();
  var ranges = selection.getAllRanges();
  var pre = '';
  var post = '';
  ranges.forEach(function(range) {
    if (range.start.column !== 0) pre += '\n\n';
    if (range.end.column < session.getLine(range.end.row).length - 1) post += '\n\n';    
    var newString = toggleIndentString(range.isEmpty() ? defaultString : session.getTextRange(range), 
                                       indent);
    session.replace(range,
                    pre + newString + post);
  });
  if (post !== '') editor.navigateUp(2); editor.navigateLineEnd();
  if (indent === '#' && ranges.length === 1 && ranges[0].start.row === ranges[0].end.row) {    
    editor.navigateLineStart();        
    selection.selectLineEnd();        
  } else if (ranges.length === 1 && ranges[0].isEmpty()) {        
    var cursor = editor.getCursorPosition();
    selection.addRange(new Range(cursor.row, cursor.column - defaultString.length,
                                 cursor.row, cursor.column));  
  } else {
    if (editor.setEmacsMark) editor.setEmacsMark(null)
    editor.navigateFileEnd();
  }
  editor.focus();
}

function toggleIndentString(string, indent) {
  var splitString = string.split('\n');
  var indentedSplitString;
  switch(indent) {
    case '>':
    indentedSplitString = blockQuoteIndent(splitString, indent);    
    break;
    case '    ':
    indentedSplitString = codeIndent(splitString, indent);
    break;
    case '#': 
    indentedSplitString = headingIndent(splitString, indent);
    break;
    case ':olist': 
    indentedSplitString = oListIndent(splitString, indent);
    break;
    case ':ulist': 
    indentedSplitString = uListIndent(splitString, indent);
    break;
  }  
  return indentedSplitString.join('\n');
}

function uListIndent(splitString, indent) {
  var alreadyIndented = splitString.every(function(string, idx) {
                          return string.indexOf('- ') === 0;
                        });
  var indentedSplitString = splitString.map(function(string, idx) {
                              var prefix = '- ';
                              return alreadyIndented ? string.slice(prefix.length) : prefix + string;
                            });
  return indentedSplitString;  
}

function oListIndent(splitString, indent) {
  var alreadyIndented = splitString.every(function(string, idx) {
                          return string.indexOf((idx + 1).toString() + '. ') === 0;
                        });
  var indentedSplitString = splitString.map(function(string, idx) {
                              var prefix = (idx + 1).toString() + '. ';
                              return alreadyIndented ? string.slice(prefix.length) : prefix + string;
                            });
  return indentedSplitString;  
}

function headingIndent(splitString, indent) {
  var indentedSplitString = splitString.map(function(string) {
                              var match = string.match(/^(#{0,6}) ?(.*)/);
                              if (match[1].length === 6) {
                                return match[2];
                              } else {
                                return match[1] + '# ' + match[2];
                              }
                            });
  return indentedSplitString;
}

function codeIndent(splitString, indent) {
  var indented = splitString.map(function(string) {
                   return /^[ ]{4}/.test(string) || /^\t/.test(string); 
                 });
  var decrement = indented[0] && indented.every(function(i) { return i; });
  var indentedSplitString = splitString.map(function(string) {
                              if (decrement) {
                                if (/^[ ]{4}/.test(string)) {
                                  return string.slice(4);
                                } else if (/^\t/.test(string)) {
                                  return string.slice(1);
                                } else {
                                  return string;
                                }
                              } else {
                                return indent + string;
                              }
                            });
  return indentedSplitString;
}

function blockQuoteIndent(splitString, indent) {
  var indentLevels = splitString.map(function(string) {
                       var indentLevel = 0;
                       var cursor = string.indexOf(indent);
                       // count indent symbol while avoiding code blocks
                       while (cursor !== -1 && cursor < 4 &&
                              /^[ ]{0,3}$/.test(string.substring(0, cursor))) {
                         indentLevel += 1;
                         string = string.slice(cursor + 1);
                         cursor = string.indexOf(indent);
                       }
                       return indentLevel;
                     });
  var firstLineIndentLevel = indentLevels[0];
  var allEqual = indentLevels.every(function(indentLevel) { 
                   return indentLevel === firstLineIndentLevel; 
                 });
  // determine indent behavior
  var increment = allEqual && firstLineIndentLevel === 0;
  var indentedSplitString = splitString.map(function(string, idx) {
                              if (increment) {                                
                                return indentLevels[idx] === 0  ? 
                                  indent + ' ' + string : 
                                  indent + string;
                              } else {
                                if (indentLevels[idx] !== 0) {
                                  string = string.slice(string.indexOf(indent) + 1);
                                  var spaces = string.match(/^[ ]*/)[0].length % 4;
                                  return spaces > 0 ? string.slice(1) : string;
                                } else {
                                  return string;
                                }
                              }
                            });
  return indentedSplitString;
}

function ruleInsertEditor(options) {
  var editor = options.editor;
  var rule = options.rule;
  var session = editor.getSession();
  var selection = session.getSelection();
  var ranges = selection.getAllRanges();  
  var pre = '\n';
  var post = '\n\n';
  ranges.forEach(function(range) {
    if (range.start.column !== 0) pre += '\n';    
    if (/^\s*$/.test(session.getLine(range.end.row).slice(range.end.column))
      && range.end.row !== session.getLength() - 1) {
      post = '\n';
    }
    session.replace(range, pre + rule + post);
  });
  editor.navigateFileEnd();
  editor.focus();  
}

function replaceCurrentRangeEditor(string, editor) {
  var session = editor.getSession();
  var selection = editor.getSelection();
  var range = editor.getSelectionRange();
  session.replace(range, string);
  editor.findPrevious(']');
  var to = editor.getCursorPosition();
  editor.findPrevious('[');
  var from = editor.getCursorPosition();    
  editor.navigateTo(from.row, from.column);
  selection.selectTo(to.row, to.column - 1)
  editor.focus();
}

function createMarkdownImageLink(data) {
  var url = data['image-url'].trim();
  url = !url || url === 'http://' ? 'enter url to image here' : url;
  var text = data['image-text'].trim() || defaultStrings['imageDescription'];
  return '![' + text + '](' + url + ')';  
}

function createMarkdownLink(data) {
  var url = data['url'].trim();
  url = !url || url === 'http://' ? 'enter url to website here' : url;
  var text = data['text'].trim() || defaultStrings['linkDescription'];
  return '[' + text + '](' + url + ')';  
}


// various functions to get data from user with a dialog box

function dialogFormCommand(options) {
  var formOptions = options.formOptions;
  var postProcess = options.postProcess;
  var editor = options.editor;
  var inserter = options.inserter;  
  editor.blur();
  createDialogForm(formOptions,
                   function(formData) {
                     var processedData = postProcess(formData);
                     inserter(processedData, editor);
                   });
}



function createDialogForm(formOptions, callback) {
  var destroyDialogForm = function() {
    document.body.removeChild(overlay);    
    document.body.removeEventListener('keydown', keydown);
  };
  var keydown = function(event) {
    switch(event.keyCode) {
      case 27:                  // esc
      destroyDialogForm();
      break;
      case 13:                  // enter
      submit();
      event.preventDefault();
      break;
    }
  };
  var submit = function() {
    var inputs = Array.prototype.slice.call(form.getElementsByTagName('input'));
    var formData = {};
    inputs.forEach(function(input) {
      formData[input.name] = input.value;
    });
    destroyDialogForm();
    callback(formData);    
  };
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.3)';
  overlay.style.height = document.body.scrollHeight + 'px';
  overlay.style.width = document.body.scrollWidth + 'px';
  overlay.style.display = 'block';
  overlay.style.zIndex = 1000000;
  document.body.appendChild(overlay);
  var form = createForm(formOptions);  
  form.addEventListener('click', function(event) {
    event.stopPropagation();   
  }, false);  
  overlay.appendChild(form);
  form.cancelButton.onclick = destroyDialogForm;
  form.submitButton.onclick = submit;
  overlay.addEventListener('click', function() {
    destroyDialogForm();
  });    
  document.body.addEventListener('keydown', keydown);
  form.getElementsByTagName('input')[0].focus();
}

function createForm(options) {
  var form = document.createElement('div');
  form.className = 'editor-dialog-box';
  form.style.width = '400px';
  form.style.height = '250px';
  form.style.position = 'fixed';
  form.style.left = '50%'
  form.style.top = '50%'
  form.style.marginLeft = '-200px';
  form.style.marginTop = '-175px';
  form.draggable = true;
  form.style.zIndex = 10000000;
  var title = document.createElement('h2');
  title.textContent = options.title;  
  form.appendChild(title);
  options.fields.forEach(function(field, idx) {
    var fieldset = document.createElement('fieldset');
    var label = document.createElement('label');
    label.textContent = field.label + ': ';
    label.for = field.name;
    var input = document.createElement('input')
    input.type = 'text';
    input.name = field.name;
    if (field.type === 'url') input.value = 'http://';
    if (field.placeholder) input.placeholder = field.placeholder;
    fieldset.appendChild(label);
    fieldset.appendChild(input);
    form.appendChild(fieldset);    
  });
  var description = document.createElement('p');
  description.innerHTML = options.description;
  form.appendChild(description);
  var buttons = document.createElement('div');
  buttons.className = 'button-box';
  form.cancelButton = document.createElement('button');
  form.cancelButton.textContent = 'Cancel';
  form.submitButton = document.createElement('button');
  form.submitButton.textContent = 'Submit';
  buttons.appendChild(form.cancelButton);
  buttons.appendChild(form.submitButton);
  form.appendChild(buttons);
  return form;
}