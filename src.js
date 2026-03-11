var Transpiler = (function () {
  function buildTokeniser(tokenDefs) {
    var defs = [];
    for (var name in tokenDefs) {
      var def = tokenDefs[name];
      var entry = { name: name, skip: false, re: null, str: null };
      if (typeof def === "string") {
        entry.str = def;
      } else if (def instanceof RegExp) {
        entry.re  = def;
      } else {
        entry.skip = !!def.skip;
        if (typeof def.match === "string") entry.str = def.match;
        else                               entry.re  = def.match;
      }
      defs.push(entry);
    }
    return function tokenise(src) {
      var tokens = [];
      var pos    = 0;
      outer: while (pos < src.length) {
        for (var i = 0; i < defs.length; i++) {
          var d = defs[i], hit = null;
          if (d.str !== null) {
            if (src.slice(pos, pos + d.str.length) === d.str) hit = d.str;
          } else {
            var re = new RegExp(d.re.source, "y");
            re.lastIndex = pos;
            var m = re.exec(src);
            if (m) hit = m[0];
          }
          if (hit !== null) {
            if (!d.skip) tokens.push({ type: d.name, value: hit, pos: pos });
            pos += hit.length;
            continue outer;
          }
        }
        throw new Error(
          "Unexpected character " + JSON.stringify(src[pos]) +
          " at position " + pos + " (near: " + JSON.stringify(src.slice(pos, pos + 20)) + ")"
        );
      }
      tokens.push({ type: "$EOF", value: "", pos: pos });
      return tokens;
    };
  }
  function buildIndentTokeniser(tokenDefs, commentChar) {
    commentChar = commentChar || "#";
    var lineTokeniser = buildTokeniser(tokenDefs);
    return function tokenise(src) {
      var tokens      = [];
      var indentStack = [0];
      var lines       = src.split("\n");
      var lineStart   = 0;
      for (var li = 0; li < lines.length; li++) {
        var raw  = lines[li];
        var line = raw;
        var ci   = 0;
        while (ci < line.length && (line[ci] === " " || line[ci] === "\t")) ci++;
        if (ci < line.length && line[ci] === commentChar) {
          lineStart += raw.length + 1;
          continue;
        }
        if (!line.trim()) { lineStart += raw.length + 1; continue; }
        var col = 0;
        for (var i = 0; i < line.length; i++) {
          if      (line[i] === " ")  col++;
          else if (line[i] === "\t") col = Math.ceil((col + 1) / 4) * 4;
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
        var content = line.trimLeft();
        var offset  = lineStart + (line.length - content.length);
        var lineToks = lineTokeniser(content);
        for (var t = 0; t < lineToks.length - 1; t++) {
          var tok = lineToks[t];
          tokens.push({ type: tok.type, value: tok.value, pos: offset + tok.pos });
        }
        tokens.push({ type: "NEWLINE", value: "\n", pos: lineStart + raw.length });
        lineStart += raw.length + 1;
      }
      while (indentStack.length > 1) {
        indentStack.pop();
        tokens.push({ type: "DEDENT", value: "", pos: lineStart });
      }
      tokens.push({ type: "$EOF", value: "", pos: lineStart });
      return tokens;
    };
  }
  function makeCtx(initial) {
    var stacks = Object.create(null);
    var log    = [];
    stacks["indent"] = [0];
    if (initial) {
      for (var k in initial) {
        stacks[k] = [initial[k]];
      }
    }
    function peek(k) {
      var s = stacks[k];
      return (s && s.length) ? s[s.length - 1] : undefined;
    }
    return {
      get: peek,
      indent: function() { return makeIndentStr(peek("indent") || 0); },
      set: function (k, v) {
        if (!stacks[k]) stacks[k] = [];
        stacks[k].push(v);
        log.push({ op: "push", k: k });
      },
      pop: function (k) {
        var s = stacks[k];
        if (!s || !s.length) throw new Error("ctx underflow: " + k);
        var v = s.pop();
        log.push({ op: "pop", k: k, v: v });
        return v;
      },
      mark:   function ()  { return log.length; },
      revert: function (m) {
        while (log.length > m) {
          var e = log.pop();
          if (e.op === "push") stacks[e.k].pop();
          else                 stacks[e.k].push(e.v);
        }
      }
    };
  }
  function compileEl(el) {
    if (typeof el === "string") {
      if (el.startsWith("$")) return { kind: "literal", str: el.slice(1), capture: false };
      if (el === el.toUpperCase() && /[A-Z_]/.test(el)) return { kind: "token",   type: el,  capture: true };
      return                                                    { kind: "rule",    rule: el,  capture: true };
    }
    if (typeof el !== "object" || el === null) throw new Error("Bad pattern element: " + JSON.stringify(el));
    if (el.token)  return { kind: "token",  type:  el.token,  name: el.name||null, capture: true };
    if (el.rule)   return { kind: "rule",   rule:  el.rule,   name: el.name||null, capture: true };
    if (el.literal)return { kind: "literal",str:   el.literal,                     capture: false };
    if ("many1" in el) return { kind: "many",  inner: compileEl(el.many1), min: 1, name: el.name||null, capture: true };
    if ("many"  in el) return { kind: "many",  inner: compileEl(el.many),  min: 0, name: el.name||null, capture: true };
    if ("opt"   in el) return { kind: "opt",   inner: compileEl(el.opt),           name: el.name||null, capture: true };
    if ("sep"   in el) return { kind: "sep",   rule:  el.sep,  sep: el.by,         name: el.name||null, capture: true };
    if ("alt"   in el) return { kind: "alt",   alts:  el.alt.map(compileEl),       name: el.name||null, capture: true };
    if ("seq"   in el) return { kind: "seq",   steps: el.seq.map(compileEl),       name: el.name||null, capture: true };
    if ("action" in el) return { kind: "action", fn: el.action, capture: false };
    throw new Error("Unknown pattern element: " + JSON.stringify(el));
  }
  function compilePattern(pattern) {
    if (!Array.isArray(pattern)) return [compileEl(pattern)];
    return pattern.map(compileEl);
  }
  function applyTemplate(into, caps, ctx) {
    if (typeof into === "function") return into(caps, ctx);
    if (typeof into !== "string")   return String(into);
    var indStr = makeIndentStr(ctx.get("indent") || 0);
    return into.replace(/\$([a-zA-Z_$][a-zA-Z0-9_$]*|\d+)/g, function (_, key) {
      if (key === "indent")  return indStr;
      var v = /^\d+$/.test(key) ? caps["$" + key] : caps[key];
      if (v === undefined)   return "";
      if (Array.isArray(v))  return v.join("\n");
      return String(v);
    });
  }
  function makeIndentStr(level) {
    var s = "";
    for (var i = 0; i < level; i++) s += "    ";
    return s;
  }
  function buildPratt(opTable) {
    var precMap = Object.create(null);
    for (var level = 0; level < opTable.length; level++) {
      var entry = opTable[level];
      for (var j = 0; j < entry.ops.length; j++) {
        precMap[entry.ops[j]] = { prec: level + 1, assoc: entry.assoc, into: entry.into || null };
      }
    }
    function infoFor(tok) {
      return precMap[tok.value] || precMap[tok.type] || null;
    }
    return function parsePratt(minPrec, state, ctx, parseAtom) {
      var left = parseAtom(state, ctx);
      if (!left.ok) return { ok: false };
      state = left.state;
      while (true) {
        var tok  = curTok(state);
        var info = infoFor(tok);
        if (!info || info.prec < minPrec) break;
        var opVal  = tok.value || tok.type;
        var opType = tok.type;
        var next   = advState(state);
        var nmin   = info.assoc === "right" ? info.prec : info.prec + 1;
        var right  = parsePratt(nmin, next, ctx, parseAtom);
        if (!right.ok) break;
        var val;
        if (typeof info.into === "function") {
          val = info.into(left.value, opVal, right.value, ctx);
        } else if (typeof info.into === "string") {
          val = info.into
            .replace("$left",  left.value)
            .replace("$right", right.value)
            .replace("$op",    opVal);
        } else {
          val = left.value + " " + opVal + " " + right.value;
        }
        left  = { ok: true, value: val, state: right.state };
        state = right.state;
      }
      return left;
    };
  }
  function makeState(tokens) { return { tokens: tokens, pos: 0 }; }
  function curTok(st)        { return st.tokens[st.pos] || { type: "$EOF", value: "" }; }
  function advState(st)      { return { tokens: st.tokens, pos: st.pos + 1 }; }
  function atState(st, pos)  { return { tokens: st.tokens, pos: pos }; }
  function isEOF(st)         { return curTok(st).type === "$EOF"; }
  function stateSnip(st)     {
    var t = curTok(st);
    return t.type + "(" + JSON.stringify(t.value) + ")";
  }
  function runGrammar(grammar, src) {
    if (!grammar.tokens) throw new Error("Grammar must define `tokens`");
    var tokenise = grammar.indentMode
      ? buildIndentTokeniser(grammar.tokens, grammar.commentChar)
      : buildTokeniser(grammar.tokens);
    var tokens = tokenise(src);
    var state  = makeState(tokens);
    var ctx    = makeCtx(grammar.ctx || {});
    var rules  = grammar.rules || {};
    var pratt  = grammar.operators ? buildPratt(grammar.operators) : null;
    var memo   = Object.create(null);
    function parseRule(name, st) {
      var mk = name + "@" + st.pos;
      if (mk in memo) return memo[mk];
      var def = rules[name];
      if (name === "expr" && pratt) {
        var r = pratt(1, st, ctx, parseAtom);
        if (r.ok) memo[mk] = r;
        return r;
      }
      if (!def) throw new Error("Unknown rule: " + name);
      var r;
      if (def.variants) {
        r = parseVariants(def.variants, st);
      } else if (def.pattern) {
        r = parseVariant(def, st);
      } else {
        throw new Error("Rule '" + name + "' needs `pattern` or `variants`");
      }
      if (r.ok) memo[mk] = r;
      return r;
    }
    function parseVariants(variants, st) {
      var mark = ctx.mark();
      for (var i = 0; i < variants.length; i++) {
        var r = parseVariant(variants[i], st);
        if (r.ok) return r;
        ctx.revert(mark);
      }
      return { ok: false };
    }
    function parseVariant(variant, st) {
      var steps      = compilePattern(variant.pattern);
      var caps       = Object.create(null);
      var positional = [];
      var cur        = st;
      var mark       = ctx.mark();
      for (var i = 0; i < steps.length; i++) {
        var r = parseStep(steps[i], cur);
        if (!r.ok) { ctx.revert(mark); return { ok: false }; }
        if (steps[i].capture !== false) {
          positional.push(r.value);
          if (steps[i].name) caps[steps[i].name] = r.value;
        }
        cur = r.state;
      }
      for (var j = 0; j < positional.length; j++) caps["$" + (j + 1)] = positional[j];
      var into  = variant.into;
      var value = (into === undefined || into === null)
        ? positional.map(function(v){ return Array.isArray(v) ? v.join("") : String(v); }).join("")
        : applyTemplate(into, caps, ctx);
      return { ok: true, value: value, state: cur };
    }
    function parseStep(step, st) {
      switch (step.kind) {
        case "token": {
          var tok = curTok(st);
          if (tok.type !== step.type) return { ok: false };
          var val = applyStepEmit(step, tok.value);
          return { ok: true, value: val, state: advState(st) };
        }
        case "literal": {
          var tok = curTok(st);
          if (tok.value !== step.str && tok.type !== step.str) return { ok: false };
          return { ok: true, value: tok.value, state: advState(st) };
        }
        case "rule": {
          var r = parseRule(step.rule, st);
          if (!r.ok) return { ok: false };
          return { ok: true, value: r.value, state: r.state };
        }
        case "many": {
          var results = [], cur = st, mark = ctx.mark();
          while (true) {
            var r = parseStep(step.inner, cur);
            if (!r.ok) break;
            results.push(r.value);
            if (r.state.pos === cur.pos) break; // zero-width guard
            cur = r.state;
          }
          if (results.length < step.min) { ctx.revert(mark); return { ok: false }; }
          return { ok: true, value: results, state: cur };
        }
        case "opt": {
          var mark = ctx.mark();
          var r    = parseStep(step.inner, st);
          if (r.ok) return { ok: true, value: r.value, state: r.state };
          ctx.revert(mark);
          return { ok: true, value: "", state: st };
        }
        case "sep": {
          var isToken = step.rule === step.rule.toUpperCase() && /[A-Z]/.test(step.rule);
          function matchElem(s) {
            if (isToken) {
              var t = curTok(s);
              if (t.type !== step.rule) return { ok: false };
              return { ok: true, value: t.value, state: advState(s) };
            }
            return parseRule(step.rule, s);
          }
          var results = [], cur = st;
          var first = matchElem(cur);
          if (!first.ok) return { ok: true, value: [], state: st };
          results.push(first.value); cur = first.state;
          while (true) {
            var sep = curTok(cur);
            if (sep.type !== step.sep && sep.value !== step.sep) break;
            var after = matchElem(advState(cur));
            if (!after.ok) break;
            results.push(after.value); cur = after.state;
          }
          return { ok: true, value: results, state: cur };
        }
        case "alt": {
          var mark = ctx.mark();
          for (var i = 0; i < step.alts.length; i++) {
            var r = parseStep(step.alts[i], st);
            if (r.ok) return r;
            ctx.revert(mark);
          }
          return { ok: false };
        }
        case "seq": {
          var values = [], cur = st, mark = ctx.mark();
          for (var i = 0; i < step.steps.length; i++) {
            var r = parseStep(step.steps[i], cur);
            if (!r.ok) { ctx.revert(mark); return { ok: false }; }
            if (step.steps[i].capture !== false) values.push(r.value);
            cur = r.state;
          }
          return { ok: true, value: values, state: cur };
        }
        case "action": {
          step.fn(ctx);
          return { ok: true, value: "", state: st };
        }
        default:
          throw new Error("Unknown step kind: " + step.kind);
      }
    }
    function applyStepEmit(step, val) { return val; }
    function parseAtom(st) {
      var name = rules["unaryExpr"] ? "unaryExpr"
               : rules["callExpr"]  ? "callExpr"
               : rules["primary"]   ? "primary"
               : null;
      if (!name) throw new Error("Grammar needs 'unaryExpr', 'callExpr', or 'primary' for expr atoms");
      var def = rules[name];
      if (def.variants) return parseVariants(def.variants, st);
      return parseVariant(def, st);
    }
    var startRule = grammar.start || "program";
    var result    = parseRule(startRule, state);
    if (!result.ok) throw new Error("Parse failed at: " + stateSnip(state));
    if (!isEOF(result.state)) throw new Error("Unconsumed input at: " + stateSnip(result.state));
    return result.value;
  }
  function createTranspiler(grammarOrPasses) {
    var passes = Array.isArray(grammarOrPasses) ? grammarOrPasses : [grammarOrPasses];
    return {
      parse: function (src) {
        var cur = src;
        for (var i = 0; i < passes.length; i++) cur = runGrammar(passes[i], cur);
        return cur;
      }
    };
  }
  return { createTranspiler: createTranspiler };
})()
