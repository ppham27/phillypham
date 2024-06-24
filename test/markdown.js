var expect = require('chai').expect;
var pagedown = require('pagedown');
var linkTargeter = require('../lib/linkTargeter');
var mathJax = require('../lib/mathJax');
var htmlSanitizer = require('../lib/htmlSanitizer');

var converter = require('../lib/markdown').Converter;

describe('Markdown', function() {
  describe('Extensions', function() {
    describe('linkTargeter', function() {
      before(function() {
        this.converter = converter;
      });
      
      it('should add target to links' , function() {
        this.converter = converter;
        var markdown = '// <a href="http://www.google.com">phil</a>\n\
// <a href="http://www.google.com" target="_self">self</a>\n\
// <a href="#abc">chris</a>\n\
// <a href="http://www.facebook.com">phil</a>\n\
// <a hr>improper</a>\n\
// <a href>nothing</a>\n\
// <a href="">no space</a>\n\
// <a href="http://www.yahoo.com">phil</a>';
        var html = this.converter.makeHtml(markdown);
        var expectedHtml = '<p>// <a href="http://www.google.com" target="_blank">phil</a>\n// <a href="http://www.google.com" target="_self">self</a>\n// <a href="#abc">chris</a>\n// <a href="http://www.facebook.com" target="_blank">phil</a>\n// <a target="_blank">improper</a>\n// <a target="_blank">nothing</a>\n// <a target="_blank">no space</a>\n// <a href="http://www.yahoo.com" target="_blank">phil</a></p>';
        expect(html).to.equal(expectedHtml);
      });
    });
    
    describe('pagedownExtra', function() {
      before(function() {
        this.converter = converter;
      });
      
      it('should make tables', function() {
        var markdown = "| Item      | Value  | Qty  |\n" + 
                       "| --------- | -----: | :--: |\n" +
                       "| Computer  | $1600  |   5  |\n" +
                       "| Phone     |   $12  |  12  |\n" +
                       "| Pipe      |    $1  | 234  |";
        var html = this.converter.makeHtml(markdown);
        expect(html).to.equal('<table>\n<thead>\n' +
                              '<tr>\n' +
                              '<th>Item</th>\n' + 
                              '<th style="text-align:right">Value</th>\n' + 
                              '<th style="text-align:center">Qty</th>\n' + 
                              '</tr>\n' + 
                              '</thead>\n' +
                              '<tbody>\n' + 
                              '<tr>\n' +
                              '<td>Computer</td>\n' +
                              '<td style="text-align:right">$1600</td>\n' +
                              '<td style="text-align:center">5</td>\n' + 
                              '</tr>\n' +
                              '<tr>\n' +
                              '<td>Phone</td>\n' +
                              '<td style="text-align:right">$12</td>\n' + 
                              '<td style="text-align:center">12</td>\n' +
                              '</tr>\n' +
                              '<tr>\n' +
                              '<td>Pipe</td>\n' +
                              '<td style="text-align:right">$1</td>\n' +
                              '<td style="text-align:center">234</td>\n' +
                              '</tr>\n' +
                              '</tbody>\n' + 
                              '</table>');
      });

      it ('should fence code blocks', function() {
        var html = this.converter.makeHtml('```js\nvar i = 10;\nvar j = 4;\n```');
        expect(html).to.equal('<pre><code class="js">var i = 10;\nvar j = 4;\n</code></pre>');
      });
      
    });
    describe('MathJax', function() {
      before(function() {
        this.converter = converter;
      });
      it('should be preserve TeX elements with $', function() {
        var html = this.converter.makeHtml('It is a fact that $2+2 = 4$.');
        expect(html).to.equal('<p>It is a fact that $2+2 = 4$.</p>'); 
        html = this.converter.makeHtml('It is a fact that $$\\sum_{i=1}^{n}\\frac{n(n+1)}{2}$$.');
        expect(html).to.equal('<p>It is a fact that $$\\sum_{i=1}^{n}\\frac{n(n+1)}{2}$$.</p>'); 
      });
      it('should be preserve TeX elements in blocks', function() {
        var html = this.converter.makeHtml('\\begin{align*}\n\\sigma + \\gamma &= \\alpha \\\\\n&= \\beta\n\\end{align*}');
        expect(html).to.equal('<p>\\begin{align*}\n\\sigma + \\gamma &amp;= \\alpha \\\\\n&amp;= \\beta\n\\end{align*}</p>');
      });
    });
    describe('HTML Sanitizer', function() { 
      before(function() {
        this.converter = converter;
      });
      
      it('should remove script tags', function() {
        var dirtyHtml = '<div><p><script>doEvil();</script></p></div>'
        expect(this.converter.makeHtml(dirtyHtml)).to.not.match(/script/);
      });

      it('should preserve svg elements and their attributes', function() {
        var dirtyHtml = '<div><p><svg><circle cx="10" cy="10" r="5" style="fill:red"></circle></svg></p></div>'
        var cleanHtml = this.converter.makeHtml(dirtyHtml);
        expect(cleanHtml).to.equal(dirtyHtml);
      });
    });
  });
});
