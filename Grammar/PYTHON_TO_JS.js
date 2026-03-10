var PYTHON_TO_JS = (function() {
  function pyTokenise(src) {
    var tokens      = [];
    var indentStack = [0];
    var lines       = src.split("\n");
    var lineStart   = 0;
    var PATS = [
      { type:"FSTRING",   re:/f"(?:[^"\\]|\\.)*"|f'(?:[^'\\]|\\.)*'/ },
      { type:"STRING",    re:/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/ },
      { type:"NUMBER",    re:/[0-9]+(?:\.[0-9]+)?/ },
      { type:"KW_DEF",    re:/def(?![A-Za-z0-9_])/ },
      { type:"KW_CLASS",  re:/class(?![A-Za-z0-9_])/ },
      { type:"KW_IF",     re:/if(?![A-Za-z0-9_])/ },
      { type:"KW_ELIF",   re:/elif(?![A-Za-z0-9_])/ },
      { type:"KW_ELSE",   re:/else(?![A-Za-z0-9_])/ },
      { type:"KW_WHILE",  re:/while(?![A-Za-z0-9_])/ },
      { type:"KW_FOR",    re:/for(?![A-Za-z0-9_])/ },
      { type:"KW_IN",     re:/in(?![A-Za-z0-9_])/ },
      { type:"KW_RETURN", re:/return(?![A-Za-z0-9_])/ },
      { type:"KW_PASS",   re:/pass(?![A-Za-z0-9_])/ },
      { type:"KW_AND",    re:/and(?![A-Za-z0-9_])/ },
      { type:"KW_OR",     re:/or(?![A-Za-z0-9_])/ },
      { type:"KW_NOT",    re:/not(?![A-Za-z0-9_])/ },
      { type:"KW_PRINT",  re:/print(?![A-Za-z0-9_])/ },
      { type:"KW_LEN",    re:/len(?![A-Za-z0-9_])/ },
      { type:"KW_RANGE",  re:/range(?![A-Za-z0-9_])/ },
      { type:"KW_NONE",   re:/None(?![A-Za-z0-9_])/ },
      { type:"KW_TRUE",   re:/True(?![A-Za-z0-9_])/ },
      { type:"KW_FALSE",  re:/False(?![A-Za-z0-9_])/ },
      { type:"KW_SELF",   re:/self(?![A-Za-z0-9_])/ },
      { type:"IDENT",     re:/[A-Za-z_][A-Za-z0-9_]*/ },
      { type:"EQ2",       re:/==/ },   { type:"NEQ",  re:/!=/ },
      { type:"LEQ",       re:/<=/ },   { type:"GEQ",  re:/>=/ },
      { type:"PLUS_EQ",   re:/\+=/ },  { type:"MINUS_EQ", re:/-=/ },
      { type:"STAR_EQ",   re:/\*=/ },  { type:"SLASH_EQ", re:/\/=/ },
      { type:"DSTAR",     re:/\*\*/ }, { type:"DSLASH", re:/\/\// },
      { type:"ASSIGN",    re:/=/ },
      { type:"LT",        re:/</ },    { type:"GT",    re:/>/ },
      { type:"PLUS",      re:/\+/ },   { type:"MINUS", re:/-/ },
      { type:"STAR",      re:/\*/ },   { type:"SLASH", re:/\// },
      { type:"PERCENT",   re:/%/ },
      { type:"LPAREN",    re:/\(/ },   { type:"RPAREN", re:/\)/ },
      { type:"LBRACK",    re:/\[/ },   { type:"RBRACK", re:/\]/ },
      { type:"LBRACE",    re:/\{/ },   { type:"RBRACE", re:/\}/ },
      { type:"COLON",     re:/:/ },    { type:"COMMA",  re:/,/ },
      { type:"DOT",       re:/\./ },
      { type:"WS",        re:/[ \t]+/, skip: true }
    ];
    function tokeniseLine(line, basePos) {
      var content = line.trimLeft();
      var pos     = basePos + (line.length - content.length);
      while (content.length > 0) {
        var ok = false;
        for (var i = 0; i < PATS.length; i++) {
          var p  = PATS[i];
          var re = new RegExp("^(?:" + p.re.source + ")");
          var m  = content.match(re);
          if (m) {
            if (!p.skip) tokens.push({ type: p.type, value: m[0], pos: pos });
            pos     += m[0].length;
            content  = content.slice(m[0].length);
            ok = true;
            break;
          }
        }
        if (!ok) { content = content.slice(1); pos++; }
      }
    }
    for (var li = 0; li < lines.length; li++) {
      var raw  = lines[li];
      var line = raw.replace(/#.*$/, "");      // strip comments
      if (!line.trim()) { lineStart += raw.length + 1; continue; }
      var col = 0;
      for (var ci = 0; ci < line.length; ci++) {
        if (line[ci] === " ")  col++;
        else if (line[ci] === "\t") col = Math.ceil((col+1)/4)*4;
        else break;
      }
      var top = indentStack[indentStack.length - 1];
      if (col > top) {
        indentStack.push(col);
        tokens.push({ type: "INDENT", value: "", pos: lineStart });
      } else {
        while (col < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          tokens.push({ type: "DEDENT", value: "", pos: lineStart });
        }
      }
      tokeniseLine(line, lineStart);
      tokens.push({ type: "NEWLINE", value: "\n", pos: lineStart + raw.length });
      lineStart += raw.length + 1;
    }
    while (indentStack.length > 1) { indentStack.pop(); tokens.push({ type: "DEDENT", value: "", pos: lineStart }); }
    tokens.push({ type: "$EOF", value: "", pos: lineStart });
    return tokens;
  }
  return {
    _tokeniser: pyTokenise,
    ctx: { indent: 0 },
    start: "program",
    operators: [
      { assoc: "left",  ops: ["KW_OR"],  into: "$left || $right" },
      { assoc: "left",  ops: ["KW_AND"], into: "$left && $right" },
      { assoc: "left",  ops: ["EQ2","NEQ","LEQ","GEQ","LT","GT"], into: "$left $op $right" },
      { assoc: "left",  ops: ["PLUS","MINUS"],  into: "$left $op $right" },
      { assoc: "left",  ops: ["DSLASH"],        into: "Math.floor($left / $right)" },
      { assoc: "left",  ops: ["STAR","SLASH","PERCENT"], into: "$left $op $right" },
      { assoc: "right", ops: ["DSTAR"],         into: "Math.pow($left, $right)" },
    ],
    rules: {
      program: {
        pattern: [{ many: "statement", name: "stmts" }],
        into: function(caps){
          return caps.stmts.filter(function(s){ return s && s.trim(); }).join("\n");
        }
      },
      statement: {
        variants: [
          { pattern: ["classDef"],   into: "$1" },
          { pattern: ["funcDef"],    into: "$1" },
          { pattern: ["ifStmt"],     into: "$1" },
          { pattern: ["whileStmt"],  into: "$1" },
          { pattern: ["forStmt"],    into: "$1" },
          { pattern: ["returnStmt"], into: "$1" },
          { pattern: ["passStmt"],   into: "$1" },
          { pattern: ["augAssign"],  into: "$1" },
          { pattern: ["assignStmt"], into: "$1" },
          { pattern: ["printStmt"],  into: "$1" },
          { pattern: ["exprStmt"],   into: "$1" },
        ]
      },
      block: {
        pattern: ["INDENT", { many1: "statement", name: "stmts" }, "DEDENT"],
        into: function(caps, ctx) {
          ctx.set("indent", ctx.get("indent") + 1);
          var ind   = indent(ctx.get("indent"));
          var stmts = caps.stmts.filter(function(s){ return s && s.trim(); });
          var result = stmts.map(function(s) {
            return s.split("\n").map(function(l){ return l.trim() ? ind + l.trimLeft() : ""; }).join("\n");
          }).join("\n");
          ctx.pop("indent");
          return result;
        }
      },
      classDef: {
        pattern: [
          "KW_CLASS", { token: "IDENT", name: "name" },
          { opt: { seq: ["LPAREN", { opt: "argList", name: "parents" }, "RPAREN"] }, name: "parentRaw" },
          "COLON", "NEWLINE",
          { rule: "block", name: "body" }
        ],
        into: function(caps, ctx) {
          var ind     = indent(ctx.get("indent"));
          var extends_ = caps.parentRaw ? " extends " + (caps.parents||"") : "";
          return ind + "class " + caps.name + extends_ + " {\n" + caps.body + "\n" + ind + "}";
        }
      },
      funcDef: {
        pattern: [
          "KW_DEF", { token: "IDENT", name: "name" },
          "LPAREN", { opt: "paramList", name: "params" }, "RPAREN",
          "COLON", "NEWLINE",
          { rule: "block", name: "body" }
        ],
        into: function(caps, ctx) {
          var ind    = indent(ctx.get("indent"));
          var params = (caps.params||"").split(", ").filter(function(p){ return p !== "self"; }).join(", ");
          var isMeth = caps.params && caps.params.split(", ")[0] === "self";
          var kw     = isMeth ? "" : "function ";
          return ind + kw + caps.name + "(" + params + ") {\n" + caps.body + "\n" + ind + "}";
        }
      },
      paramList: {
        pattern: [{ sep: "param", by: "COMMA", name: "params" }],
        into: function(caps){ return caps.params.join(", "); }
      },
      param: {
        variants: [
          { pattern: ["KW_SELF"],             into: "self" },
          { pattern: [{ token: "IDENT", name: "n" }], into: "$n" }
        ]
      },
      ifStmt: {
        pattern: [
          "KW_IF", { rule: "expr", name: "cond" }, "COLON", "NEWLINE",
          { rule: "block", name: "body" },
          { many: "elifClause", name: "elifs" },
          { opt: "elseClause",  name: "els" }
        ],
        into: function(caps, ctx) {
          var ind  = indent(ctx.get("indent"));
          var out  = ind + "if (" + caps.cond + ") {\n" + caps.body + "\n" + ind + "}";
          caps.elifs.forEach(function(e){ out += " " + e; });
          if (caps.els) out += " " + caps.els;
          return out;
        }
      },
      elifClause: {
        pattern: ["KW_ELIF", { rule: "expr", name: "cond" }, "COLON", "NEWLINE", { rule: "block", name: "body" }],
        into: function(caps, ctx) {
          var ind = indent(ctx.get("indent"));
          return "else if (" + caps.cond + ") {\n" + caps.body + "\n" + ind + "}";
        }
      },
      elseClause: {
        pattern: ["KW_ELSE", "COLON", "NEWLINE", { rule: "block", name: "body" }],
        into: function(caps, ctx) {
          var ind = indent(ctx.get("indent"));
          return "else {\n" + caps.body + "\n" + ind + "}";
        }
      },
      whileStmt: {
        pattern: ["KW_WHILE", { rule: "expr", name: "cond" }, "COLON", "NEWLINE", { rule: "block", name: "body" }],
        into: function(caps, ctx) {
          var ind = indent(ctx.get("indent"));
          return ind + "while (" + caps.cond + ") {\n" + caps.body + "\n" + ind + "}";
        }
      },
      forStmt: {
        pattern: ["KW_FOR", { token: "IDENT", name: "v" }, "KW_IN", { rule: "expr", name: "iter" }, "COLON", "NEWLINE", { rule: "block", name: "body" }],
        into: function(caps, ctx) {
          var ind  = indent(ctx.get("indent"));
          var iter = caps.iter;
          var rm = iter.match(/^range\((.+)\)$/);
          if (rm) {
            var args = splitTopArgs(rm[1]);
            if (args.length === 1)
              return ind + "for (let " + caps.v + " = 0; " + caps.v + " < " + args[0] + "; " + caps.v + "++) {\n" + caps.body + "\n" + ind + "}";
            if (args.length === 2)
              return ind + "for (let " + caps.v + " = " + args[0] + "; " + caps.v + " < " + args[1] + "; " + caps.v + "++) {\n" + caps.body + "\n" + ind + "}";
            if (args.length === 3)
              return ind + "for (let " + caps.v + " = " + args[0] + "; " + caps.v + " < " + args[1] + "; " + caps.v + " += " + args[2] + ") {\n" + caps.body + "\n" + ind + "}";
          }
          return ind + "for (const " + caps.v + " of " + iter + ") {\n" + caps.body + "\n" + ind + "}";
        }
      },
      returnStmt: {
        pattern: ["KW_RETURN", { opt: "expr", name: "val" }, "NEWLINE"],
        into: function(caps, ctx){ return indent(ctx.get("indent")) + "return " + (caps.val||"") + ";"; }
      },
      passStmt: {
        pattern: ["KW_PASS", "NEWLINE"],
        into: function(caps, ctx){ return indent(ctx.get("indent")) + "// pass"; }
      },
      augAssign: {
        pattern: [{ token: "IDENT", name: "v" }, { alt: ["PLUS_EQ","MINUS_EQ","STAR_EQ","SLASH_EQ"], name: "op" }, { rule: "expr", name: "val" }, "NEWLINE"],
        into: function(caps, ctx){ return indent(ctx.get("indent")) + caps.v + " " + caps.op + " " + caps.val + ";"; }
      },
      assignStmt: {
        pattern: [{ token: "IDENT", name: "v" }, "ASSIGN", { rule: "expr", name: "val" }, "NEWLINE"],
        into: function(caps, ctx){ return indent(ctx.get("indent")) + "let " + caps.v + " = " + caps.val + ";"; }
      },
      printStmt: {
        pattern: ["KW_PRINT", "LPAREN", { opt: "argList", name: "args" }, "RPAREN", "NEWLINE"],
        into: function(caps, ctx){ return indent(ctx.get("indent")) + "console.log(" + (caps.args||"") + ");"; }
      },
      exprStmt: {
        pattern: [{ rule: "expr", name: "e" }, "NEWLINE"],
        into: function(caps, ctx){ return indent(ctx.get("indent")) + caps.e + ";"; }
      },
      expr: {
        variants: [
          { pattern: [{ rule: "unaryExpr", name: "e" }], into: "$e" }
        ]
      },
      unaryExpr: {
        variants: [
          { pattern: ["KW_NOT", { rule: "callExpr", name: "e" }], into: "!$e" },
          { pattern: ["MINUS",  { rule: "callExpr", name: "e" }], into: "-$e" },
          { pattern: [{ rule: "callExpr", name: "e" }],           into: "$e"  }
        ]
      },
      callExpr: {
        variants: [
          {
            pattern: [{ rule: "primary", name: "fn" }, "LPAREN", { opt: "argList", name: "args" }, "RPAREN", { many: "callSuffix", name: "s" }],
            into: function(caps){ return caps.fn + "(" + (caps.args||"") + ")" + caps.s.join(""); }
          },
          {
            pattern: [{ rule: "primary", name: "b" }, { many: "callSuffix", name: "s" }],
            into: function(caps){ return caps.b + caps.s.join(""); }
          }
        ]
      },
      callSuffix: {
        variants: [
          {
            pattern: ["DOT", { token: "IDENT", name: "m" }, "LPAREN", { opt: "argList", name: "args" }, "RPAREN"],
            into: function(caps){
              var pyToJs = { append:"push", upper:"toUpperCase", lower:"toLowerCase",
                             strip:"trim", split:"split", join:"join", replace:"replace",
                             startswith:"startsWith", endswith:"endsWith", find:"indexOf",
                             pop:"pop", sort:"sort", reverse:"reverse", keys:"keys",
                             values:"values", items:"entries" };
              return "." + (pyToJs[caps.m]||caps.m) + "(" + (caps.args||"") + ")";
            }
          },
          { pattern: ["LBRACK", { rule: "expr", name: "i" }, "RBRACK"], into: "[$i]" },
          { pattern: ["DOT", { token: "IDENT", name: "p" }], into: ".$p" }
        ]
      },
      primary: {
        variants: [
          { pattern: ["KW_TRUE"],   into: "true"  },
          { pattern: ["KW_FALSE"],  into: "false" },
          { pattern: ["KW_NONE"],   into: "null"  },
          { pattern: ["KW_SELF"],   into: "this"  },
          { pattern: ["KW_LEN", "LPAREN", { rule: "expr", name: "e" }, "RPAREN"], into: "$e.length" },
          { pattern: ["KW_RANGE", "LPAREN", { opt: "argList", name: "args" }, "RPAREN"], into: "range($args)" },
          { pattern: ["FSTRING"],
            into: function(caps){
              var s = caps["$1"].replace(/^f["']|["']$/g,"");
              return "`" + s.replace(/\{([^}]+)\}/g, function(_,e){ return "${"+e+"}"; }) + "`";
            }
          },
          { pattern: ["STRING"],  into: "$1" },
          { pattern: ["NUMBER"],  into: "$1" },
          { pattern: ["LPAREN", { rule: "expr", name: "e" }, "RPAREN"], into: "($e)" },
          { pattern: ["listLit"], into: "$1" },
          { pattern: [{ token: "IDENT", name: "v" }], into: "$v" }
        ]
      },
      listLit: {
        pattern: ["LBRACK", { opt: "argList", name: "items" }, "RBRACK"],
        into: "[$items]"
      },
      argList: {
        pattern: [{ sep: "expr", by: "COMMA", name: "args" }],
        into: function(caps){ return caps.args.join(", "); }
      }
    }
  };
})();
