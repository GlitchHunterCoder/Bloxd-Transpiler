# Bloxd-Transpiler
## Purpose
its goal is to take any one programming language, and convert it to any other, given the correct grammer
## Usage
this example below uses `Python -> JS`
```js
const grammar_export = grammar;
const transpiler = createObjectTranspiler(grammar_export);

// ——— Quick tests ———
console.log("=== single assignment ===");
console.log(transpiler.Parse("a = 1 + 2 * 3"));

console.log("\n=== function (inline) ===");
console.log(transpiler.Parse("def add(x,y): x + y"));

console.log("\n=== if inline ===");
console.log(transpiler.Parse("if x > 0: y = 1 else: y = 2"));

console.log("\n=== for inline ===");
console.log(transpiler.Parse("for i in range(3): print(i)"));

console.log("\n=== multi-line block ===");
const multi = `
def foo(x):
    if x > 0:
        y = x * 2
        print(y)
    else:
        print(0)
`;
console.log(transpiler.Parse(multi.trim()));
```
