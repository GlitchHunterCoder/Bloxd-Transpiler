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
## Grammar Creation
<details>

<summary>Open Docs</summary>

```js
// =============================================================================
//  UNIVERSAL TRANSPILER ENGINE  v3.0
//  Pure JS · No imports · No async · No Web APIs
// =============================================================================
//
//  PHILOSOPHY
//  ----------
//  A grammar is a plain JSON-compatible object that only describes TWO things:
//    1. What does source text LOOK LIKE?  (patterns)
//    2. What does it BECOME?              (templates / transform functions)
//
//  The grammar author never writes parsing logic.
//  No combinators. No SEQ/ALT/MANY. No regex anchoring. No state machines.
//  Just descriptions and transformations.
//
//  The engine reads the grammar and figures out how to parse.
//
// =============================================================================
//  GRAMMAR FORMAT
// =============================================================================
//
//  {
//    // ── Optional: token definitions ───────────────────────────────────────
//    // If present, source is tokenised first. Tokens are matched by name.
//    // If absent, the engine works directly on the character stream.
//    tokens: {
//      NUMBER:    /[0-9]+(\.[0-9]+)?/,
//      STRING:    /"[^"]*"|'[^']*'/,
//      IDENT:     /[A-Za-z_]\w*/,
//      PLUS:      "+",           // string literal shorthand
//      WS:        { match: /\s+/, skip: true },   // skip: true → discard
//      // Keywords must come BEFORE IDENT so they match first:
//      IF:        { match: /if(?!\w)/, keyword: true },
//    },
//
//    // ── Optional: operator precedence table ───────────────────────────────
//    // Tells the engine how to handle binary expressions automatically.
//    // The engine builds a Pratt parser from this — you never write one.
//    operators: [
//      // Each array is one precedence level, lowest first.
//      // "left" | "right" | "none" for associativity.
//      { assoc: "left",  ops: ["||"] },
//      { assoc: "left",  ops: ["&&"] },
//      { assoc: "left",  ops: ["==", "!=", "<", ">", "<=", ">="] },
//      { assoc: "left",  ops: ["+", "-"] },
//      { assoc: "left",  ops: ["*", "/", "%"] },
//      { assoc: "right", ops: ["**"] },
//    ],
//
//    // ── Entry point ───────────────────────────────────────────────────────
//    start: "program",
//
//    // ── Rules ─────────────────────────────────────────────────────────────
//    rules: {
//
//      ruleName: {
//        // PATTERN — describes what to match. Uses:
//        //   "TOKEN_NAME"       match a token of this type
//        //   "ruleName"         call another rule (by convention, lowercase = rule)
//        //   "$literal"         match this exact text (prefix $ to distinguish from rule names)
//        //   { many: "rule" }   zero or more
//        //   { many1: "rule" }  one or more
//        //   { opt: "rule" }    optional
//        //   { seq: [...] }     sequence (usually implicit in pattern array)
//        //   { alt: [...] }     ordered alternatives (usually split into multiple variants)
//        //   { sep: "rule", by: "TOKEN" }   list separated by TOKEN
//
//        // SINGLE-VARIANT form:
//        pattern: ["KW_IF", "$($", "expr", "$)", "block"],
//        //   Captures are positional: $1=KW_IF match, $2=( match, $3=expr match, etc.
//        //   Or use named captures:
//        pattern: { seq: ["KW_IF", "$(", {name:"cond", rule:"expr"}, "$)", {name:"body", rule:"block"}] },
//
//        // MULTI-VARIANT form (ordered alternatives, first match wins):
//        variants: [
//          { pattern: [...], into: "..." },
//          { pattern: [...], into: "..." },
//        ],
//
//        // INTO — the output template.
//        //   A string with $1 $2 ... for positional captures
//        //   OR $name for named captures
//        //   OR a function(captures, ctx) that returns a string
//        into: "if ($cond) {\n$body\n}",
//      },
//
//    }
//  }
//
// =============================================================================
//  CAPTURE BINDING
// =============================================================================
//
//  Positional:  $1, $2, $3 ... match left-to-right across the pattern
//               (skipped tokens like punctuation are NOT captured by default
//                unless you explicitly name them or use $all)
//
//  Named:       { name: "x", rule: "expr" }   →  $x in template
//               { name: "x", token: "IDENT" } →  $x in template
//
//  Spread:      { many: "stmt", name: "body" }  → $body is array, use $body.join("\n")
//               In template strings, $body auto-joins with newline.
//
//  Context:     ctx is a key-value store available to function `into` handlers.
//               ctx.get("key"), ctx.set("key", val), ctx.push/pop for scoping.
//
// =============================================================================
```

</details>
