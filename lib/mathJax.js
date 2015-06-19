
// code heavily influenced by StackEdit: https://github.com/benweet/stackedit/blob/master/public/res/extensions/mathJax.js
// which is in turn influenced by math.stackexchange

var mathJax = {};

// globals
var ready = false;
var pending = false;
var preview = null;
var inline = '$';
var blocks, start, end, last, braces, math;
var HUB;

var splitDelimiter = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[\\{}$]|[{}]|(?:\n\s*)+|@@\d+@@)/i;


mathJax.hookConverter = function(converter) {
  converter.hooks.chain('preConversion', removeMath);
  converter.hooks.chain('postConversion', replaceMath);
}

mathJax.hookEditor = function(editor) {
  editor.hooks.chain('onPreviewRefresh', updateMathJax);
}

// From math.stackexchange.com...

//
//  The math is in blocks i through j, so
//    collect it into one block and clear the others.
//  Replace &, <, and > by named entities.
//  For IE, put <br> at the ends of comments since IE removes \n.
//  Clear the current math positions and store the index of the
//    math, then push the math string onto the storage array.
//
function processMath(i, j, unescape) {
  var block = blocks.slice(i, j + 1).join('')
			  .replace(/&/g, '&amp;')
			  .replace(/</g, '&lt;')
			  .replace(/>/g, '&gt;');
  // remove support for internet explorer
  for(; j > i; --j) blocks[j] = '';
  blocks[i] = '@@' + math.length + '@@';
  unescape && (block = unescape(block));
  math.push(block);
  start = end = last = null;
}


function removeMath(text) {
  start = end = last = null;
  math = [];
  var unescape;
  if(/`/.test(text)) {
	text = text.replace(/~/g, '~T').replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, function(text) {
			 return text.replace(/\$/g, '~D');
		   });
	unescape = function(text) {
	  return text.replace(/~([TD])/g,
					      function(match, n) {
						    return {T: '~', D: '$'}[n];
					      });
	};
  } else {
	unescape = function(text) {
	  return text;
	};
  }
  blocks = split(text.replace(/\r\n?/g, '\n'), splitDelimiter);
  for(var i = 1, m = blocks.length; i < m; i += 2) {
	var block = blocks[i];
	if('@' === block.charAt(0)) {
	  //
	  //  Things that look like our math markers will get
	  //  stored and then retrieved along with the math.
	  //
	  blocks[i] = '@@' + math.length + '@@';
	  math.push(block)
	} else if(start) {
	  // Ignore inline maths that are actually multiline (fixes #136)
	  if(end == inline && block.charAt(0) == '\n') {
		if(last) {
		  i = last;
		  processMath(start, i, unescape);
		}
		start = end = last = null;
		braces = 0;
	  }
	  //
	  //  If we are in math, look for the end delimiter,
	  //    but don't go past double line breaks, and
	  //    and balance braces within the math.
	  //
	  else if(block === end) {
		if(braces) {
		  last = i
		} else {
		  processMath(start, i, unescape)
		}
	  } else {
		if(block.match(/\n.*\n/)) {
		  if(last) {
			i = last;
			processMath(start, i, unescape);
		  }
		  start = end = last = null;
		  braces = 0;
		} else {
		  if('{' === block) {
			braces++
		  } else {
			'}' === block && braces && braces--
		  }
		}
	  }
	} else {
	  if(block === inline || '$$' === block) {
		start = i;
		end = block;
		braces = 0;
	  } else {
		if('begin' === block.substr(1, 5)) {
		  start = i;
		  end = '\\end' + block.substr(6);
		  braces = 0;
		}
	  }
	}

  }
  last && processMath(start, last, unescape);
  return unescape(blocks.join(''));
}

//
//  Put back the math strings that were saved,
//    and clear the math array (no need to keep it around).
//
function replaceMath(text) {
  text = text.replace(/@@(\d+)@@/g, function(match, n) {
		   return math[n];
		 });
  math = null;
  return text;
}

function split(text, delimiter) { return text.split(delimiter); };;

// now the code below is client-side stuff

//
//  This is run to restart MathJax after it has finished
//    the previous run (that may have been canceled)
//
function restartMathJax() {
  pending = false;
  HUB.cancelTypeset = false;
  HUB.Queue([
	'Typeset',
	HUB,
	preview
  ]);
}

//
//  When the preview changes, cancel MathJax and restart,
//    if we haven't done that already.
//
function updateMathJax() {
  if(!pending) {
	pending = true;
	HUB.Cancel();
	HUB.Queue(restartMathJax);
  }
}

mathJax.initialize = function(MathJax) {
  HUB = MathJax.Hub;
  if(!HUB.Cancel) {
	HUB.cancelTypeset = !1;
	HUB.Register.StartupHook("HTML-CSS Jax Config", function() {
	  var HTMLCSS = MathJax.OutputJax["HTML-CSS"], TRANSLATE = HTMLCSS.Translate;
	  HTMLCSS.Augment({Translate: function(script, state) {
					     if(HUB.cancelTypeset || state.cancelled)
						   throw Error("MathJax Canceled");
					     return TRANSLATE.call(HTMLCSS, script, state)
				       }})
	});
	HUB.Register.StartupHook("SVG Jax Config", function() {
	  var SVG = MathJax.OutputJax.SVG, TRANSLATE = SVG.Translate;
	  SVG.Augment({Translate: function(script, state) {
					 if(HUB.cancelTypeset || state.cancelled)
					   throw Error("MathJax Canceled");
					 return TRANSLATE.call(SVG,
						                   script, state)
				   }})
	});
	HUB.Register.StartupHook("TeX Jax Config", function() {
	  var TEX = MathJax.InputJax.TeX, TRANSLATE = TEX.Translate;
	  TEX.Augment({Translate: function(script, state) {
					 if(HUB.cancelTypeset || state.cancelled)
					   throw Error("MathJax Canceled");
					 return TRANSLATE.call(TEX, script, state)
				   }});
	});
	var PROCESSERROR = HUB.processError;
	HUB.processError = function(error, state, type) {
	  if("MathJax Canceled" !== error.message)
		return PROCESSERROR.call(HUB, error, state, type);
	  MathJax.Message.Clear(0, 0);
	  state.jaxIDs = [];
	  state.jax = {};
	  state.scripts = [];
	  state.i = state.j = 0;
	  state.cancelled = true;
	  return null
	};
	HUB.Cancel = function() {
	  this.cancelTypeset = true
	}
  }
}

mathJax.run = updateMathJax;

module.exports = mathJax;