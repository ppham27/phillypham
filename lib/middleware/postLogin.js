module.exports = function(req, res, next) {
  res.redirect(req.session.preLoginPath || '/');
}
