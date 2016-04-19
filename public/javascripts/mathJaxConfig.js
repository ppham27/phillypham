MathJax.Hub.Config({
  "HTML-CSS": {
    preferredFont: "TeX",
    availableFonts: ["STIX", "TeX"],
    linebreaks: {
      automatic: true
    },
    EqnChunk: 10,
    imageFont: null
  },
  tex2jax: { inlineMath: [["$","$"],["\\\\(","\\\\)"]], 
             displayMath: [["$$","$$"],["\\[","\\]"]], 
             processEscapes: true, ignoreClass: "tex2jax_ignore|dno" },
  TeX: {noUndefined: {attributes: {mathcolor: "red", mathbackground: "#FFEEEE", mathsize: "90%"}}, Macros: {href: "{}"},
        equationNumbers: { autoNumber: "AMS" },
        Safe: {allow: {URLs: "safe", classes: "safe", cssIDs: "safe", styles: "safe", fontsize: "all"}}},
  messageStyle: "none"
});