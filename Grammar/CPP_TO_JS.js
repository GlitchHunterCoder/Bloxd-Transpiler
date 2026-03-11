var CPP_TO_JS = {
  tokens: {
    COMMENT_LINE:  { match: /\/\/[^\n]*/,      skip: true },
    COMMENT_BLOCK: { match: /\/\*[\s\S]*?\*\//, skip: true },
    WS:            { match: /[ \t\r\n]+/,       skip: true },
    PREPROC:       /#[^\n]*/,
    STRING:  /"(?:[^"\\]|\\.)*"/,
    CHAR:    /'(?:[^'\\]|\\.)*'/,
    NUMBER:  /0x[0-9a-fA-F]+[uUlL]*|[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?[fFlLuU]*/,
    BOOL:    { match: /(?:true|false)(?![A-Za-z0-9_])/ },
    KW_NULLPTR:   { match: /(?:nullptr|NULL)(?![A-Za-z0-9_])/ },
    KW_NEW:       { match: /new(?![A-Za-z0-9_])/       },
    KW_DELETE:    { match: /delete(?![A-Za-z0-9_])/    },
    KW_RETURN:    { match: /return(?![A-Za-z0-9_])/    },
    KW_IF:        { match: /if(?![A-Za-z0-9_])/        },
    KW_ELSE:      { match: /else(?![A-Za-z0-9_])/      },
    KW_WHILE:     { match: /while(?![A-Za-z0-9_])/     },
    KW_FOR:       { match: /for(?![A-Za-z0-9_])/       },
    KW_DO:        { match: /do(?![A-Za-z0-9_])/        },
    KW_BREAK:     { match: /break(?![A-Za-z0-9_])/     },
    KW_CONTINUE:  { match: /continue(?![A-Za-z0-9_])/  },
    KW_CLASS:     { match: /class(?![A-Za-z0-9_])/     },
    KW_STRUCT:    { match: /struct(?![A-Za-z0-9_])/    },
    KW_PUBLIC:    { match: /public(?![A-Za-z0-9_])/    },
    KW_PRIVATE:   { match: /private(?![A-Za-z0-9_])/   },
    KW_PROTECTED: { match: /protected(?![A-Za-z0-9_])/ },
    KW_THIS:      { match: /this(?![A-Za-z0-9_])/      },
    KW_NAMESPACE: { match: /namespace(?![A-Za-z0-9_])/ },
    KW_USING:     { match: /using(?![A-Za-z0-9_])/     },
    KW_TYPEDEF:   { match: /typedef(?![A-Za-z0-9_])/   },
    KW_TYPENAME:  { match: /typename(?![A-Za-z0-9_])/  },
    KW_TEMPLATE:  { match: /template(?![A-Za-z0-9_])/  },
    KW_TRY:       { match: /try(?![A-Za-z0-9_])/       },
    KW_CATCH:     { match: /catch(?![A-Za-z0-9_])/     },
    KW_THROW:     { match: /throw(?![A-Za-z0-9_])/     },
    KW_SIZEOF:    { match: /sizeof(?![A-Za-z0-9_])/    },
    KW_STATIC:    { match: /static(?![A-Za-z0-9_])/    },
    KW_CONST:     { match: /const(?![A-Za-z0-9_])/     },
    KW_VIRTUAL:   { match: /virtual(?![A-Za-z0-9_])/   },
    KW_OVERRIDE:  { match: /override(?![A-Za-z0-9_])/  },
    KW_INLINE:    { match: /inline(?![A-Za-z0-9_])/    },
    KW_EXPLICIT:  { match: /explicit(?![A-Za-z0-9_])/  },
    KW_FRIEND:    { match: /friend(?![A-Za-z0-9_])/    },
    KW_MUTABLE:   { match: /mutable(?![A-Za-z0-9_])/   },
    KW_VOLATILE:  { match: /volatile(?![A-Za-z0-9_])/  },
    KW_ENUM:      { match: /enum(?![A-Za-z0-9_])/      },
    KW_NOEXCEPT:  { match: /noexcept(?![A-Za-z0-9_])/  },
    KW_EXTERN:    { match: /extern(?![A-Za-z0-9_])/    },
    TYPENAME: { match: /(?:int|long|short|unsigned|signed|float|double|bool|char|void|auto|size_t|wchar_t|string|wstring|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|ptrdiff_t)(?![A-Za-z0-9_])/ },
    IDENT: /[A-Za-z_][A-Za-z0-9_]*/,
    SCOPE:      "::",   ARROW:    "->",
    EQ:         "==",   NEQ:      "!=",
    LEQ:        "<=",   GEQ:      ">=",
    AND:        "&&",   OR:       "||",
    INC:        "++",   DEC:      "--",
    PLUS_EQ:    "+=",   MINUS_EQ: "-=",
    STAR_EQ:    "*=",   SLASH_EQ: "/=",
    PERCENT_EQ: "%=",   AMP_EQ:   "&=",   PIPE_EQ: "|=",
    LSHIFT:     "<<",
    ELLIPSIS:   "...",
    LPAREN: "(",  RPAREN: ")",  LBRACE: "{",  RBRACE: "}",
    LBRACK: "[",  RBRACK: "]",  SEMI:   ";",  COMMA:  ",",
    DOT:    ".",  QMARK:  "?",  COLON:  ":",  TILDE:  "~",
    BANG:   "!",  AMP:    "&",  PIPE:   "|",  XOR:    "^",
    PERCENT:"%",  STAR:   "*",  SLASH:  "/",  PLUS:   "+",
    MINUS:  "-",  ASSIGN: "=",  LT:     "<",  GT:     ">",
  },
  operators: [
    { assoc:"right", ops:["=","+=","-=","*=","/=","%=","&=","|="], into:"$left $op $right" },
    { assoc:"left",  ops:["||"],   into:"$left || $right" },
    { assoc:"left",  ops:["&&"],   into:"$left && $right" },
    { assoc:"left",  ops:["|"],    into:"$left | $right"  },
    { assoc:"left",  ops:["^"],    into:"$left ^ $right"  },
    { assoc:"left",  ops:["&"],    into:"$left & $right"  },
    { assoc:"left",  ops:["EQ","NEQ"],               into:"$left $op $right" },
    { assoc:"left",  ops:["LT","GT","LEQ","GEQ"],    into:"$left $op $right" },
    { assoc:"left",  ops:["LSHIFT"],                 into:"$left << $right"  },
    { assoc:"left",  ops:["+","-"],  into:"$left $op $right" },
    { assoc:"left",  ops:["*","/","%"], into:"$left $op $right" },
  ],
  ctx: { indent: 0 },
  start: "program",
  rules: {
    program: {
      pattern: [{ many:"topLevel", name:"items" }],
      into: function(caps){ return caps.items.filter(function(s){ return s&&s.trim(); }).join("\n"); }
    },
    topLevel: {
      variants: [
        { pattern:["preprocLine"],   into:"$1" },
        { pattern:["usingDecl"],     into:"$1" },
        { pattern:["namespaceDef"],  into:"$1" },
        { pattern:["classDef"],      into:"$1" },
        { pattern:["enumDef"],       into:"$1" },
        { pattern:["templateDecl"],  into:"$1" },
        { pattern:["funcDef"],       into:"$1" },
        { pattern:["varDeclStmt"],   into:"$1" },
        { pattern:["statement"],     into:"$1" },
      ]
    },
    preprocLine: {
      pattern: ["PREPROC"],
      into: function(caps){ return "// "+caps["$1"]; }
    },
    usingDecl: {
      variants: [
        { pattern:["KW_USING","KW_NAMESPACE","IDENT","SEMI"], into:"" },
        { pattern:["KW_USING",{rule:"qualName",name:"n"},"SEMI"],
          into:function(caps){ return "// using "+caps.n; } },
        { pattern:["KW_TYPEDEF",{rule:"typeExpr"},"IDENT","SEMI"],
          into:function(caps,ctx){ return ctx.indent()+"// typedef"; } },
      ]
    },
    namespaceDef: {
      pattern: ["KW_NAMESPACE",{opt:"IDENT",name:"name"},"LBRACE",{many:"topLevel",name:"body"},"RBRACE"],
      into: function(caps){
        return "// namespace "+(caps.name||"")+"\n"+caps.body.filter(Boolean).join("\n");
      }
    },
    templateDecl: {
      pattern: ["KW_TEMPLATE","LT",{many:"tmplParam"},"GT",{alt:["classDef","funcDef"],name:"body"}],
      into: "$body"
    },
    tmplParam: {
      variants: [
        {pattern:["KW_TYPENAME",{opt:"IDENT"}],into:""},
        {pattern:["TYPENAME",   {opt:"IDENT"}],into:""},
        {pattern:["IDENT",      {opt:"IDENT"}],into:""},
        {pattern:["COMMA"],                    into:""},
      ]
    },
    enumDef: {
      pattern: [{opt:"KW_CLASS"},"KW_ENUM",{opt:"IDENT",name:"name"},"LBRACE",{sep:"enumMember",by:"COMMA",name:"members"},"RBRACE","SEMI"],
      into: function(caps,ctx){
        var i = ctx.indent();
        var body = caps.members.filter(Boolean).map(function(m){ return i+"  "+m; }).join(",\n");
        return i+"const "+(caps.name||"Enum")+" = Object.freeze({\n"+body+"\n"+i+"});";
      }
    },
    enumMember: {
      variants: [
        {pattern:[{token:"IDENT",name:"k"},"ASSIGN",{rule:"expr",name:"v"}], into:"$k: $v"},
        {pattern:[{token:"IDENT",name:"k"}],                                  into:'$k: "$k"'},
      ]
    },
    classDef: {
      pattern: [
        {alt:["KW_CLASS","KW_STRUCT"]},
        {token:"IDENT",name:"name"},
        {opt:"classInherit",name:"parent"},
        "LBRACE",
        {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
        {many:"classMember",name:"members"},
        {action:function(ctx){ ctx.pop("indent"); }},
        "RBRACE","SEMI"
      ],
      into: function(caps,ctx) {
        var i    = ctx.indent();
        var ext  = caps.parent ? " extends "+caps.parent : "";
        var ctor = [], methods = [], extra = [];
        caps.members.forEach(function(m){
          if (!m||!m.trim()) return;
          if      (m.startsWith("\x01CTOR\x01")) ctor.push(m.slice(6));
          else if (m.startsWith("\x01MTH\x01"))  methods.push(m.slice(5));
          else                                    extra.push(m);
        });
        var body = ctor.concat(methods).join("\n\n");
        if (!body.trim() && extra.length) body = extra.join("\n");
        return i+"class "+caps.name+ext+" {\n"+body+"\n"+i+"}";
      }
    },
    classInherit: {
      pattern: ["COLON",{rule:"accessSpec"},"IDENT"],
      into: "$3"
    },
    accessSpec: {
      variants: [
        {pattern:["KW_PUBLIC"],    into:"public"},
        {pattern:["KW_PRIVATE"],   into:"private"},
        {pattern:["KW_PROTECTED"], into:"protected"},
      ]
    },
    classMember: {
      variants: [
        {pattern:[{rule:"accessSpec"},"COLON"],                         into:""},
        {pattern:["constructorDef"],                                     into:"$1"},
        {pattern:["destructorDef"],                                      into:"$1"},
        {pattern:["methodDef"],                                          into:"$1"},
        {pattern:["fieldDecl"],                                          into:"$1"},
        {pattern:["classDef"],                                           into:"$1"},
        {pattern:["KW_FRIEND",{rule:"typeExpr"},"IDENT","SEMI"],        into:""},
      ]
    },
    constructorDef: {
      pattern: [
        {opt:"KW_EXPLICIT"},
        {token:"IDENT",name:"name"},"LPAREN",{opt:"paramList",name:"params"},"RPAREN",
        {opt:"initList",name:"inits"},
        "LBRACE",
        {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
        {many:"statement",name:"body"},
        {action:function(ctx){ ctx.pop("indent"); }},
        "RBRACE"
      ],
      into: function(caps,ctx) {
        var i = ctx.indent();
        var initLines = caps.inits
          ? caps.inits.map(function(it){ return i+"    this."+it+";"; })
          : [];
        var body = caps.body.filter(function(s){ return s&&s.trim(); });
        return "\x01CTOR\x01"+i+"  constructor("+(caps.params||"")+") {\n"+
               initLines.concat(body).join("\n")+"\n"+i+"  }";
      }
    },
    initList: {
      pattern: ["COLON",{sep:"initItem",by:"COMMA",name:"items"}],
      into: function(caps){ return caps.items; }
    },
    initItem: {
      pattern: [{token:"IDENT",name:"f"},"LPAREN",{opt:"argList",name:"args"},"RPAREN"],
      into: "$f($args)"
    },
    destructorDef: {
      pattern: [
        "TILDE",{token:"IDENT",name:"name"},"LPAREN","RPAREN",
        "LBRACE",
        {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
        {many:"statement",name:"body"},
        {action:function(ctx){ ctx.pop("indent"); }},
        "RBRACE"
      ],
      into: function(caps,ctx) {
        var i = ctx.indent();
        return "\x01MTH\x01"+i+"  destroy() { // destructor\n"+
               caps.body.filter(function(s){ return s&&s.trim(); }).join("\n")+"\n"+i+"  }";
      }
    },
    methodDef: {
      pattern: [
        {many:"methodMod",name:"mods"},
        {rule:"typeExpr"},
        {token:"IDENT",name:"name"},"LPAREN",{opt:"paramList",name:"params"},"RPAREN",
        {many:"methodSuffix"},
        "LBRACE",
        {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
        {many:"statement",name:"body"},
        {action:function(ctx){ ctx.pop("indent"); }},
        "RBRACE"
      ],
      into: function(caps,ctx) {
        var i   = ctx.indent();
        var kw  = caps.mods.indexOf("static")!==-1 ? "static " : "";
        var body = caps.body.filter(function(s){ return s&&s.trim(); });
        return "\x01MTH\x01"+i+"  "+kw+caps.name+"("+(caps.params||"")+") {\n"+body.join("\n")+"\n"+i+"  }";
      }
    },
    methodMod: {
      variants: [
        {pattern:["KW_STATIC"],   into:"static"},
        {pattern:["KW_VIRTUAL"],  into:"virtual"},
        {pattern:["KW_INLINE"],   into:"inline"},
        {pattern:["KW_EXPLICIT"], into:"explicit"},
        {pattern:["KW_EXTERN"],   into:"extern"},
      ]
    },
    methodSuffix: {
      variants: [
        {pattern:["KW_CONST"],    into:""},
        {pattern:["KW_OVERRIDE"], into:""},
        {pattern:["KW_NOEXCEPT"], into:""},
      ]
    },
    fieldDecl: {
      pattern: [
        {opt:"KW_STATIC"},{opt:"KW_CONST"},
        {rule:"typeExpr"},
        {token:"IDENT",name:"name"},
        {opt:{seq:["ASSIGN",{rule:"expr",name:"v"}]},name:"init"},
        "SEMI"
      ],
      into: function(caps,ctx) {
        var rhs = caps.init
          ? (Array.isArray(caps.init) ? caps.init[1]||caps.init[caps.init.length-1] : caps.init)
          : "undefined";
        return ctx.indent()+"this."+caps.name+" = "+rhs+";";
      }
    },
    funcDef: {
      pattern: [
        {many:"methodMod"},
        {rule:"typeExpr"},
        {rule:"qualName",name:"name"},"LPAREN",{opt:"paramList",name:"params"},"RPAREN",
        {many:"methodSuffix"},
        "LBRACE",
        {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
        {many:"statement",name:"body"},
        {action:function(ctx){ ctx.pop("indent"); }},
        "RBRACE"
      ],
      into: function(caps,ctx) {
        var i = ctx.indent();
        return i+"function "+caps.name+"("+(caps.params||"")+") {\n"+
               caps.body.filter(function(s){ return s&&s.trim(); }).join("\n")+"\n"+i+"}";
      }
    },
    paramList: {
      pattern: [{sep:"param",by:"COMMA",name:"params"}],
      into: function(caps){ return caps.params.filter(Boolean).join(", "); }
    },
    param: {
      variants: [
        {pattern:["ELLIPSIS"], into:"...args"},
        {
          pattern:[{rule:"typeExpr"},{token:"IDENT",name:"n"},{opt:{seq:["ASSIGN",{rule:"expr",name:"dv"}]},name:"def"}],
          into:function(caps){ return caps.n+(caps.def?" = "+(Array.isArray(caps.def)?caps.def[1]||"":caps.def):""); }
        },
        {pattern:[{rule:"typeExpr"}], into:"_"},
      ]
    },
    typeExpr: {
      variants: [
        {pattern:["KW_CONST",   {rule:"typeExpr"}], into:""},
        {pattern:["KW_STATIC",  {rule:"typeExpr"}], into:""},
        {pattern:["KW_MUTABLE", {rule:"typeExpr"}], into:""},
        {pattern:["KW_VOLATILE",{rule:"typeExpr"}], into:""},
        {pattern:[{rule:"qualName"},{opt:"tmplArgList"},{many:"ptrRef"}], into:""},
        {pattern:["TYPENAME",{opt:"tmplArgList"},{many:"ptrRef"}],        into:""},
        {pattern:["KW_TYPENAME",{opt:"tmplArgList"},{many:"ptrRef"}],     into:""},
        {pattern:["KW_UNSIGNED",{opt:"TYPENAME"},{many:"ptrRef"}],        into:""},
        {pattern:["KW_SIGNED",  {opt:"TYPENAME"},{many:"ptrRef"}],        into:""},
        {pattern:["KW_LONG","KW_LONG",{opt:"TYPENAME"},{many:"ptrRef"}],  into:""},
        {pattern:["KW_LONG",{opt:"TYPENAME"},{many:"ptrRef"}],            into:""},
      ]
    },
    ptrRef: {
      variants: [
        {pattern:["STAR"],     into:""},
        {pattern:["AMP"],      into:""},
        {pattern:["KW_CONST"], into:""},
      ]
    },
    tmplArgList: {
      pattern: ["LT",{many:"tmplArgItem"},"GT"],
      into: ""
    },
    tmplArgItem: {
      variants: [
        {pattern:[{rule:"typeExpr"}],into:""},
        {pattern:["COMMA"],         into:""},
        {pattern:["NUMBER"],        into:""},
        {pattern:["IDENT"],         into:""},
      ]
    },
    qualName: {
      pattern: [{token:"IDENT",name:"first"},{many:{seq:["SCOPE","IDENT"]},name:"rest"}],
      into: function(caps) {
        var parts = [caps.first];
        caps.rest.forEach(function(r){
          parts.push(Array.isArray(r) ? r[r.length-1]||r[1] : r);
        });
        if (parts[0]==="std") parts.shift();
        return parts.join(".");
      }
    },
    statement: {
      variants: [
        {pattern:["ifStmt"],       into:"$1"},
        {pattern:["whileStmt"],    into:"$1"},
        {pattern:["doWhileStmt"],  into:"$1"},
        {pattern:["forRangeStmt"], into:"$1"},
        {pattern:["forStmt"],      into:"$1"},
        {pattern:["returnStmt"],   into:"$1"},
        {pattern:["breakStmt"],    into:"$1"},
        {pattern:["continueStmt"], into:"$1"},
        {pattern:["throwStmt"],    into:"$1"},
        {pattern:["tryStmt"],      into:"$1"},
        {pattern:["coutStmt"],     into:"$1"},
        {pattern:["deleteStmt"],   into:"$1"},
        {pattern:["varDeclStmt"],  into:"$1"},
        {pattern:["exprStmt"],     into:"$1"},
        {pattern:["blockStmt"],    into:"$1"},
        {pattern:["SEMI"],         into:""},
      ]
    },
    blockStmt: {
      pattern: [
        "LBRACE",
        {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
        {many:"statement",name:"stmts"},
        {action:function(ctx){ ctx.pop("indent"); }},
        "RBRACE"
      ],
      into: function(caps,ctx) {
        var i = ctx.indent();
        return "{\n"+caps.stmts.filter(function(s){ return s&&s.trim(); }).join("\n")+"\n"+i+"}";
      }
    },
    ifStmt: {
      pattern: [
        "KW_IF","LPAREN",{rule:"expr",name:"cond"},"RPAREN",
        {rule:"stmtOrBlock",name:"then"},
        {opt:{seq:["KW_ELSE",{rule:"stmtOrBlock",name:"els"}]},name:"elseRaw"}
      ],
      into: function(caps,ctx) {
        var i   = ctx.indent();
        var out = i+"if ("+caps.cond+") "+caps.then;
        if (caps.elseRaw) {
          var ep = Array.isArray(caps.elseRaw)
            ? caps.elseRaw[1]||caps.elseRaw[caps.elseRaw.length-1]
            : caps.elseRaw;
          out += " else "+ep;
        }
        return out;
      }
    },
    stmtOrBlock: {
      variants: [
        {pattern:["blockStmt"], into:"$1"},
        {
          pattern:[
            {action:function(ctx){ ctx.set("indent",ctx.get("indent")+1); }},
            {rule:"statement",name:"s"},
            {action:function(ctx){ ctx.pop("indent"); }}
          ],
          into:function(caps){ return "{\n"+caps.s+"\n}"; }
        }
      ]
    },
    whileStmt: {
      pattern:["KW_WHILE","LPAREN",{rule:"expr",name:"cond"},"RPAREN",{rule:"stmtOrBlock",name:"body"}],
      into:function(caps,ctx){ return ctx.indent()+"while ("+caps.cond+") "+caps.body; }
    },
    doWhileStmt: {
      pattern:["KW_DO",{rule:"stmtOrBlock",name:"body"},"KW_WHILE","LPAREN",{rule:"expr",name:"cond"},"RPAREN","SEMI"],
      into:function(caps,ctx){ return ctx.indent()+"do "+caps.body+" while ("+caps.cond+");"; }
    },
    forRangeStmt: {
      pattern:["KW_FOR","LPAREN",{rule:"typeExpr"},{token:"IDENT",name:"v"},"COLON",{rule:"expr",name:"iter"},"RPAREN",{rule:"stmtOrBlock",name:"body"}],
      into:function(caps,ctx){ return ctx.indent()+"for (const "+caps.v+" of "+caps.iter+") "+caps.body; }
    },
    forStmt: {
      pattern:[
        "KW_FOR","LPAREN",
        {opt:"forInit",name:"init"},"SEMI",
        {opt:"expr",   name:"cond"},"SEMI",
        {opt:"exprList",name:"upd"},
        "RPAREN",{rule:"stmtOrBlock",name:"body"}
      ],
      into:function(caps,ctx){
        return ctx.indent()+"for ("+(caps.init||"")+"; "+(caps.cond||"")+"; "+(caps.upd||"")+") "+caps.body;
      }
    },
    forInit: {
      variants: [
        {
          pattern:["varDeclCore"],
          into:function(caps){
            return (caps["$1"]||"")
              .replace(/\n/g," ").replace(/^\s+/,"")
              .replace(/;+\s*$/,"").replace(/;\s*/g,", ").replace(/,\s*$/,"");
          }
        },
        {pattern:["exprList"],into:"$1"},
      ]
    },
    exprList: {
      pattern:[{sep:"expr",by:"COMMA",name:"es"}],
      into:function(caps){ return caps.es.join(", "); }
    },
    returnStmt: {
      pattern:["KW_RETURN",{opt:"expr",name:"val"},"SEMI"],
      into:function(caps,ctx){ return ctx.indent()+"return"+(caps.val?" "+caps.val:"")+";"; }
    },
    breakStmt:    {pattern:["KW_BREAK","SEMI"],    into:function(caps,ctx){ return ctx.indent()+"break;"; }},
    continueStmt: {pattern:["KW_CONTINUE","SEMI"], into:function(caps,ctx){ return ctx.indent()+"continue;"; }},
    throwStmt: {
      pattern:["KW_THROW",{opt:"expr",name:"val"},"SEMI"],
      into:function(caps,ctx){ return ctx.indent()+"throw "+(caps.val||"new Error()")+";"; }
    },
    tryStmt: {
      pattern:["KW_TRY",{rule:"blockStmt",name:"tryB"},{many1:"catchClause",name:"catches"}],
      into:function(caps,ctx){ return ctx.indent()+"try "+caps.tryB+"\n"+caps.catches.join("\n"); }
    },
    catchClause: {
      pattern:["KW_CATCH","LPAREN",{opt:{seq:[{rule:"typeExpr"},{opt:"IDENT",name:"n"}]},name:"prm"},"RPAREN",{rule:"blockStmt",name:"body"}],
      into:function(caps,ctx){
        var n = Array.isArray(caps.prm) ? caps.prm[1]||"e" : "e";
        if (!n||!n.trim()) n="e";
        return ctx.indent()+"catch ("+n+") "+caps.body;
      }
    },
    coutStmt: {
      pattern:[{token:"IDENT",name:"stream"},"LSHIFT",{sep:"coutArg",by:"LSHIFT",name:"args"},"SEMI"],
      into:function(caps,ctx){
        if (caps.stream!=="cout"&&caps.stream!=="cerr") return null;
        var fn   = caps.stream==="cerr" ? "console.error" : "console.log";
        var args = caps.args.filter(function(a){ return a&&a!=="endl"&&a!=='"\\n"'&&a!=="'\\n'"; });
        return ctx.indent()+fn+"("+args.join(", ")+");";
      }
    },
    coutArg: {
      variants: [{pattern:[{rule:"postfixExpr",name:"e"}],into:"$e"}]
    },
    deleteStmt: {
      variants: [
        {pattern:["KW_DELETE","LBRACK","RBRACK",{rule:"expr",name:"e"},"SEMI"],
         into:function(caps,ctx){ return ctx.indent()+"// delete[] "+caps.e; }},
        {pattern:["KW_DELETE",{rule:"expr",name:"e"},"SEMI"],
         into:function(caps,ctx){ return ctx.indent()+"// delete "+caps.e; }},
      ]
    },
    varDeclStmt: {
      pattern:[{rule:"varDeclCore",name:"d"},"SEMI"],
      into:"$d"
    },
    varDeclCore: {
      pattern:[
        {opt:"KW_CONST",name:"cn"},{opt:"KW_STATIC"},
        {rule:"typeExpr"},
        {sep:"declarator",by:"COMMA",name:"decls"}
      ],
      into:function(caps,ctx){
        var i  = ctx.indent();
        var kw = caps.cn ? "const" : "let";
        return caps.decls.filter(Boolean).map(function(d){ return i+kw+" "+d+";"; }).join("\n");
      }
    },
    declarator: {
      pattern:[
        {token:"IDENT",name:"n"},
        {opt:{seq:["LBRACK",{opt:"expr"},"RBRACK"]}},
        {opt:{seq:["ASSIGN",{rule:"expr",name:"v"}]},name:"init"},
        {opt:{seq:["LPAREN",{opt:"argList",name:"ctorArgs"},"RPAREN"]},name:"ctor"},
        {opt:{seq:["LBRACE",{opt:"argList",name:"braceArgs"},"RBRACE"]},name:"brace"},
      ],
      into:function(caps){
        var rhs;
        if (caps.init)  rhs = Array.isArray(caps.init)  ? caps.init[1]||caps.init[caps.init.length-1] : caps.init;
        else if (caps.brace) rhs = "[" + (Array.isArray(caps.brace) ? caps.brace[1]||"" : "") + "]";
        else if (caps.ctor)  rhs = "new "+caps.n+"("+(Array.isArray(caps.ctor)?caps.ctor[1]||"":"")+")";
        else rhs = "undefined";
        return caps.n+" = "+rhs;
      }
    },
    exprStmt: {
      pattern:[{rule:"expr",name:"e"},"SEMI"],
      into:function(caps,ctx){
        if (!caps.e||!caps.e.trim()) return "";
        return ctx.indent()+caps.e+";";
      }
    },
    unaryExpr: {
      variants: [
        {pattern:["INC",{rule:"unaryExpr",name:"e"}],  into:"++$e"},
        {pattern:["DEC",{rule:"unaryExpr",name:"e"}],  into:"--$e"},
        {pattern:["MINUS",{rule:"unaryExpr",name:"e"}],into:"-$e"},
        {pattern:["BANG", {rule:"unaryExpr",name:"e"}],into:"!$e"},
        {pattern:["TILDE",{rule:"unaryExpr",name:"e"}],into:"~$e"},
        {pattern:["STAR", {rule:"unaryExpr",name:"e"}],into:"$e"},   // deref â†’ identity
        {pattern:["AMP",  {rule:"unaryExpr",name:"e"}],into:"$e"},   // address-of â†’ identity
        {pattern:["KW_NEW",{rule:"qualName",name:"n"},{opt:"tmplArgList"},"LPAREN",{opt:"argList",name:"args"},"RPAREN"],
         into:function(caps){ return "new "+caps.n+"("+(caps.args||"")+")"; }},
        {pattern:["KW_SIZEOF","LPAREN",{rule:"typeExpr"},"RPAREN"], into:"4"},
        {pattern:["KW_SIZEOF",{rule:"unaryExpr"}],                   into:"4"},
        {pattern:["LPAREN",{rule:"typeExpr"},"RPAREN",{rule:"unaryExpr",name:"e"}], into:"$e"},
        {pattern:["IDENT","LT",{rule:"typeExpr"},"GT","LPAREN",{rule:"expr",name:"e"},"RPAREN"], into:"$e"},
        {pattern:[{rule:"postfixExpr",name:"c"},"QMARK",{rule:"expr",name:"a"},"COLON",{rule:"expr",name:"b"}],
         into:"$c ? $a : $b"},
        {pattern:[{rule:"postfixExpr",name:"e"}], into:"$e"},
      ]
    },
    postfixExpr: {
      pattern:[{rule:"primaryExpr",name:"b"},{many:"postfixSuffix",name:"s"}],
      into:function(caps){ return caps.b+caps.s.join(""); }
    },
    postfixSuffix: {
      variants: [
        {pattern:["INC"],into:"++"},
        {pattern:["DEC"],into:"--"},
        {pattern:["LPAREN",{opt:"argList",name:"args"},"RPAREN"],
         into:function(caps){ return "("+(caps.args||"")+")"; }},
        {pattern:["LBRACK",{rule:"expr",name:"idx"},"RBRACK"], into:"[$idx]"},
        {pattern:["DOT",  {token:"IDENT",name:"m"}],           into:".$m"},
        {pattern:["ARROW",{token:"IDENT",name:"m"}],           into:".$m"},
        {pattern:["SCOPE",{token:"IDENT",name:"m"}],           into:".$m"},
      ]
    },
    primaryExpr: {
      variants: [
        {pattern:["KW_NULLPTR"],into:"null"},
        {pattern:["BOOL"],      into:"$1"},
        {pattern:["NUMBER"],    into:function(caps){ return caps["$1"].replace(/[fFlLuU]+$/,""); }},
        {pattern:["STRING"],    into:"$1"},
        {pattern:["CHAR"],      into:"$1"},
        {pattern:["KW_THIS"],   into:"this"},
        {pattern:["LPAREN",{rule:"expr",name:"e"},"RPAREN"],     into:"($e)"},
        {pattern:["LBRACE",{opt:"argList",name:"items"},"RBRACE"],into:"[$items]"},
        {pattern:[{rule:"qualName",name:"n"}],                    into:"$n"},
      ]
    },
    argList: {
      pattern:[{sep:"expr",by:"COMMA",name:"args"}],
      into:function(caps){ return caps.args.join(", "); }
    }
  }
};
