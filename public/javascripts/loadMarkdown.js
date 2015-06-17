var markdown = require('../../lib/markdown');
var markdownEditor = require('./markdownEditor');
var hljs = require('highlight.js');
var pagedownExtra = require('../../lib/pagedownExtra');
var mathJax = require('../../lib/mathJax');
var editor;

(function() {
  var editorHelp = function() {
    alert('Do you need help?');
  }
  var makeEditor = document.getElementById('wmd-input') !== null;
  if (makeEditor) {
    editor = new markdownEditor(markdown.Converter, undefined,
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
    }
    document.head.appendChild(mathJaxCDN);
  }
  mathJaxConfigRequest.onerror = function(event) {
    console.error(this.statusText);
  }        
  hljs.initHighlightingOnLoad();
  mathJaxConfigRequest.send();  
})()