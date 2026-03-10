var JS_TO_PYTHON = {
  tokens: {
    COMMENT_LINE:  { match: /\/\/[^\n]*/, skip: true },
    COMMENT_BLOCK: { match: /\/\*[\s\S]*?\*\//, skip: true },
    WS:            { match: /\s+/, skip: true },
    KW_VAR:        { match: /(?:var|let|const)(?!\w)/ },
    KW_FUNCTION:   { match: /function(?!\w)/ },
    KW_IF:         { match: /if(?!\w)/ },
    KW_ELSE:       { match: /else(?!\w)/ },
    KW_WHILE:      { match: /while(?!\w)/ },
    KW_FOR:        { match: /for(?!\w)/ },
    KW_RETURN:     { match: /return(?!\w)/ },
    KW_CONSOLE_LOG:{ match: /console\.log/ },
    BOOL:          { match: /(?:true|false)(?!\w)/ },
    NULL:          { match: /null(?!\w)/ },
    NUMBER:        /[0-9]+(?:\.[0-9]+)?/,
    STRING:        /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
    IDENT:         /[A-Za-z_$][A-Za-z0-9_$]*/,
    EQ3:    "===",
    NEQ3:   "!==",
    EQ2:    "==",
    NEQ2:   "!=",
    LEQ:    "<=",
    GEQ:    ">=",
    AND:    "&&",
    OR:     "||",
    LPAREN: "(",
    RPAREN: ")",
    LBRACE: "{",
    RBRACE: "}",
    LBRACK: "[",
    RBRACK: "]",
    ASSIGN: "=",
    LT:     "<",
    GT:     ">",
    PLUS:   "+",
    MINUS:  "-",
    STAR:   "*",
    SLASH:  "/",
    PERCENT:"%",
    NOT:    "!",
    COMMA:  ",",
    DOT:    ".",
    SEMI:   { match: /;/, skip: true },
  },
  operators: [
    { assoc: "left",  ops: ["||"],                    into: "$left or $right" },
    { assoc: "left",  ops: ["&&"],                    into: "$left and $right" },
    { assoc: "left",  ops: ["===","!==","==","!="],
      into: function(l,op,r){ return l + (op==="==="||op==="=="?" == ":" != ") + r; } },
    { assoc: "left",  ops: ["<",">","<=",">="],       into: "$left $op $right" },
    { assoc: "left",  ops: ["+","-"],                 into: "$left $op $right" },
    { assoc: "left",  ops: ["*","/","%"],             into: "$left $op $right" },
  ],
  ctx: { indent: 0 },
  start: "program",
  rules: {
    program: {
      pattern: [{ many: "statement", name: "stmts" }],
      into: function(caps) {
        return caps.stmts.filter(function(s){ return s.trim(); }).join("\n");
      }
    },
    statement: {
      variants: [
        { pattern: ["funcDecl"],  into: "$1" },
        { pattern: ["ifStmt"],    into: "$1" },
        { pattern: ["whileStmt"],into: "$1" },
        { pattern: ["returnStmt"],into:"$1" },
        { pattern: ["printStmt"],into: "$1" },
        { pattern: ["varDecl"],  into: "$1" },
        { pattern: ["exprStmt"], into: "$1" },
      ]
    },
    funcDecl: {
      pattern: [
        "KW_FUNCTION",
        { token: "IDENT", name: "name" },
        "LPAREN",
        { opt: "paramList", name: "params" },
        "RPAREN",
        { token: "LBRACE", capture: false },
        { action: function(ctx){ ctx.set("indent", ctx.get("indent") + 1); } },
        { many: "statement", name: "body" },
        { action: function(ctx){ ctx.pop("indent"); } },
        { token: "RBRACE", capture: false }
      ],
      into: function(caps, ctx) {
        var ind     = indent(ctx.get("indent"));
        var body    = caps.body.filter(function(s){ return s.trim(); });
        var bodyStr = body.length ? body.join("\n") : ind + "    pass";
        return ind + "def " + caps.name + "(" + (caps.params||"") + "):\n" + bodyStr;
      }
    },
    paramList: {
      pattern: [{ sep: "IDENT", by: "COMMA", name: "params" }],
      into: function(caps){ return caps.params.join(", "); }
    },
    ifStmt: {
      pattern: [
        "KW_IF", "LPAREN",
        { rule: "expr", name: "cond" },
        "RPAREN", "LBRACE",
        { action: function(ctx){ ctx.set("indent", ctx.get("indent") + 1); } },
        { many: "statement", name: "body" },
        { action: function(ctx){ ctx.pop("indent"); } },
        "RBRACE",
        { opt: "elseClause", name: "els" }
      ],
      into: function(caps, ctx) {
        var ind     = indent(ctx.get("indent"));
        var body    = caps.body.filter(function(s){ return s.trim(); });
        var bodyStr = body.length ? body.join("\n") : ind + "    pass";
        var out = ind + "if " + caps.cond + ":\n" + bodyStr;
        if (caps.els) out += "\n" + caps.els;
        return out;
      }
    },
    elseClause: {
      variants: [
        {
          pattern: ["KW_ELSE", { rule: "ifStmt", name: "ifst" }],
          into: function(caps, ctx) {
            return caps.ifst.replace(/^(\s*)if /, "$1elif ");
          }
        },
        {
          pattern: [
            "KW_ELSE", "LBRACE",
            { action: function(ctx){ ctx.set("indent", ctx.get("indent") + 1); } },
            { many: "statement", name: "body" },
            { action: function(ctx){ ctx.pop("indent"); } },
            "RBRACE"
          ],
          into: function(caps, ctx) {
            var ind     = indent(ctx.get("indent"));
            var body    = caps.body.filter(function(s){ return s.trim(); });
            var bodyStr = body.length ? body.join("\n") : ind + "    pass";
            return ind + "else:\n" + bodyStr;
          }
        }
      ]
    },
    whileStmt: {
      pattern: [
        "KW_WHILE", "LPAREN",
        { rule: "expr", name: "cond" },
        "RPAREN", "LBRACE",
        { action: function(ctx){ ctx.set("indent", ctx.get("indent") + 1); } },
        { many: "statement", name: "body" },
        { action: function(ctx){ ctx.pop("indent"); } },
        "RBRACE"
      ],
      into: function(caps, ctx) {
        var ind  = indent(ctx.get("indent"));
        var body = caps.body.filter(function(s){ return s.trim(); });
        return ind + "while " + caps.cond + ":\n" +
               (body.length ? body.join("\n") : ind + "    pass");
      }
    },
    returnStmt: {
      pattern: [
        "KW_RETURN",
        { opt: "expr", name: "val" }
      ],
      into: function(caps, ctx) {
        return indent(ctx.get("indent")) + "return" + (caps.val ? " " + caps.val : "");
      }
    },
    printStmt: {
      pattern: [
        "KW_CONSOLE_LOG", "LPAREN",
        { opt: "argList", name: "args" },
        "RPAREN"
      ],
      into: function(caps, ctx) {
        return indent(ctx.get("indent")) + "print(" + (caps.args||"") + ")";
      }
    },
    varDecl: {
      variants: [
        {
          pattern: [
            "KW_VAR",
            { token: "IDENT", name: "name" },
            "ASSIGN",
            { rule: "expr", name: "val" }
          ],
          into: function(caps, ctx){ return indent(ctx.get("indent")) + caps.name + " = " + caps.val; }
        },
        {
          pattern: ["KW_VAR", { token: "IDENT", name: "name" }],
          into: function(caps, ctx){ return indent(ctx.get("indent")) + caps.name + " = None"; }
        }
      ]
    },
    exprStmt: {
      pattern: [{ rule: "expr", name: "e" }],
      into: function(caps, ctx){ return indent(ctx.get("indent")) + caps.e; }
    },
    expr: {
      pattern: [{ rule: "prattExpr", name: "e" }],
      into: "$e"
    },
    prattExpr: {
      variants: [
        { pattern: [{ rule: "unaryExpr", name: "e" }], into: "$e" }
      ]
    },
    unaryExpr: {
      variants: [
        {
          pattern: ["MINUS", { rule: "callExpr", name: "e" }],
          into: "-$e"
        },
        {
          pattern: ["NOT", { rule: "callExpr", name: "e" }],
          into: function(caps){ return "not " + caps.e; }
        },
        { pattern: [{ rule: "callExpr", name: "e" }], into: "$e" }
      ]
    },
    callExpr: {
      variants: [
        {
          pattern: [
            { rule: "primary", name: "fn" },
            "LPAREN",
            { opt: "argList", name: "args" },
            "RPAREN",
            { many: "callSuffix", name: "suffixes" }
          ],
          into: function(caps){
            return caps.fn + "(" + (caps.args||"") + ")" + caps.suffixes.join("");
          }
        },
        {
          pattern: [
            { rule: "primary", name: "base" },
            { many: "callSuffix", name: "suffixes" }
          ],
          into: function(caps){ return caps.base + caps.suffixes.join(""); }
        }
      ]
    },
    callSuffix: {
      variants: [
        {
          pattern: ["DOT", { token: "IDENT", name: "m" }, "LPAREN", { opt: "argList", name: "args" }, "RPAREN"],
          into: function(caps){ return "." + caps.m + "(" + (caps.args||"") + ")"; }
        },
        {
          pattern: ["LBRACK", { rule: "expr", name: "idx" }, "RBRACK"],
          into: "[$idx]"
        },
        {
          pattern: ["DOT", { token: "IDENT", name: "prop" }],
          into: ".$prop"
        }
      ]
    },
    primary: {
      variants: [
        { pattern: ["BOOL"],   into: function(caps){ return caps["$1"] === "true" ? "True" : "False"; } },
        { pattern: ["NULL"],   into: "None" },
        { pattern: ["NUMBER"], into: "$1" },
        { pattern: ["STRING"], into: "$1" },
        { pattern: ["LPAREN", { rule: "expr", name: "e" }, "RPAREN"], into: "($e)" },
        { pattern: ["arrayLit"], into: "$1" },
        { pattern: [{ token: "IDENT", name: "v" }, "ASSIGN", { rule: "expr", name: "e" }], into: "$v = $e" },
        { pattern: [{ token: "IDENT", name: "v" }], into: "$v" },
      ]
    },
    arrayLit: {
      pattern: ["LBRACK", { opt: "argList", name: "items" }, "RBRACK"],
      into: "[$items]"
    },
    argList: {
      pattern: [{ sep: "expr", by: "COMMA", name: "args" }],
      into: function(caps){ return caps.args.join(", "); }
    }
  }
};
      
