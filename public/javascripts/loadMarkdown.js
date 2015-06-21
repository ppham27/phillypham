var markdown = require('../../lib/markdown');
var MarkdownAceEditor = require('./markdownAceEditor');
var hljs = require('highlight.js');
var pagedownExtra = require('../../lib/pagedownExtra');
var mathJax = require('../../lib/mathJax');
var editor;

(function() {
  var makeTitle = document.querySelector('#post-form input[name="title"]') !== null;
  var makeEditor = document.getElementById('wmd-input') !== null;
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
        document.querySelector('#post-form input[name="title"]')
        .addEventListener('input', mathJax.run);
        editor.editor.focus();
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

function editorHelp() {
  var self = this;
  var helpTip = document.createElement('div');
  helpTip.className = 'help-tip';
  helpTip.innerHTML = 'Get help here';
  alert('TODO');
}

// (function() {
//   self = document.getElementById('wmd-help-button');
//   var width = 200;  
//   var helpTip = document.createElement('div');
//   helpTip.className = 'help-tip';
//   helpTip.innerHTML = '### H3 ### H3### H3 ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3  ### H3 ### H3### H3 ';
//   document.body.appendChild(helpTip);  
//   var buttonBoundingClientRect = self.getBoundingClientRect();
//   helpTip.style.position = 'absolute';  
//   helpTip.style.left = (buttonBoundingClientRect.left-width + document.body.scrollLeft).toString() + 'px';
//   helpTip.style.bottom = (buttonBoundingClientRect.top + document.body.scrollTop).toString() + 'px';
//   helpTip.style.width = width.toString() + 'px';
//   helpTip.style.border = '1px solid #222';
//   helpTip.style.backgroundColor = 'yellow';
  
//   self.addEventListener('click', function() {
//     document.body.removeChild(helpTip);
//   });
//   console.log(buttonBoundingClientRect);  
// })()





