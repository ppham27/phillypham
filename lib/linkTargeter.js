var linkTargeter;

if (typeof window === 'undefined') {
  // check for node
  var cheerio = require('cheerio');
  linkTargeter = function(html) {
    var $ = cheerio.load(html);    
    $('a').each(function(idx, a) {
      var href = a.attribs.href;
      if (!a.attribs.target && (href === null ||
                                href === undefined ||
                                href[0] !== '#')) { 
        a.attribs.target = '_blank';
      }     
    });
    return $.html();
  };
} else {
  // we're in the browser, so we'll just use the dom
  linkTargeter = function(html) {
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
    return preview.innerHTML;
  }
}


module.exports.hookConverter = function(converter) {
  converter.hooks.chain('postConversion', linkTargeter);
}