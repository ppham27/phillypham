var markdown = require('../../lib/markdown');
var MarkdownAceEditor = require('./markdownAceEditor');
var hljs = require('highlight.js');
var pagedownExtra = require('../../lib/pagedownExtra');
var mathJax = require('../../lib/mathJax');
var editor;

var inputTitle = document.querySelector('.wmd-panel input[name="title"]');
var makeTitle = inputTitle !== null;
var makeEditor = document.querySelector('.wmd-input') !== null;
if (makeEditor) {
  editor = new MarkdownAceEditor(markdown.Converter, undefined,
                                 {helpButton: editorHelp});
  pagedownExtra.hookEditor(editor);
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
      mathJax.hookEditor(editor);
      editor.run();
    }
    if (makeTitle) {
      var previewTitle = document.getElementById('wmd-preview-title');
      inputTitle.addEventListener('input', function() {
        previewTitle.textContent = inputTitle.value;
      });
      inputTitle
      .addEventListener('input', mathJax.run);
      editor.editor.focus();
    }
  }
  document.head.appendChild(mathJaxCDN);
}
mathJaxConfigRequest.onerror = function(event) {
  console.error(this.statusText);
}        
hljs.initHighlightingOnLoad();
mathJaxConfigRequest.send();  

function editorHelp() {
  if (document.querySelector('.' + this.id + '.help-tip') !== null) {
    // remove if already there
    return false;
  } else {    
    var self = this;
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
