var sanitizeHtml = require('sanitize-html');

var htmlSanitizer = {};

htmlSanitizer.hookConverter = function(converter) {
  converter.hooks.chain('postConversion', sanitizeHtmlCustomized); 
}

function sanitizeHtmlCustomized(state) {
  var html = state.text;
  var options = {
    allowedTags: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li', 'b', 'i', 
                   'strong', 'em', 'strike', 'code', 'hr', 'br', 'div', 'table', 'thead', 'caption', 'tbody', 'tr', 
                   'th', 'td', 'pre', 'img', 'style', 'iframe', 'del' , 'dl', 'dt', 'dd', 'defs', 'video' ],
    allowedAttributes: {
      a: [ 'href', 'name', 'target', 'data-widget-id' ],
      // We don't currently allow img itself by default, but this
      // would make sense if we did
      div: ['align', 'data-href', 'data-layout', 'data-action', 'data-show-faces', 'data-share', 'data-width', 'data-height'],
      img: [ 'src' , 'width', 'height', 'style', 'alt', 'title'],
      iframe: ['width', 'height', 'src', 'frameborder', 'allowfullscreen'],
      code: ['class'],
      td: ['align', 'style'],
      th: ['align', 'style'],
      video: ['src', 'style', 'autoplay', 'loop', 'controls']
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
      a: [ 'twitter-timeline', 'twitter-share-button' ],
      div: [ 'fb-follow', 'fb-like' ],
      img: [ 'centered' ],
      svg: [ 'centered' ],
      iframe: [ 'centered' ]
    }        
  };
  var svg = {'svg': [ 'width', 'height', 'style', 'viewbox', 'xmlns', 'xmlns:xlink', 'version' ], 
             'circle': [ 'r', 'cx', 'cy', 'style' ], 
             'ellipse': [ 'rx', 'ry', 'cx', 'cy', 'style' ], 
             'polygon': [ 'points', 'style' ], 
             'polyline': [ 'points', 'style' ],
             'text': [ 'x', 'y', 'dx', 'dy', 'style' ], 
             'path': [ 'd' ,'style' ],
             'g': [ 'transform' ,'style', 'id' ],
             'use': [ 'xlink:href' ],      
             'line': [ 'x1', 'y1', 'x2', 'y2', 'style' ], 
             'rect': [ 'x', 'y', 'width', 'height', 'style', 'rx', 'ry' ],
             'pattern': [ 'id', 'style', 'width', 'height', 'patternunits' ],
             'marker': [ 'id', 'viewbox', 'refx', 'refy', 'markerunits', 'markerwidth', 'markerheight', 'orient' ]};
  options.allowedTags = options.allowedTags.concat(Object.keys(svg));
  for (var key in svg) options.allowedAttributes[key] = svg[key];
  state.text = sanitizeHtml(html, options)
  return state;
}

module.exports = htmlSanitizer;
