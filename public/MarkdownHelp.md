### Markdown Help

#### Paragraphs

To start a new paragraph, just leave an empty line.

```text
This is paragraph 1.

This is paragraph 2.
```

To start a new line just leave two spaces at the end of the previous line.

#### Headers

Headers are specified with differing numbers of `#`.

`# Big Heading` generates:

# Big Heading

`### Small Heading` generates:

### Small Heading

#### Bold and italics

`**Bold text**` makes **Bold text**  
`*Italic text*` makes *Italic text*

#### Links and images

`[Google](http://google.com)` makes [Google](http://google.com), a link to Google. Putting an exclamation mark in front of the link makes an image like `![Description](url)`.

#### Code

Code can either be indented by 4 spaces.

```text
    cout << "Hello, world!" << endl;
```

or fenced by 3 backticks. You can specify the language:

    ```javascript
    function() {
        var foo = 'Hello, world!';
        console.log(foo);
    }
    ```

to help with the highlighting.

#### Blockquotes

Block quotes are denoted by `>`:

```text
> This is a block quote
> that goes onto two lines.
```

#### Lists

Ordered lists are made like

```text
1. List Item 1
2. List Item 2
3. List Item 3
```

Unordered lists are made with dashes

```text
- List item
- List item
- List item
```

#### Tables


| A | B | C |
|--:|:-:|:--|
| 1 | 2 | 3 |
| 4 | 5 | 6 |
| 7 | 8 | 9 |

are made like, where the colons specify column alignment:

```text
| A | B | C |
|--:|:-:|:--|
| 1 | 2 | 3 |
| 4 | 5 | 6 |
| 7 | 8 | 9 |
```
    
#### LaTeX

LaTeX can be inserted directly.

```text
$$\sum_{i=1}^n n = \frac{n(n+1)}{2}$$
```
    
makes

$$\sum_{i=1}^n i = \frac{n(n+1)}{2}.$$

#### HTML

HTML can be directly inserted, too.

---------

For further information see:

- [Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
- [LaTeX](http://www.artofproblemsolving.com/wiki/index.php/LaTeX:Math)
