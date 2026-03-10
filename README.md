# Bloxd-Transpiler
## Purpose
its goal is to take any one programming language, and convert it to any other, given the correct grammer
## Usage
this example below uses `PYTHON_TO_JS`
```js
(function testJSPy() {
  var t   = Transpiler.createTranspiler(JS_TO_PYTHON); //place grammar here
  var src = [ //your code here
    "var x = 10;",
    "var y = 20;",
    "if (x < y) {",
    "  console.log(x);",
    "} else {",
    "  console.log(y);",
    "}",
    "function add(a, b) {",
    "  return a + b;",
    "}",
    "var result = add(x, y);",
    "console.log(result);"
  ].join("\n");
  try {
    console.log("=== JS → Python ===");
    console.log(t.parse(src)); //parses the code, and outputs converted
    console.log("PASSED\n");
  } catch(e) { console.error("FAILED:", e.message, e.stack); }
})();
```
