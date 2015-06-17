var expect = require('chai').expect;
var pagedown = require('pagedown');
var pagedownExtra = require('../lib/pagedownExtra');
var mathJax = require('../lib/mathJax');
var htmlSanitizer = require('../lib/htmlSanitizer');

describe('Markdown', function() {
  describe('Extensions', function() {
    describe('pagedownExtra', function() {
      before(function() {
        this.converter = new pagedown.Converter();
        pagedownExtra.hookConverter(this.converter);
      });
      
      it ('should make tables', function() {
        var markdown = "| Item      | Value | Qty |\n" + 
          "| --------- | -----:|:--: |\n" +
          "| Computer  | $1600 | 5   |\n" +
          "| Phone     |   $12 | 12  |\n" +
          "| Pipe      |    $1 |234  |";
        var html = this.converter.makeHtml(markdown);
        expect(html).to.equal('<table>\n<thead>\n' +
                              '<tr>\n' +
                              '  <th>Item</th>\n' + 
                              '  <th align="right">Value</th>\n' + 
                              '  <th align="center">Qty</th>\n' + 
                              '</tr>\n' + 
                              '</thead>\n' +
                              '<tr>\n' +
                              '  <td>Computer</td>\n' +
                              '  <td align="right">$1600</td>\n' +
                              '  <td align="center">5</td>\n' + 
                              '</tr>\n' +
                              '<tr>\n' +
                              '  <td>Phone</td>\n' +
                              '  <td align="right">$12</td>\n' + 
                              '  <td align="center">12</td>\n' +
                              '</tr>\n' +
                              '<tr>\n' +
                              '  <td>Pipe</td>\n' +
                              '  <td align="right">$1</td>\n' +
                              '  <td align="center">234</td>\n' +
                              '</tr>\n' +
                              '</table>\n');
      });

      it ('should fence code blocks', function() {
        var html = this.converter.makeHtml('```js\nvar i = 10;\nvar j = 4;\n```');
        expect(html).to.equal('<pre><code class="js">var i = 10;\nvar j = 4;</code></pre>');
      });
      
    });
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