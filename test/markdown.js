var expect = require('chai').expect;
var pagedown = require('pagedown');
var mathJax = require('../lib/mathJax');
var htmlSanitizer = require('../lib/htmlSanitizer');

describe('Markdown', function() {
  describe('Extensions', function() {
    describe('MathJax', function() {
      before(function() {
        this.converter = new pagedown.Converter(); 
        mathJax.hookConverter(this.converter);
      });
      it('should be preserve TeX elements', function() {
        var html = this.converter.makeHtml('It is a fact that $2+2 = 4$.');
        expect(html).to.equal('<p>It is a fact that $2+2 = 4$.</p>'); 
        html = this.converter.makeHtml('\begin{align*}\n\sigma + \gamma &= \alpha \\\n&= \beta\n\end{align*}');
        expect(html).to.equal('<p>\begin{align*}\nsigma + gamma &amp;= alpha \\\n&amp;= \beta\nend{align*}</p>');
      });
    });
    describe('HTML Sanitizer', function() { 
      before(function() {
        this.converter = new pagedown.Converter(); 
        htmlSanitizer.hookConverter(this.converter);
      });
      
      it('should remove script tags', function() {
        var dirtyHtml = '<div><p><script>doEvil();</script></p></div>'
        expect(this.converter.makeHtml(dirtyHtml)).to.not.match(/script/);
      });

      it('should preserve svg elements and their attributes', function() {
        var dirtyHtml = '<div><p><svg><circle cx="10" cy="10" r="5" style="fill: red;"></circle></svg></p></div>'
        var cleanHtml = this.converter.makeHtml(dirtyHtml);
        expect(cleanHtml).to.equal(dirtyHtml);
      });
    });
  });
});