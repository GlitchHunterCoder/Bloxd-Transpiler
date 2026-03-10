# Bloxd-Transpiler
## Purpose
its goal is to take any one programming language, and convert it to any other, given the correct grammer
## Usage
this example below uses `PYTHON_TO_JS`
```js
//enter source code to convert here
var src = `
var x = 10;
var y = 20;
if (x < y) {
  console.log(x);
} else {
  console.log(y);
}
function add(a, b) {
  return a + b;
}
var result = add(x, y);
console.log(result);
` 

console.log(
  Transpiler.createTranspiler(JS_TO_PYTHON) //will take src, and convert it from JS format to Python format
  .parse(src) //parses the code
); //logs the output
```
