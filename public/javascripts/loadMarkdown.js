(function() {
  var markdown = require('../../lib/markdown.js');
  var markdownEditor = require('./markdownEditor');
  var editor = new markdownEditor(markdown.Converter, undefined,
                                  {helpButton: {handler: editorHelp}});
  editor.run();
  function editorHelp() {
    alert('Do you need help?');
  }
  var mathJaxConfig = document.createElement('script');
  mathJaxConfig.type = 'text/x-mathjax-config';
  var mathJaxCDN = document.createElement('script');
  mathJaxCDN.src = "https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML";
  var mathJaxConfigRequest = new XMLHttpRequest();
  mathJaxConfigRequest.open('GET', 'javascripts/mathJaxConfig.js', true);
  mathJaxConfigRequest.onload = function(e) {
    mathJaxConfig.textContent = mathJaxConfigRequest.responseText;
    document.head.appendChild(mathJaxConfig);
    document.head.appendChild(mathJaxCDN);
  }
  mathJaxConfigRequest.onerror = function(e) {
    console.error(mathJaxConfigRequest.statusText);
  }      
  mathJaxConfigRequest.send();
})()