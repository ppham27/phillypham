var expect = require('chai').expect;
var pagedown = require('pagedown');
var mathJax = require('../lib/mathJax');

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
  });
});