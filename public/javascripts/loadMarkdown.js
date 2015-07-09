var markdown = require('../../lib/markdown');
var MarkdownAceEditor = require('./markdownAceEditor');
var hljs = require('highlight.js');
var pagedownExtra = require('../../lib/pagedownExtra');
var mathJax = require('../../lib/mathJax');

var inputTitles = document.querySelectorAll('.wmd-input-title');
var editorDivs = document.querySelectorAll('.wmd-editor');
var makeTitle = inputTitles.length !== 0;
var makeEditor = editorDivs.length !== 0;
var editors;
if (makeEditor) {
  editorDivs = Array.prototype.slice.call(editorDivs);
  editors = editorDivs.map(function(div) {
              var postfix = div.id.substr(10); // get rid of wmd-editor
              var editor = new MarkdownAceEditor(markdown.Converter, postfix,
                                                 {helpButton: editorHelp });
              pagedownExtra.hookEditor(editor);
              return editor;
            });
}
var mathJaxConfig = document.createElement('script');
mathJaxConfig.type = 'text/x-mathjax-config';
var mathJaxCDN = document.createElement('script');
mathJaxCDN.src = "https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML";
var mathJaxConfigRequest = new XMLHttpRequest();
mathJaxConfigRequest.open('GET', '/javascripts/mathJaxConfig.js', true);
mathJaxConfigRequest.onload = function(event) {
  mathJaxConfig.textContent = this.responseText;
  document.head.appendChild(mathJaxConfig);
  mathJaxCDN.onload = function() {      
    mathJax.initialize(MathJax);
    if (makeEditor) {
      editors.forEach(function(editor) {
        mathJax.hookEditor(editor);
        editor.run();
      });
    }
    if (makeTitle) {
      inputTitles = Array.prototype.slice.call(inputTitles);
      inputTitles.forEach(function(inputTitle) {
        var postfix = inputTitle.id.substr(15);
        var previewTitles = document.querySelectorAll('.wmd-preview-title' + postfix);
        previewTitles = Array.prototype.slice.call(previewTitles);
        inputTitle.addEventListener('input', function() {          
          previewTitles.forEach(function(previewTitle) {
            previewTitle.textContent = inputTitle.value;
          });
        });
        inputTitle
        .addEventListener('input', mathJax.run);        
      });
      //editor.editor.focus();
    }
  }
  document.head.appendChild(mathJaxCDN);
}
mathJaxConfigRequest.onerror = function(event) {
  console.error(this.statusText);
}        
hljs.initHighlightingOnLoad();
mathJaxConfigRequest.send();  


function editorHelp(options) {
  var editor = options.editor;  // MarkdownAceEditor is passed as an option
  if (!editor) {
    console.error('Editor was not provided in options');
    return false;
  }
  if (document.querySelector('.' + this.id + '.help-tip') !== null) {
    // remove if already there
    return false;
  } else {    
    var self = this;            //this context is the button
    var helpTip = document.createElement('div');
    var buttonBoundingClientRect = self.getBoundingClientRect();
    helpTip.className = this.id + ' help-tip wmd-preview wmd-panel';
    helpTip.style.position = 'absolute';  
    var top = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    var left = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0;    
    var width = 305;  
    var height = 200;
    helpTip.style.width = width + 'px';
    helpTip.style.height = height + 'px';
    helpTip.style.left = (buttonBoundingClientRect.left - width + left - 20).toString() + 'px';
    helpTip.style.top = (buttonBoundingClientRect.top + top - height - 20).toString() + 'px';
    helpTip.innerHTML = require('./editorHelpHtml');
    helpTip.style.border = '1px solid #222';
    helpTip.style.padding = '15px';
    helpTip.style.borderRadius = '15px';
    helpTip.style.background = '#fefefe';
    helpTip.style.overflowY = 'scroll';
    helpTip.addEventListener('click', function(event) {
      event.stopPropagation();
    }, false);
    document.body.appendChild(helpTip); 
    setTimeout(function() {
      editor.hooks.onPreviewRefresh(editor); // to render math
      Array.prototype.slice.call(helpTip.querySelectorAll('pre code')).forEach(function(code) {
        hljs.highlightBlock(code);
      });      
      document.body.addEventListener('click', click, false);  
      function click() {
        document.body.removeChild(helpTip);
        document.body.removeEventListener('click', click);
      }  
    }, 0);
    return false;
  }
}


