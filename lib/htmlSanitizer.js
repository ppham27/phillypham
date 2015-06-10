var sanitizeHtml = require('sanitize-html');

var htmlSanitizer = {};

htmlSanitizer.hookConverter = function(converter) {
  converter.hooks.chain('postConversion', sanitizeHtmlCustomized); 
}

function sanitizeHtmlCustomized(html) {
  var options = {
    allowedTags: [ 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div', 'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img' ],
    allowedAttributes: {
      a: [ 'href', 'name', 'target' ],
      // We don't currently allow img itself by default, but this
      // would make sense if we did
      img: [ 'src' , 'width', 'height']
    },
    // Lots of these won't come up by default because we don't allow them
    selfClosing: [ 'img', 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ],
    // URL schemes we permit
    allowedSchemes: [ 'http', 'https', 'ftp', 'mailto' ],
    // Be more specific about allowed schemes
    // for a certain tag
    allowedSchemesByTag: {
      img: [ 'http', 'https' ]
    },
    allowedClasses: {
      img: [ 'centered' ],
      svg: [ 'centered' ]
    }        
  };
  var svg = {'svg': [ 'width', 'height' ], 
             'circle': [ 'r', 'cx', 'cy', 'style' ], 
             'text': [ 'x', 'y', 'style' ], 
             'line': [ 'style' ], 
             'rect': [ 'style' ]};  
  options.allowedTags = options.allowedTags.concat(Object.keys(svg));
  for (var key in svg) options.allowedAttributes[key] = svg[key];
  return sanitizeHtml(html, options);
}

module.exports = htmlSanitizer;
