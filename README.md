# Bloxd-Transpiler
## Purpose
its goal is to take any one programming language, and convert it to any other, given the correct grammer
## Usage
this example below uses `Python -> JS`
```js
(function testJSPy() {
  var t   = Transpiler.createTranspiler(JS_TO_PYTHON);
  var src = [
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
    console.log("=== JS â†’ Python ===");
    console.log(Transpiler.createTranspiler(JS_TO_PYTHON).parse(src));
    console.log("PASSED\n");
  } catch(e) { console.error("FAILED:", e.message, e.stack); }
})();

(function testPyJS() {
  var src = [
    "# Fibonacci",
    "def fib(n):",
    "    if n <= 1:",
    "        return n",
    "    return fib(n - 1) + fib(n - 2)",
    "",
    "x = 0",
    "while x < 10:",
    "    print(fib(x))",
    "    x += 1",
    "",
    "for i in range(5):",
    "    print(i)",
    "",
    "arr = [1, 2, 3]",
    "arr.append(4)",
    "print(len(arr))"
  ].join("\n");
  try {
    console.log("=== Python â†’ JS ===");
    console.log(Transpiler.createTranspiler(PYTHON_TO_JS).parse(src));
    console.log("PASSED\n");
  } catch(e) { console.error("FAILED:", e.message, e.stack); }
})();
```
