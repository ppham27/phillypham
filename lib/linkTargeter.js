var linkTargeter;

if (typeof window === 'undefined') {
  // check for node
  var cheerio = require('cheerio');
  linkTargeter = function(state) {
    var html = state.text;
    var $ = cheerio.load(html);    
    $('a').each(function(idx, a) {
      var href = a.attribs.href;
      if (!a.attribs.target && (href === null ||
                                href === undefined ||
                                href[0] !== '#')) { 
        a.attribs.target = '_blank';
      }     
    });
    state.text = $.html();
    return state;
  };
} else {
  // we're in the browser, so we'll just use the dom
  linkTargeter = function(state) {
    var html = state.text;
    var preview = document.createElement('div');
    preview.innerHTML = html;
    var links = Array.prototype.slice.call(preview.getElementsByTagName('a'));
    links.forEach(function(a) {
      var href = a.getAttribute('href');
      if (!a.target && (href === null ||
                        href === undefined ||
                        href[0] !== '#')) {
        a.target = '_blank';
      }
    });
    state.text = preview.innerHTML;
    return state;
  }
}


module.exports.hookConverter = function(converter) {
  converter.hooks.chain('postConversion', linkTargeter);
}