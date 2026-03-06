// ——— Python -> JS grammar (indentation-aware) ———
const grammar = (function () {
  let STR
  const Normalize = { main: ["rec", "empty"] };

  Normalize.string = {
    match: [STR, Normalize],
    emit: ([s, rest]) => s + rest
  };

  Normalize.indent = {
    match: [/^\n?[ ]+/, Normalize],
    emit: ([spaces, rest]) => spaces + rest
  };

  Normalize.space = {
    match: [/^[ \t]+/, Normalize],
    emit: ([_, rest]) => rest
  };

  Normalize.char = {
    match: [/^./, Normalize],
    emit: ([c, rest]) => c + rest
  };

  Normalize.rec = {
    main: ["string", "indent", "space", "char"]
  };

  Normalize.empty = {
    match: [],
    emit: () => ""
  };
  
  const Statement = {
    main: ["assign", "def", "if", "for", "while", "return", "expr"]
  };
  const StatementRef = Statement;
  // tiny helpers
  const NUM = { main: ["num"], num: { match: [/^[0-9]+(?:\.[0-9]+)?/], emit: ([n]) => n } };
  STR = { main: ["s"], s: { match: [/^"([^"\\]|\\.)*"/, /^'([^'\\]|\\.)*'/], emit: ([s]) => s } };
  const ID = { main: ["id"], id: { match: [/^[A-Za-z_][A-Za-z0-9_]*/], emit: ([i]) => i } };

  // expression forward ref
  const ExprRef = {};

  // Primary (id, num, str, paren, list, dict, call)
  const Primary = { main: ["number", "string", "id", "paren", "list", "dict", "call"] };
  Primary.number = { match: [NUM], emit: ([n]) => n };
  Primary.string = { match: [STR], emit: ([s]) => s };
  Primary.id = { match: [ID], emit: ([i]) => i };

  Primary.paren = { match: ["(", ExprRef, ")"], emit: ([_, e, __]) => `(${e})` };

  // ArgList (comma separated expressions)
  const ArgList = {};
  ArgList.rec = { match: [ExprRef, /^[ \t]*,/, ArgList], emit: ([a, _, rest]) => `${a},${rest}` };
  ArgList.one = { match: [ExprRef], emit: ([a]) => `${a}` };
  ArgList.empty = { match: [], emit: () => "" };
  ArgList.main = ["rec", "one", "empty"];

  Primary.list = { match: ["[", ArgList, "]"], emit: ([_, list, __]) => `[${list || ""}]` };

  // dict as basic { k: v, ... } using ArgList where items are "k:expr"
  const KV = { main: ["one", "empty"] };
  KV.one = { match: [/^[A-Za-z_][A-Za-z0-9_]*|^"([^"\\]|\\.)*"|^'([^'\\]|\\.)*'/, ":", ExprRef], emit: ([k, _, v]) => `${k}:${v}` };
  KV.empty = { match: [], emit: () => "" };
  const DictList = {};
  DictList.rec = { match: [KV, /^[ \t]*,/, DictList], emit: ([a, _, rest]) => `${a},${rest}` };
  DictList.one = { match: [KV], emit: ([a]) => a };
  DictList.main = ["rec", "one", "empty"];
  Primary.dict = { match: ["{", DictList, "}"], emit: ([_, list, __]) => `{${list || ""}}` };

  // call
  Primary.call = { match: [ID, "(", ArgList, ")"], emit: ([fn, _, args, __]) => `${fn}(${args || ""})` };

  // Factor / unary (support 'not')
  const Factor = { main: ["unary", "primary"] };
  Factor.unary = { match: [/^not\b/, Primary], emit: ([_, p]) => `(!(${p}))` };
  Factor.primary = { match: [Primary], emit: ([p]) => p };

  // Term: * / %
  const Term = { main: ["rec", "one"] };
  Term.rec = { match: [Factor, /^[ \t]*[*\/%]/, Term], emit: ([a, op, b]) => `(${a}${op.trim()}${b})` };
  Term.one = { match: [Factor], emit: ([f]) => f };

  // Add/Sub
  const ExprAdd = { main: ["rec", "one"] };
  ExprAdd.rec = { match: [Term, /^[ \t]*[+\-]/, ExprAdd], emit: ([a, op, b]) => `(${a}${op.trim()}${b})` };
  ExprAdd.one = { match: [Term], emit: ([t]) => t };

  // Comparisons
  const Comp = { main: ["cmp", "add"] };
  Comp.cmp = { match: [ExprAdd, /^[ \t]*(?:==|!=|<=|>=|<|>)/, Comp], emit: ([a, op, b]) => `(${a}${op.trim()}${b})` };
  Comp.add = { match: [ExprAdd], emit: ([x]) => x };

  // Boolean
  const Bool = { main: ["or", "and", "comp"] };
  Bool.or = { match: [Comp, /^[ \t]*\bor\b/, Bool], emit: ([a, _, b]) => `(${a} || ${b})` };
  Bool.and = { match: [Comp, /^[ \t]*\band\b/, Bool], emit: ([a, _, b]) => `(${a} && ${b})` };
  Bool.comp = { match: [Comp], emit: ([c]) => c };

  Object.assign(ExprRef, Bool);

  // ---------- Statement-level ----------

  // simple assignment a = expr  (not supporting tuple unpacking here)
  const Assign = { main: ["assign"] };
  Assign.assign = { match: [ID, /^[ \t]*=(?!=)/, ExprRef], emit: ([id, _, expr], ctx) => `${"  ".repeat(ctx.indent)}${id} = ${expr};` };

  // return
  const ReturnStmt = { main: ["ret"] };
  ReturnStmt.ret = { match: [/^return\b/, ExprRef], emit: ([_, e], ctx) => `${"  ".repeat(ctx.indent)}return ${e};` };

  // Expr as statement (call / bare expr)
  const ExprStmt = { main: ["expr"] };
  ExprStmt.expr = { match: [ExprRef], emit: ([e], ctx) => `${"  ".repeat(ctx.indent)}${e};` };

  // IndentIncrease: consumes newline(s) followed by spaces and pushes ctx.indent = spaceCount
  const IndentIncrease = {
    main: ["inc"],
    inc: {
      match: [/^\n+/, /^[ ]+/],
      emit: ([newlines, spaces], ctx) => {
        const newIndent = spaces.length;
        const cur = ctx.indent ?? 0;
        if (newIndent <= cur) throw new Error("Indent not greater than current");
        ctx.indent = newIndent; // push new indent
        return newlines; // emit the newline(s) (we'll not use them, but they are consumed)
      }
    }
  };

  // IndentedLine: consumes leading spaces then a statement and trailing newline/EOF,
  // ensures leading spaces length === ctx.indent
  const IndentedLine = {
    main: ["line"],
    line: {
      match: [/^[ ]*/, StatementRef, /^[ \t]*(?:\n|$)/],
      emit: ([spaces, stmt, _], ctx) => {
        const n = (spaces || "").length;
        if ((ctx.indent ?? 0) !== n) throw new Error("Indent mismatch");
        // stmt already contains indentation applied by its emit; but some statements
        // (like Assign/Return/ExprStmt) include ctx.indent indentation. To keep things consistent
        // we return stmt as-is (it already used ctx.indent).
        return stmt;
      }
    }
  };

  // Block: one or more IndentedLine (uses recursion)
  const Block = { main: ["rec", "one"] };
  Block.rec = { match: [IndentedLine, Block], emit: ([line, rest], ctx) => `${line}\n${rest}` };
  Block.one = { match: [IndentedLine], emit: ([line]) => line };

  // If statement: supports either inline "if x: stmt" OR block form
  const IfStmt = { main: ["ifblock", "ifinline"] };

  // block form: if EXPR : <IndentIncrease> <Block>   (emit pops indent after rendering block)
  IfStmt.ifblock = {
    match: [/^if\b/, ExprRef, /^[ \t]*:/, IndentIncrease, Block, /^[ ]*(?:\n|$)/],
    emit: ([_, cond, __, _inc, block], ctx) => {
      // block contains lines already indented using ctx when parsed.
      // We must pop the indent pushed by IndentIncrease:
      ctx.indent = undefined; // pop
      const s = "  ".repeat((ctx.indent ?? 0)); // outer indent
      // wrap block with braces; block already contains fully indented lines and trailing newlines removed except between lines.
      return `${s}if(${cond}){\n${block}\n${s}}`;
    }
  };

  // inline form: if EXPR: STMT [ else: STMT ]
  IfStmt.ifinline = {
    match: [/^if\b/, ExprRef, /^[ \t]*:/, StatementRef, /^[ \t]*?(?:\n|$)/, /^else\b/, /^[ \t]*:/, StatementRef],
    emit: ([_, cond, __, s1, __2, _else, __3, s2], ctx) => {
      const s = "  ".repeat(ctx.indent);
      return `${s}if(${cond}){ ${s1} } else { ${s2} }`;
    }
  };

  // While statement (block form supported)
  const WhileStmt = { main: ["block", "inline"] };
  WhileStmt.block = {
    match: [/^while\b/, ExprRef, /^[ \t]*:/, IndentIncrease, Block, /^[ ]*(?:\n|$)/],
    emit: ([_, cond, __, _inc, block], ctx) => {
      ctx.indent = undefined;
      const s = "  ".repeat((ctx.indent ?? 0));
      return `${s}while(${cond}){\n${block}\n${s}}`;
    }
  };
  WhileStmt.inline = {
    match: [/^while\b/, ExprRef, /^[ \t]*:/, StatementRef],
    emit: ([_, cond, __, stmt], ctx) => `${"  ".repeat(ctx.indent)}while(${cond}){ ${stmt} }`
  };

  // For (with range) supports block form
  const ForStmt = { main: ["block", "inline"] };
  ForStmt.block = {
    match: [/^for\b/, ID, /^[ \t]*in\b/, /^range\b/, "(", ArgList, ")", /^[ \t]*:/, IndentIncrease, Block, /^[ ]*(?:\n|$)/],
    emit: ([_, id, __, ___, ____, args, __2, _inc, block], ctx) => {
      ctx.indent = undefined;
      const parts = (args || "").split(",").map(s => s.trim()).filter(Boolean);
      const s = "  ".repeat((ctx.indent ?? 0));
      let header;
      if (parts.length === 1) header = `for(let ${id}=0; ${id}<${parts[0]}; ${id}++)`;
      else header = `for(let ${id}=${parts[0]}; ${id}<${parts[1]}; ${id}++)`;
      return `${s}${header}{\n${block}\n${s}}`;
    }
  };
  ForStmt.inline = {
    match: [/^for\b/, ID, /^[ \t]*in\b/, /^range\b/, "(", ArgList, ")", /^[ \t]*:/, StatementRef],
    emit: ([_, id, __, ___, ____, args, __2, stmt], ctx) => {
      const parts = (args || "").split(",").map(s => s.trim()).filter(Boolean);
      if (parts.length === 1) return `${"  ".repeat(ctx.indent)}for(let ${id}=0; ${id}<${parts[0]}; ${id}++){ ${stmt} }`;
      else return `${"  ".repeat(ctx.indent)}for(let ${id}=${parts[0]}; ${id}<${parts[1]}; ${id}++){ ${stmt} }`;
    }
  };

  // def (function) with block body
  const FuncDef = { main: ["block", "inline"] };
  FuncDef.block = {
    match: [/^def\b/, ID, "(", ArgList, ")", /^[ \t]*:/, IndentIncrease, Block, /^[ ]*(?:\n|$)/],
    emit: ([_, name, __, args, ___, _inc, block], ctx) => {
      ctx.indent = undefined;
      const s = "  ".repeat((ctx.indent ?? 0));
      // convert block to function body: ensure returns for expression lines? Keep simple: leave body as-is.
      return `${s}function ${name}(${args || ""}){\n${block}\n${s}}`;
    }
  };
  FuncDef.inline = {
    match: [/^def\b/, ID, "(", ArgList, ")", /^[ \t]*:/, StatementRef],
    emit: ([_, name, __, args, ___, stmt], ctx) => `${"  ".repeat(ctx.indent)}function ${name}(${args || ""}){ return ${stmt.replace(/;$/, "")}; }`
  };

  // StatementRef union
  Statement.assign = { match: [Assign], emit: ([a]) => a };
  Statement.def = { match: [FuncDef], emit: ([d]) => d };
  Statement.if = { match: [IfStmt], emit: ([i]) => i };
  Statement.for = { match: [ForStmt], emit: ([f]) => f };
  Statement.while = { match: [WhileStmt], emit: ([w]) => w };
  Statement.return = { match: [ReturnStmt], emit: ([r]) => r };
  Statement.expr = { match: [ExprStmt], emit: ([e]) => e };

  // Program: series of top-level lines (each line enforces it starts at ctx.indent)
  const Line = {
    main: ["line"],
    line: {
      match: [/^[ ]*/, StatementRef, /^[ \t]*(?:\n|$)/],
      emit: ([spaces, stmt, _], ctx) => {
        const n = (spaces || "").length;
        if ((ctx.indent ?? 0) !== n) throw new Error("Top-level indent mismatch");
        return stmt;
      }
    }
  };

  const Program = { main: ["rec", "one", "empty"] };
  Program.rec = { match: [Line, Program], emit: ([l, rest]) => `${l}\n${rest}` };
  Program.one = { match: [Line], emit: ([l]) => l };
  Program.empty = { match: [], emit: () => "" };

  // expose essential refs
  return {
    main: Program,
    Normalize,
    Program,
    StatementRef,
    ExprRef,
    ID, NUM, STR,
    // supporting helpers so user can reuse them if needed:
    IndentIncrease, IndentedLine, Block
  };
})();
