var cheerio = require('cheerio');
module.exports.hookConverter = function(converter) {
  converter.hooks.chain('postConversion', function(html) {
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
  });  
}