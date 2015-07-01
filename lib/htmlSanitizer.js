var sanitizeHtml = require('sanitize-html');

var htmlSanitizer = {};

htmlSanitizer.hookConverter = function(converter) {
  converter.hooks.chain('postConversion', sanitizeHtmlCustomized); 
}

function sanitizeHtmlCustomized(html) {
  var options = {
    allowedTags: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li', 'b', 'i', 
                   'strong', 'em', 'strike', 'code', 'hr', 'br', 'div', 'table', 'thead', 'caption', 'tbody', 'tr', 
                   'th', 'td', 'pre', 'img', 'code', 'iframe', 'del' , 'dl', 'dt', 'dd'],
    allowedAttributes: {
      a: [ 'href', 'name', 'target', 'data-widget-id' ],
      // We don't currently allow img itself by default, but this
      // would make sense if we did
      div: ['align'],
      img: [ 'src' , 'width', 'height'],
      iframe: ['width', 'height', 'src', 'frameborder', 'allowfullscreen'],
      code: ['class'],
      td: ['align'],
      th: ['align']
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
      a: [ 'twitter-timeline' ],
      img: [ 'centered' ],
      svg: [ 'centered' ],
      iframe: [ 'centered' ]
    }        
  };
  var svg = {'svg': [ 'width', 'height' , 'viewbox' ], 
             'circle': [ 'r', 'cx', 'cy', 'style' ], 
             'text': [ 'x', 'y', 'style' ], 
             'path': [ 'd' ,'style' ],
             'g': [ 'transform' ,'style' ],
             'use': [ 'xlink:href' ],
             'line': [ 'style' ], 
             'rect': [ 'style' ]};  
  options.allowedTags = options.allowedTags.concat(Object.keys(svg));
  for (var key in svg) options.allowedAttributes[key] = svg[key];
  return sanitizeHtml(html, options);
}

module.exports = htmlSanitizer;
