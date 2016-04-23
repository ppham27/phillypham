/*
 * Basically a refactored version of the pagedown editor
 * that relys on the ACE editor undo manager and keybindings
 */

var Markdown = require('../../lib/markdown.js');
var cookie = require('cookie');

var Range = ace.require('ace/range').Range; // include ace beforehand

var keybindings = {'Ace': false,
                   'Emacs': 'ace/keyboard/emacs',
                   'Vim': 'ace/keyboard/vim'}

var modes = {'C/C++': 'ace/mode/c_cpp',
             'CSS': 'ace/mode/css',
             'HTML': 'ace/mode/html',
             'Javascript': 'ace/mode/javascript',
             'Java': 'ace/mode/java',
             'JSON': 'ace/mode/json',
             'LaTeX': 'ace/mode/latex',
             'Markdown': 'ace/mode/markdown',
             'Plain Text': 'ace/mode/plain_text',
             'Python': 'ace/mode/python',
             'R': 'ace/mode/r',
             'Ruby': 'ace/mode/ruby',
             'SQL': 'ace/mode/sql',
             'SVG': 'ace/mode/svg'}

// default options
var defaultAceOptions = {keybinding: 'Emacs', 
                         mode: 'Markdown',
                         autoPreview: true,
                         gutter: true,
                         lineNumbers: true,
                         highlightGutterLine: true,
                         highlightActiveLine: true,
                         invisibles: false,
                         indentGuides: true,
                         printMargin: false,
                         wrapMode: true,
                         syntaxChecker: false};
var aceSettingsFormOptions = {title: 'Ace Editor Settings',
                              width: 280, height: 480,
                              fields: [{name: 'gutter', label: 'Gutter', type: 'checkbox'},
                                       {name: 'lineNumbers', label: 'Line Numbers', type: 'checkbox'},
                                       {name: 'highlightGutterLine', label: 'Highlight Gutter Line', type: 'checkbox'},
                                       {name: 'highlightActiveLine', label: 'Highlight Active Line', type: 'checkbox'},
                                       {name: 'invisibles', label: 'Invisibles', type: 'checkbox'},
                                       {name: 'indentGuides', label: 'Indent Guides', type: 'checkbox'},
                                       {name: 'printMargin', label: 'Print Margin', type: 'checkbox'},
                                       {name: 'wrapMode', label: 'Wrap Mode', type: 'checkbox'},
                                       {name: 'syntaxChecker', label: 'Syntax Checker', type: 'checkbox'}],
                              description: 'Syntax checker only works in Javascript mode.' }

var defaultImageFormOptions = {title: 'Insert Image',
                               fields: [{name: 'image-url', label: 'Image URL', type: 'url'},
                                        {name: 'image-text', label: 'Text', type: 'text', 
                                         placeholder: 'text describing the image'}],
                               description: 'If you need somewhere to host your images, I recommend the Dropbox Public folder or <a href="http://imgur.com" target="_blank">Imgur</a>.'}

var defaultLinkFormOptions = {title: 'Insert Link',
                               fields: [{name: 'url', label: 'URL', type: 'url'},
                                        {name: 'text', label: 'Text', type: 'text',
                                         placeholder: 'text describing the link'}],
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
  settings: 'Ace Editor Settings',
  help: 'Markdown Editing Help'
};

function setEditorOptions(editor, options) {
  if (options.mode) editor.getSession().setMode(modes[options.mode]);
  if (options.keybinding) editor.setKeyboardHandler(keybindings[options.keybinding]);
  editor.renderer.setShowGutter(options.gutter);
  editor.renderer.$gutterLayer.setShowLineNumbers(options.lineNumbers);
  editor.renderer.setHighlightGutterLine(options.highlightGutterLine);  
  editor.setHighlightActiveLine(options.highlightActiveLine);
  editor.renderer.setShowInvisibles(options.invisibles);
  editor.renderer.setDisplayIndentGuides(options.indentGuides);
  editor.setShowPrintMargin(options.printMargin);
  editor.getSession().setUseWrapMode(options.wrapMode);
  editor.session.setOption("useWorker", options.syntaxChecker);
  // my preferred options, should change later for more customizability
  editor.setTheme('ace/theme/xcode');
  // this width applies to 785px at font size 100%?
  var width;
  if (!options.gutter) {
    width = 92;
  } else if (options.gutter && options.lineNumbers) {
    width = 87;
  } else if (options.gutter && !options.lineNumbers) {
    width = 89;
  }
  editor.getSession().setWrapLimitRange(width, width);
  editor.setPrintMarginColumn(width);
  return editor;
}

function createEditor(panels, options) {
  var editor = ace.edit(panels.editor.id);
  setEditorOptions(editor, options || defaultAceOptions);
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


// constructor
function MarkdownAceEditor(converter, idPostfix, options) {
  var self = this;
  this.converter = converter;  
  this.options = options;
  this.idPostfix = idPostfix || '';
  this.panels = new PanelCollection(this.idPostfix);
  this.aceOptions = readSettingsCookie();
  for (var key in defaultAceOptions) {
    if (!(key in this.aceOptions)) this.aceOptions[key] = defaultAceOptions[key];
  }
  this.editor = createEditor(this.panels, this.aceOptions);
  makeGrippie(this.panels.editor, this.editor); // grippie for adjustable size

  var aceOptions = this.aceOptions;
  var panels = this.panels;
  var editor = this.editor;
  var undoManager = editor.getSession().getUndoManager();

  var hooks = this.hooks = new Markdown.HookCollection();
  /* hooks on preview refresh are passed the MarkdownAceEditor
   * they should return editor, too
   * they should look like: function(editor) { // YOUR CODE HERE; return editor; }
   */
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
  var spacerNum = 0;
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
  buttons.makeSpacer(++spacerNum);  
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
  buttons.makeSpacer(++spacerNum);
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
  buttons.makeSpacer(++spacerNum);
  // for these two buttons bind commands later
  buttons.makeButton('undo', defaultStrings['undo'], '-200px');
  buttons.makeButton('redo', defaultStrings['redo'], '-220px');
  // ACE options
  buttons.makeSpacer(++spacerNum);
  buttons.makeButton('settings', defaultStrings['settings'], '-280px');  
  aceSettingsFormOptions.fields.forEach(function(field) { field.checked = aceOptions[field.name]; })
  bindButtonToCommand(buttons.buttonElements.settings,
                      dialogFormCommand,
                      {editor: editor, formOptions: aceSettingsFormOptions,
                       postProcess: function(settings) {
                         for (var key in settings) {
                           aceOptions[key] = settings[key];
                         }
                         // synchronize
                         aceSettingsFormOptions.fields.forEach(function(field) { field.checked = aceOptions[field.name]; })
                         setSettingsCookie(aceOptions);
                         editor.focus();
                         return settings; 
                       },
                       inserter: setEditorOptions});
  buttons.xPosition += 13;
  buttons.makeDropDown('keybinding', 'Keybinding: ', 165, false, '-15px',
                       keybindings, this.aceOptions.keybinding);
  buttons.buttonElements.keybinding.addEventListener('change',
                                                     changeDropDown.bind(buttons.buttonElements.keybinding,
                                                                         function(d) { editor.setKeyboardHandler(d); }));

  buttons.makeDropDown('mode', 'Mode: ', 165, true, '5px',
                       modes, this.aceOptions.mode);
  buttons.buttonElements.mode.addEventListener('change',
                                               changeDropDown.bind(buttons.buttonElements.mode,
                                                                   function(d) { editor.getSession().setMode(d); }));
  // auto-preview
  buttons.makeSpacer(++spacerNum);
  buttons.makeCheckBox('autopreview', 'Auto-Preview', this.aceOptions.autoPreview,
                       100, false, '-15px');
  buttons.buttonElements.autopreview.querySelector('input')
  .addEventListener('change', function(event) {
    aceOptions.autoPreview = event.srcElement.checked;
    setSettingsCookie(aceOptions);
    editor.focus();
  });  
  buttons.makeActionButton('preview', 'Preview', function(event) { 
    panels.preview.innerHTML = converter.makeHtml(editor.getValue());
    hooks.onPreviewRefresh(self);
    editor.focus();
  }, 100, true, '9px');

  if (options.helpButton) {
    buttons.makeButton('help', defaultStrings['help'], '-240px');
    // extra attributes
    buttons.buttonElements.help.classList.add('wmd-help-button');
    buttons.buttonElements.help.style.right = '0px';
    bindButtonToCommand(buttons.buttonElements.help, options.helpButton,
                        {editor: this});
    // undo to button collection
    buttons.buttonElements.help.style.left = null;
    buttons.xPosition -= 25;
  } 
     
  this.refreshState = function() {
    if (aceOptions.autoPreview) {
      panels.preview.innerHTML = converter.makeHtml(editor.getValue());
      hooks.onPreviewRefresh(self);
    }
    refreshButton(buttons.buttonElements.undo, 
                  undoManager.hasUndo.bind(undoManager),
                  undoManager.undo.bind(undoManager));
    // weird timing issue, I don't understand why I need to put this in a timeout block
    setTimeout(refreshButton, 0,
               buttons.buttonElements.redo,
               undoManager.hasRedo.bind(undoManager),
               undoManager.redo.bind(undoManager));
    function refreshButton(button, stateChecker, command) {
      if (stateChecker()) {
        setupButton(button, true);
        bindButtonToCommand(button, function() { 
          command(); 
          editor.focus();
        });
      } else {
        setupButton(button, false);
        button.onmouseover = button.onmouseout = button.onclick = function () { };
      }
    }
  }

  function changeDropDown(handler, event) {
    var id = this._id;
    var data = this._data;
    var select = this.querySelector('select');
    var value = select.options[select.selectedIndex].textContent;
    aceOptions[id] = value;
    setSettingsCookie(aceOptions);
    handler(data[value]);
    editor.focus();
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
  return spacer;
}


ButtonCollection.prototype.makeDropDown = function(id, title, width, shift, marginTop,
                                                   data, defaultSetting) {
  var dropDown = document.createElement('li');
  dropDown._id = id;
  dropDown._data = data;
  dropDown.style.marginTop = marginTop;
  dropDown.style.left = this.xPosition + 'px';
  if (shift) this.xPosition += width;
  dropDown.className = 'wmd-select ' + id; 
  var fieldset = dropDown.appendChild(document.createElement('fieldset'));
  var label = fieldset.appendChild(document.createElement('label'));
  var select = fieldset.appendChild(document.createElement('select'));
  select.id = 'wmd-' + id + '-select' + this.idPostfix;
  label.textContent = title; label.htmlFor = select.id;
  for (var key in data) {
    var option = document.createElement('option');
    option.value = data[key];
    if (key === defaultSetting) option.selected = true;
    option.textContent = key;
    select.appendChild(option);
  }
  this.buttonRow.appendChild(dropDown);
  this.buttonElements[id] = dropDown;
  return dropDown;
}

ButtonCollection.prototype.makeCheckBox = function(id, labelText, checked, 
                                                   width, shift, marginTop) {
  var checkBox = document.createElement("li");  
  checkBox.style.left = this.xPosition + 'px';
  if (shift) this.xPosition += width;
  checkBox.style.marginTop = marginTop;
  checkBox.className = 'wmd-checkbox ' + id;
  var fieldset = checkBox.appendChild(document.createElement('fieldset'));
  var label = fieldset.appendChild(document.createElement('label'));
  var input = fieldset.appendChild(document.createElement('input'));
  input.type = 'checkbox'; input.checked = checked;
  input.id = 'wmd-' + id + '-checkbox' + this.idPostfix;
  label.textContent = labelText; label.htmlFor = input.id;
  this.buttonRow.appendChild(checkBox);
  this.buttonElements[id] = checkBox;
  return checkBox;
}

ButtonCollection.prototype.makeActionButton = function(id, buttonText, action, 
                                                       width, shift, marginTop) {
  var buttonLi = document.createElement("li");  
  buttonLi.style.left = this.xPosition + 'px';
  if (shift) this.xPosition += width;
  buttonLi.style.marginTop = marginTop;
  buttonLi.className = 'wmd-action-button ' + id;
  var button = buttonLi.appendChild(document.createElement('button'));
  button.type = 'button';
  button.textContent = buttonText;
  button.addEventListener('click', action);
  this.buttonRow.appendChild(buttonLi);
  this.buttonElements[id] = buttonLi;;
  return buttonLi;
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
  return false;
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
  return false;
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

function replaceCurrentRangeEditor(editor, string) {
  var session = editor.getSession();
  var selection = editor.getSelection();
  var range = editor.getSelectionRange();
  session.replace(range, string);
  editor.findPrevious('](');
  var to = editor.getCursorPosition();
  editor.findPrevious('[');
  var from = editor.getCursorPosition();    
  editor.navigateTo(from.row, from.column);
  selection.selectTo(to.row, to.column - 2)
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
                     inserter(editor, processedData);
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
      switch(input.type) {
        case 'text':
        formData[input.name] = input.value;
        break;
        case 'checkbox':
        formData[input.name] = input.checked;
        break;        
      }
    });
    destroyDialogForm();
    callback(formData);
    return false;
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
  form.onreset = destroyDialogForm;
  form.onsubmit = submit;
  overlay.addEventListener('click', function(event) {
    destroyDialogForm();
  });    
  document.body.addEventListener('keydown', keydown);
  form.getElementsByTagName('input')[0].focus();
}

function createForm(options) {
  var form = document.createElement('form');
  form.className = 'editor-dialog-box';
  form.style.width = options.width ? options.width + 'px' : '400px';
  form.style.height = options.height ? options.height + 'px' : '250px';
  form.style.position = 'fixed';
  form.style.left = '50%'
  form.style.top = '50%'
  form.style.marginLeft = options.width ? (-options.width/2) + 'px' : '-200px';
  form.style.marginTop = options.height ? (-options.height/2 - 50) + 'px' : '-175px';
  form.style.zIndex = 10000000;
  var title = document.createElement('h2');
  title.textContent = options.title;  
  form.appendChild(title);
  options.fields.forEach(function(field, idx) {
    var fieldset = document.createElement('fieldset');
    var label = document.createElement('label');
    label.textContent = field.label + ': ';
    label.htmlFor = field.name;
    var input = document.createElement('input')
    input.name = field.name;
    switch(field.type) {
      case 'url':
      input.type = 'text';  
      input.className = 'text';
      input.value = 'http://';
      if (field.placeholder) input.placeholder = field.placeholder;
      break;
      case 'text':
      input.type = 'text';  
      input.className = 'text';
      if (field.placeholder) input.placeholder = field.placeholder;
      break;
      case 'checkbox':
      input.type = 'checkbox';
      input.className = 'checkbox';
      if (field.checked) input.checked = true;
      break;
    }       
    fieldset.appendChild(label);
    fieldset.appendChild(input);
    form.appendChild(fieldset);    
  });
  if (options.description) {
    var description = document.createElement('p');
    description.innerHTML = options.description;
    form.appendChild(description);
  }
  var buttons = document.createElement('div');
  buttons.className = 'button-box';
  var cancelButton = document.createElement('button');
  cancelButton.type = 'reset';
  cancelButton.textContent = 'Cancel';
  var submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = 'Submit';
  buttons.appendChild(cancelButton);
  buttons.appendChild(submitButton);
  form.appendChild(buttons);
  return form;
}

function setSettingsCookie(options) {
  document.cookie = "markdownAceEditorSettings=" + JSON.stringify(options);
  return options;
}

function readSettingsCookie() {
  var parsedCookie = cookie.parse(document.cookie);
  return parsedCookie.markdownAceEditorSettings ? JSON.parse(parsedCookie.markdownAceEditorSettings) : {};
}

function makeGrippie(editorDiv, editor) {
  var grippie = document.createElement('div');
  grippie.classList.add('wmd-editor-grippie'); 
  grippie.style.width = window.getComputedStyle(editorDiv).getPropertyValue('width');
  grippie.style.height = '12px';
  grippie.style.borderRight = '1px solid #ddd';
  grippie.style.borderLeft = '1px solid #ddd';
  grippie.style.borderBottom = '1px solid #ddd';
  grippie.style.borderBottomLeftRadius = '5px';
  grippie.style.borderBottomRightRadius = '5px';
  grippie.style.cursor = 'ns-resize';
  grippie.style.backgroundColor = '#eee';
  grippie.style.textAlign = 'center';
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttributeNS(null, 'width', 26);
  svg.setAttributeNS(null, 'height', 11);
  for (var i = 0; i < 5; ++i) {
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttributeNS(null, 'x', i*6);
    rect.setAttributeNS(null, 'y', 0);
    rect.setAttributeNS(null, 'width', 2);
    rect.setAttributeNS(null, 'height', 2);
    rect.style.fill = '#9E9E9E';
    svg.appendChild(rect);    
  }
  for (var i = 0; i < 4; ++i) {
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttributeNS(null, 'x', i*6 + 3);
    rect.setAttributeNS(null, 'y', 3);
    rect.setAttributeNS(null, 'width', 2);
    rect.setAttributeNS(null, 'height', 2);
    rect.style.fill = '#9E9E9E';
    svg.appendChild(rect);    
  }  
  grippie.appendChild(svg);
  grippie.addEventListener('mousedown', function(event) {    
    var baseY = parseInt(window.getComputedStyle(editorDiv).getPropertyValue('height'));    
    document.addEventListener('mouseup', mouseup, true);
    document.addEventListener('mousemove', mousemove, true);
    var startY = event.clientY; 
    function mousemove(event) {
      editorDiv.style.height = Math.max(20, (baseY + (event.clientY - startY))) + 'px';
      editor.resize();
      event.preventDefault();
      event.stopPropagation();
    }
    function mouseup(event) {      
      editor.resize();
      document.removeEventListener('mousemove', mousemove, true);
      document.removeEventListener('mouseup', mouseup, true);
      event.preventDefault();
      event.stopPropagation();      
    }
    event.preventDefault();
    event.stopPropagation();
  }, false);
  if (editorDiv.nextSibling !== null) {
    editorDiv.parentNode.insertBefore(grippie, editorDiv.nextSibling);
  } else {
    editorDiv.parentNode.appendChild(grippie);
  }
}