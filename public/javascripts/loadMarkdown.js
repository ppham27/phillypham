var markdown = require('../../lib/markdown');
// var MarkdownEditor = require('./markdownEditor');
var MarkdownAceEditor = require('./markdownAceEditor');
var hljs = require('highlight.js');
var pagedownExtra = require('../../lib/pagedownExtra');
var mathJax = require('../../lib/mathJax');
var editor;

(function() {
  var editorHelp = function() {
    alert('Do you need help?');
  }
  var makeTitle = document.getElementById('post-title') !== null;
  var makeEditor = document.getElementById('wmd-input') !== null;
  if (makeEditor) {
    editor = new MarkdownAceEditor(markdown.Converter, undefined,
                                   {helpButton: {handler: editorHelp}});
    pagedownExtra.hookEditor(editor);
  }
  var mathJaxConfig = document.createElement('script');
  mathJaxConfig.type = 'text/x-mathjax-config';
  var mathJaxCDN = document.createElement('script');
  mathJaxCDN.src = "https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML";
  var mathJaxConfigRequest = new XMLHttpRequest();
  mathJaxConfigRequest.open('GET', 'javascripts/mathJaxConfig.js', true);
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
        document.getElementById('post-title')
        .addEventListener('input', mathJax.run);
      }
    }
    document.head.appendChild(mathJaxCDN);
    var emacsStyle = document.createElement('style')
    emacsStyle.type = 'text/css';
    emacsStyle.textContent = '.emacs-mode .ace_cursor { border: 1px solid rgba(34, 34, 34, 0.8)!important; background-color: rgba(34, 34, 34, 0.9); }'
    document.head.appendChild(emacsStyle);
  }
  mathJaxConfigRequest.onerror = function(event) {
    console.error(this.statusText);
  }        
  hljs.initHighlightingOnLoad();
  mathJaxConfigRequest.send();  
})();