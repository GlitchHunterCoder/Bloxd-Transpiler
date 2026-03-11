var PYTHON_TO_JS = {
  indentMode: true,
  tokens: {
    FSTRING:    /f"(?:[^"\\]|\\.)*"|f'(?:[^'\\]|\\.)*'/,
    STRING:     /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
    NUMBER:     /[0-9]+(?:\.[0-9]+)?/,
    KW_DEF:     { match: /def(?![A-Za-z0-9_])/    },
    KW_CLASS:   { match: /class(?![A-Za-z0-9_])/  },
    KW_IF:      { match: /if(?![A-Za-z0-9_])/     },
    KW_ELIF:    { match: /elif(?![A-Za-z0-9_])/   },
    KW_ELSE:    { match: /else(?![A-Za-z0-9_])/   },
    KW_WHILE:   { match: /while(?![A-Za-z0-9_])/  },
    KW_FOR:     { match: /for(?![A-Za-z0-9_])/    },
    KW_IN:      { match: /in(?![A-Za-z0-9_])/     },
    KW_RETURN:  { match: /return(?![A-Za-z0-9_])/ },
    KW_PASS:    { match: /pass(?![A-Za-z0-9_])/   },
    KW_AND:     { match: /and(?![A-Za-z0-9_])/    },
    KW_OR:      { match: /or(?![A-Za-z0-9_])/     },
    KW_NOT:     { match: /not(?![A-Za-z0-9_])/    },
    KW_PRINT:   { match: /print(?![A-Za-z0-9_])/  },
    KW_LEN:     { match: /len(?![A-Za-z0-9_])/    },
    KW_RANGE:   { match: /range(?![A-Za-z0-9_])/  },
    KW_NONE:    { match: /None(?![A-Za-z0-9_])/   },
    KW_TRUE:    { match: /True(?![A-Za-z0-9_])/   },
    KW_FALSE:   { match: /False(?![A-Za-z0-9_])/  },
    KW_SELF:    { match: /self(?![A-Za-z0-9_])/   },
    IDENT:      /[A-Za-z_][A-Za-z0-9_]*/,
    EQ2:        "==",   NEQ:  "!=",  LEQ: "<=",  GEQ: ">=",
    PLUS_EQ:    "+=",   MINUS_EQ:"-=", STAR_EQ:"*=", SLASH_EQ:"/=",
    DSTAR:      "**",   DSLASH:"//",
    ASSIGN:     "=",    LT:   "<",    GT:  ">",
    PLUS:       "+",    MINUS:"-",    STAR:"*",   SLASH:"/",  PERCENT:"%",
    LPAREN:     "(",    RPAREN:")",
    LBRACK:     "[",    RBRACK:"]",
    LBRACE:     "{",    RBRACE:"}",
    COLON:      ":",    COMMA:",",    DOT: ".",
    WS:         { match: /[ \t]+/, skip: true },
  },
  operators: [
    { assoc: "left",  ops: ["KW_OR"],                     into: "$left || $right" },
    { assoc: "left",  ops: ["KW_AND"],                    into: "$left && $right" },
    { assoc: "left",  ops: ["EQ2","NEQ","LEQ","GEQ","LT","GT"], into: "$left $op $right" },
    { assoc: "left",  ops: ["PLUS","MINUS"],               into: "$left $op $right" },
    { assoc: "left",  ops: ["DSLASH"],
      into: function(l,op,r){ return "Math.floor("+l+" / "+r+")"; } },
    { assoc: "left",  ops: ["STAR","SLASH","PERCENT"],     into: "$left $op $right" },
    { assoc: "right", ops: ["DSTAR"],
      into: function(l,op,r){ return "Math.pow("+l+", "+r+")"; } },
  ],
  ctx: { indent: 0 },
  start: "program",
  rules: {
    program: {
      pattern: [{ many:"statement", name:"stmts" }],
      into: function(caps){ return caps.stmts.filter(function(s){ return s&&s.trim(); }).join("\n"); }
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
      pattern: [
        "INDENT",
        { action: function(ctx){ ctx.set("indent", ctx.get("indent")+1); } },
        { many1:"statement", name:"stmts" },
        { action: function(ctx){ ctx.pop("indent"); } },
        "DEDENT"
      ],
      into: function(caps, ctx) {
        var i = ctx.indent()+"    ";
        return caps.stmts
          .filter(function(s){ return s&&s.trim(); })
          .map(function(s){
            return s.split("\n").map(function(l){ return l.trim() ? i+l.trimLeft() : ""; }).join("\n");
          }).join("\n");
      }
    },
    classDef: {
      pattern: [
        "KW_CLASS", { token:"IDENT", name:"name" },
        { opt:{ seq:["LPAREN",{ opt:"argList", name:"parents" },"RPAREN"] }, name:"parentClause" },
        "COLON", "NEWLINE", { rule:"block", name:"body" }
      ],
      into: function(caps, ctx) {
        var i   = ctx.indent();
        var ext = (caps.parentClause && caps.parents) ? " extends "+caps.parents : "";
        return i+"class "+caps.name+ext+" {\n"+caps.body+"\n"+i+"}";
      }
    },
    funcDef: {
      pattern: [
        "KW_DEF", { token:"IDENT", name:"name" },
        "LPAREN", { opt:"paramList", name:"params" }, "RPAREN",
        "COLON", "NEWLINE", { rule:"block", name:"body" }
      ],
      into: function(caps, ctx) {
        var i      = ctx.indent();
        var params = (caps.params||"").split(", ").filter(function(p){ return p!=="self"; }).join(", ");
        var isMeth = caps.params && caps.params.split(", ")[0]==="self";
        return i + (isMeth ? "" : "function ") + caps.name + "("+params+") {\n"+caps.body+"\n"+i+"}";
      }
    },
    paramList: {
      pattern: [{ sep:"param", by:"COMMA", name:"params" }],
      into: function(caps){ return caps.params.join(", "); }
    },
    param: {
      variants: [
        { pattern: ["KW_SELF"], into: "self" },
        { pattern: [{ token:"IDENT", name:"n" }], into: "$n" }
      ]
    },
    ifStmt: {
      pattern: [
        "KW_IF", { rule:"expr", name:"cond" }, "COLON", "NEWLINE",
        { rule:"block", name:"body" },
        { many:"elifClause", name:"elifs" },
        { opt:"elseClause",  name:"els"   }
      ],
      into: function(caps, ctx) {
        var i   = ctx.indent();
        var out = i+"if ("+caps.cond+") {\n"+caps.body+"\n"+i+"}";
        caps.elifs.forEach(function(e){ out += " "+e; });
        if (caps.els) out += " "+caps.els;
        return out;
      }
    },
    elifClause: {
      pattern: ["KW_ELIF", { rule:"expr", name:"cond" }, "COLON", "NEWLINE", { rule:"block", name:"body" }],
      into: function(caps, ctx) {
        var i = ctx.indent();
        return "else if ("+caps.cond+") {\n"+caps.body+"\n"+i+"}";
      }
    },
    elseClause: {
      pattern: ["KW_ELSE", "COLON", "NEWLINE", { rule:"block", name:"body" }],
      into: function(caps, ctx) {
        var i = ctx.indent();
        return "else {\n"+caps.body+"\n"+i+"}";
      }
    },
    whileStmt: {
      pattern: ["KW_WHILE", { rule:"expr", name:"cond" }, "COLON", "NEWLINE", { rule:"block", name:"body" }],
      into: function(caps, ctx) {
        var i = ctx.indent();
        return i+"while ("+caps.cond+") {\n"+caps.body+"\n"+i+"}";
      }
    },
    forStmt: {
      variants: [
        {
          pattern: ["KW_FOR", { token:"IDENT", name:"v" }, "KW_IN", "KW_RANGE",
                    "LPAREN", { rule:"expr", name:"stop" }, "RPAREN",
                    "COLON", "NEWLINE", { rule:"block", name:"body" }],
          into: function(caps, ctx) {
            var i = ctx.indent();
            return i+"for (let "+caps.v+" = 0; "+caps.v+" < "+caps.stop+"; "+caps.v+"++) {\n"+caps.body+"\n"+i+"}";
          }
        },
        {
          pattern: ["KW_FOR", { token:"IDENT", name:"v" }, "KW_IN", "KW_RANGE",
                    "LPAREN", { rule:"expr", name:"start" }, "COMMA", { rule:"expr", name:"stop" }, "RPAREN",
                    "COLON", "NEWLINE", { rule:"block", name:"body" }],
          into: function(caps, ctx) {
            var i = ctx.indent();
            return i+"for (let "+caps.v+" = "+caps.start+"; "+caps.v+" < "+caps.stop+"; "+caps.v+"++) {\n"+caps.body+"\n"+i+"}";
          }
        },
        {
          pattern: ["KW_FOR", { token:"IDENT", name:"v" }, "KW_IN", "KW_RANGE",
                    "LPAREN", { rule:"expr", name:"start" }, "COMMA", { rule:"expr", name:"stop" },
                    "COMMA", { rule:"expr", name:"step" }, "RPAREN",
                    "COLON", "NEWLINE", { rule:"block", name:"body" }],
          into: function(caps, ctx) {
            var i = ctx.indent();
            return i+"for (let "+caps.v+" = "+caps.start+"; "+caps.v+" < "+caps.stop+"; "+caps.v+" += "+caps.step+") {\n"+caps.body+"\n"+i+"}";
          }
        },
        {
          pattern: ["KW_FOR", { token:"IDENT", name:"v" }, "KW_IN", { rule:"expr", name:"iter" },
                    "COLON", "NEWLINE", { rule:"block", name:"body" }],
          into: function(caps, ctx) {
            var i = ctx.indent();
            return i+"for (const "+caps.v+" of "+caps.iter+") {\n"+caps.body+"\n"+i+"}";
          }
        }
      ]
    },
    returnStmt: {
      pattern: ["KW_RETURN", { opt:"expr", name:"val" }, "NEWLINE"],
      into: function(caps, ctx){ return ctx.indent()+"return "+(caps.val||"")+";"; }
    },
    passStmt: {
      pattern: ["KW_PASS", "NEWLINE"],
      into: function(caps, ctx){ return ctx.indent()+"// pass"; }
    },
    augAssign: {
      pattern: [{ token:"IDENT", name:"v" }, { alt:["PLUS_EQ","MINUS_EQ","STAR_EQ","SLASH_EQ"], name:"op" }, { rule:"expr", name:"val" }, "NEWLINE"],
      into: function(caps, ctx){ return ctx.indent()+caps.v+" "+caps.op+" "+caps.val+";"; }
    },
    assignStmt: {
      pattern: [{ token:"IDENT", name:"v" }, "ASSIGN", { rule:"expr", name:"val" }, "NEWLINE"],
      into: function(caps, ctx){ return ctx.indent()+"let "+caps.v+" = "+caps.val+";"; }
    },
    printStmt: {
      pattern: ["KW_PRINT", "LPAREN", { opt:"argList", name:"args" }, "RPAREN", "NEWLINE"],
      into: function(caps, ctx){ return ctx.indent()+"console.log("+(caps.args||"")+");"; }
    },
    exprStmt: {
      pattern: [{ rule:"expr", name:"e" }, "NEWLINE"],
      into: function(caps, ctx){ return ctx.indent()+caps.e+";"; }
    },
    expr: {
      variants: [{ pattern: [{ rule:"unaryExpr", name:"e" }], into: "$e" }]
    },
    unaryExpr: {
      variants: [
        { pattern: ["KW_NOT", { rule:"callExpr", name:"e" }], into: "!$e"  },
        { pattern: ["MINUS",  { rule:"callExpr", name:"e" }], into: "-$e"  },
        { pattern: [{ rule:"callExpr", name:"e" }],           into: "$e"   }
      ]
    },
    callExpr: {
      variants: [
        {
          pattern: [{ rule:"primary", name:"fn" }, "LPAREN", { opt:"argList", name:"args" }, "RPAREN", { many:"callSuffix", name:"s" }],
          into: function(caps){ return caps.fn+"("+(caps.args||"")+")"+caps.s.join(""); }
        },
        {
          pattern: [{ rule:"primary", name:"b" }, { many:"callSuffix", name:"s" }],
          into: function(caps){ return caps.b+caps.s.join(""); }
        }
      ]
    },
    callSuffix: {
      variants: [
        {
          pattern: ["DOT", { token:"IDENT", name:"m" }, "LPAREN", { opt:"argList", name:"args" }, "RPAREN"],
          into: function(caps) {
            var map = { append:"push", upper:"toUpperCase", lower:"toLowerCase",
                        strip:"trim", split:"split", join:"join", replace:"replace",
                        startswith:"startsWith", endswith:"endsWith", find:"indexOf",
                        pop:"pop", sort:"sort", reverse:"reverse", keys:"keys",
                        values:"values", items:"entries" };
            return "."+(map[caps.m]||caps.m)+"("+(caps.args||"")+")";
          }
        },
        { pattern: ["LBRACK", { rule:"expr", name:"i" }, "RBRACK"], into: "[$i]" },
        { pattern: ["DOT", { token:"IDENT", name:"p" }],             into: ".$p" }
      ]
    },
    primary: {
      variants: [
        { pattern: ["KW_TRUE"],  into: "true"  },
        { pattern: ["KW_FALSE"], into: "false" },
        { pattern: ["KW_NONE"],  into: "null"  },
        { pattern: ["KW_SELF"],  into: "this"  },
        { pattern: ["KW_LEN", "LPAREN", { rule:"expr", name:"e" }, "RPAREN"], into: "$e.length" },
        {
          pattern: ["FSTRING"],
          into: function(caps) {
            var s = caps["$1"].replace(/^f["']|["']$/g, "");
            return "`"+s.replace(/\{([^}]+)\}/g, function(_,e){ return "${"+e+"}"; })+"`";
          }
        },
        { pattern: ["STRING"],  into: "$1" },
        { pattern: ["NUMBER"],  into: "$1" },
        { pattern: ["LPAREN", { rule:"expr", name:"e" }, "RPAREN"], into: "($e)" },
        { pattern: ["listLit"], into: "$1" },
        { pattern: [{ token:"IDENT", name:"n" }], into: "$n" }
      ]
    },
    listLit: {
      pattern: ["LBRACK", { opt:"argList", name:"items" }, "RBRACK"],
      into: "[$items]"
    },
    argList: {
      pattern: [{ sep:"expr", by:"COMMA", name:"args" }],
      into: function(caps){ return caps.args.join(", "); }
    }
  }
};
