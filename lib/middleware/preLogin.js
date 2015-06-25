var url = require('url');

module.exports = function(req, res, next) {  
  var referer = req.get('Referer');
  if (referer) {
    var path = url.parse(referer).path; 
    if (!(/^\/register/.test(path) || 
          /^\/login/.test(path) || 
          /^\/auth/.test(path))) req.session.preLoginPath = path;
  }
  next();
}
