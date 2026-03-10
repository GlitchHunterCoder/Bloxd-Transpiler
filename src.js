var  Transpiler = (function () {
  function buildTokeniser(tokenDefs) {
    var defs = [];
    for (var name in tokenDefs) {
      var def = tokenDefs[name];
      var entry = { name: name, skip: false };
      if (typeof def === "string") {
        entry.type  = "literal";
        entry.str   = def;
        entry.re    = null;
      } else if (def instanceof RegExp) {
        entry.type  = "regex";
        entry.re    = def;
      } else {
        entry.skip  = def.skip || false;
        if (typeof def.match === "string") {
          entry.type = "literal";
          entry.str  = def.match;
        } else {
          entry.type = "regex";
          entry.re   = def.match;
        }
      }
      defs.push(entry);
    }
    return function tokenise(src) {
      var tokens = [];
      var pos    = 0;
      outer: while (pos < src.length) {
        for (var i = 0; i < defs.length; i++) {
          var def = defs[i];
          var matched = null;
          if (def.type === "literal") {
            if (src.slice(pos, pos + def.str.length) === def.str) {
              matched = def.str;
            }
          } else {
            var re = new RegExp(def.re.source, "y");
            re.lastIndex = pos;
            var m = re.exec(src);
            if (m) matched = m[0];
          }
          if (matched !== null) {
            if (!def.skip) {
              tokens.push({ type: def.name, value: matched, pos: pos });
            }
            pos += matched.length;
            continue outer;
          }
        }
        throw new Error(
          "Unexpected character " + JSON.stringify(src[pos]) +
          " at position " + pos + " near: " + JSON.stringify(src.slice(pos, pos+20))
        );
      }
      tokens.push({ type: "$EOF", value: "", pos: pos });
      return tokens;
    };
  }
  function makeCtx(initial) {
    var stacks = Object.create(null);
    var log    = [];
    if (initial) {
      for (var k in initial) stacks[k] = [initial[k]];
    }
    return {
      get: function (k) {
        var s = stacks[k];
        return s && s.length ? s[s.length - 1] : undefined;
      },
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
      mark:   function () { return log.length; },
      revert: function (m) {
        while (log.length > m) {
          var e = log.pop();
          if (e.op === "push") stacks[e.k].pop();
          else stacks[e.k].push(e.v);
        }
      }
    };
  }
  function compilePatternElement(el, rules) {
    if (typeof el === "string") {
      if (el.startsWith("$")) {
        return { kind: "literal", str: el.slice(1), capture: false };
      }
      if (el === el.toUpperCase() && /[A-Z]/.test(el)) {
        return { kind: "token", type: el, capture: true };
      }
      return { kind: "rule", rule: el, name: null, capture: true };
    }
    if (typeof el === "object" && el !== null) {
      if (el.token) {
        return { kind: "token", type: el.token, name: el.name || null, capture: true };
      }
      if (el.rule) {
        return { kind: "rule", rule: el.rule, name: el.name || null, capture: true };
      }
      if (el.literal) {
        return { kind: "literal", str: el.literal, capture: false };
      }
      if ("many" in el) {
        return {
          kind:    "many",
          inner:   compilePatternElement(el.many, rules),
          min:     0,
          name:    el.name || null,
          capture: true
        };
      }
      if ("many1" in el) {
        return {
          kind:    "many",
          inner:   compilePatternElement(el.many1, rules),
          min:     1,
          name:    el.name || null,
          capture: true
        };
      }
      if ("opt" in el) {
        return {
          kind:    "opt",
          inner:   compilePatternElement(el.opt, rules),
          name:    el.name || null,
          capture: true
        };
      }
      if ("sep" in el) {
        return {
          kind:    "sep",
          rule:    el.sep,
          sep:     el.by,
          name:    el.name || null,
          capture: true
        };
      }
      if ("seq" in el) {
        return {
          kind:    "seq",
          steps:   el.seq.map(function(e){ return compilePatternElement(e, rules); }),
          name:    el.name || null,
          capture: true
        };
      }
      if ("alt" in el) {
        return {
          kind:    "alt",
          alts:    el.alt.map(function(e){ return compilePatternElement(e, rules); }),
          name:    el.name || null,
          capture: true
        };
      }
      if ("action" in el) {
        return { kind: "action", fn: el.action, capture: false };
      }
    }
    throw new Error("Unknown pattern element: " + JSON.stringify(el));
  }
  function compilePattern(pattern, rules) {
    if (!Array.isArray(pattern)) {
      return [compilePatternElement(pattern, rules)];
    }
    return pattern.map(function(el){ return compilePatternElement(el, rules); });
  }
  function applyTemplate(template, captures, ctx) {
    if (typeof template === "function") {
      return template(captures, ctx);
    }
    if (typeof template !== "string") {
      throw new Error("into must be a string template or function, got: " + typeof template);
    }
    return template.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*|\d+)/g, function (_, key) {
      var val;
      if (/^\d+$/.test(key)) {
        val = captures["$" + key];
      } else {
        val = captures[key];
      }
      if (val === undefined) return "";
      if (Array.isArray(val)) return val.join("\n");
      return String(val);
    });
  }
  function makeState(tokens) {
    return { tokens: tokens, pos: 0 };
  }
  function stateAt(st, pos) { return { tokens: st.tokens, pos: pos }; }
  function currentTok(st)   { return st.tokens[st.pos] || { type: "$EOF", value: "" }; }
  function isEOF(st)        { return currentTok(st).type === "$EOF"; }
  function buildPrattParser(operatorTable) {
    var precMap = Object.create(null);
    for (var level = 0; level < operatorTable.length; level++) {
      var entry = operatorTable[level];
      for (var j = 0; j < entry.ops.length; j++) {
        precMap[entry.ops[j]] = { prec: level + 1, assoc: entry.assoc, into: entry.into || null };
      }
    }
    function getPrec(tok) {
      return precMap[tok.value] || precMap[tok.type] || null;
    }
    return function parsePratt(minPrec, state, ctx, parseAtom, globalEmit) {
      var left = parseAtom(state, ctx);
      if (!left.ok) return { ok: false };
      state = left.state;
      while (true) {
        var tok  = currentTok(state);
        var info = getPrec(tok);
        if (!info || info.prec < minPrec) break;
        var opVal   = tok.value || tok.type;
        var opType  = tok.type;
        var opState = stateAt(state, state.pos + 1);
        var nextMin = info.assoc === "right" ? info.prec : info.prec + 1;
        var right   = parsePratt(nextMin, opState, ctx, parseAtom, globalEmit);
        if (!right.ok) break;
        var val;
        var intoFn = info.into;
        if (typeof intoFn === "function") {
          val = intoFn(left.value, opVal, right.value, ctx);
        } else if (typeof intoFn === "string") {
          val = intoFn
            .replace("$left",  left.value)
            .replace("$right", right.value)
            .replace("$op",    opVal);
        } else if (globalEmit) {
          val = globalEmit(left.value, opVal, right.value, ctx);
        } else {
          val = left.value + " " + opVal + " " + right.value;
        }
        left  = { ok: true, value: val, state: right.state };
        state = right.state;
      }
      return left;
    };
  }
  function runGrammar(grammar, src) {
    var tokenise;
    if (grammar._tokeniser) {
      tokenise = grammar._tokeniser;
    } else if (grammar.tokens) {
      tokenise = buildTokeniser(grammar.tokens);
    } else {
      throw new Error("Grammar must define `tokens` or `_tokeniser`");
    }
    var tokens = tokenise(src);
    var st     = makeState(tokens);
    var ctx    = makeCtx(grammar.ctx || {});
    var rules  = grammar.rules || {};
    var memo   = Object.create(null);
    var parsePratt = grammar.operators
      ? buildPrattParser(grammar.operators)
      : null;
    function parseRule(name, state) {
      var mkey = name + "@" + state.pos;
      if (mkey in memo) return memo[mkey];
      var def = rules[name];
      if (!def) throw new Error("Unknown rule: " + name);
      var result;
      if (name === "expr" && parsePratt) {
        result = parsePratt(1, state, ctx, parseAtom, applyBinaryEmit);
      } else if (def.variants) {
        result = parseVariants(def.variants, state);
      } else if (def.pattern) {
        result = parseVariant(def, state);
      } else {
        throw new Error("Rule '" + name + "' must have pattern or variants");
      }
      if (result.ok) memo[mkey] = result;
      return result;
    }
    function parseVariants(variants, state) {
      var ctxMark = ctx.mark();
      for (var i = 0; i < variants.length; i++) {
        var r = parseVariant(variants[i], state);
        if (r.ok) return r;
        ctx.revert(ctxMark);
      }
      return { ok: false };
    }
    function parseVariant(variant, state) {
      var steps    = compilePattern(variant.pattern, rules);
      var captures = Object.create(null); // named captures
      var positional = [];               // $1 $2 ... (only capturing steps)
      var cur      = state;
      var ctxMark  = ctx.mark();
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        var r    = parseStep(step, cur);
        if (!r.ok) {
          ctx.revert(ctxMark);
          return { ok: false };
        }
        if (step.capture !== false) {
          positional.push(r.value);
          if (step.name) captures[step.name] = r.value;
        }
        cur = r.state;
      }
      for (var j = 0; j < positional.length; j++) {
        captures["$" + (j + 1)] = positional[j];
      }
      var into = variant.into !== undefined ? variant.into
               : (variant.pattern && typeof variant.into === "undefined" && variant.into)
               ? variant.into : variant.into;
      if (into === undefined) into = variant.into;
      var value;
      if (into === undefined || into === null) {
        value = positional.map(function(v){ return Array.isArray(v) ? v.join("") : String(v); }).join("");
      } else {
        value = applyTemplate(into, captures, ctx);
      }
      return { ok: true, value: value, state: cur };
    }
    function parseStep(step, state) {
      switch (step.kind) {
        case "token": {
          var tok = currentTok(state);
          if (tok.type !== step.type) return { ok: false };
          return { ok: true, value: tok.value, state: stateAt(state, state.pos + 1) };
        }
        case "literal": {
          var tok = currentTok(state);
          if (tok.value === step.str || tok.type === step.str) {
            return { ok: true, value: tok.value, state: stateAt(state, state.pos + 1) };
          }
          return { ok: false };
        }
        case "rule": {
          var mkey = step.rule + "@" + state.pos;
          delete memo[mkey]; // allow re-parse after backtrack
          var r = parseRule(step.rule, state);
          if (!r.ok) return { ok: false };
          return { ok: true, value: r.value, state: r.state };
        }
        case "many": {
          var results = [];
          var cur     = state;
          var ctxMark = ctx.mark();
          while (true) {
            var mkey = (step.inner.rule || step.inner.type || "?") + "@" + cur.pos;
            delete memo[mkey];
            var r = parseStep(step.inner, cur);
            if (!r.ok) break;
            results.push(r.value);
            if (r.state.pos === cur.pos) break; // zero-width guard
            cur = r.state;
          }
          if (results.length < step.min) {
            ctx.revert(ctxMark);
            return { ok: false };
          }
          return { ok: true, value: results, state: cur };
        }
        case "opt": {
          var ctxMark = ctx.mark();
          var r = parseStep(step.inner, state);
          if (r.ok) return { ok: true, value: r.value,  state: r.state };
          ctx.revert(ctxMark);
          return   { ok: true, value: "",    state: state };
        }
        case "sep": {
          var results = [];
          var cur     = state;
          var isToken = step.rule === step.rule.toUpperCase() && /[A-Z]/.test(step.rule);
          function matchElement(st) {
            if (isToken) {
              var tok = currentTok(st);
              if (tok.type !== step.rule) return { ok: false };
              return { ok: true, value: tok.value, state: stateAt(st, st.pos + 1) };
            }
            return parseRule(step.rule, st);
          }
          var first = matchElement(cur);
          if (!first.ok) return { ok: true, value: [], state: state };
          results.push(first.value);
          cur = first.state;
          while (true) {
            var sepTok = currentTok(cur);
            if (sepTok.type !== step.sep && sepTok.value !== step.sep) break;
            var nextState = stateAt(cur, cur.pos + 1);
            var r = matchElement(nextState);
            if (!r.ok) break;
            results.push(r.value);
            cur = r.state;
          }
          return { ok: true, value: results, state: cur };
        }
        case "seq": {
          var values  = [];
          var cur     = state;
          var ctxMark = ctx.mark();
          for (var i = 0; i < step.steps.length; i++) {
            var r = parseStep(step.steps[i], cur);
            if (!r.ok) { ctx.revert(ctxMark); return { ok: false }; }
            if (step.steps[i].capture !== false) values.push(r.value);
            cur = r.state;
          }
          return { ok: true, value: values, state: cur };
        }
        case "alt": {
          var ctxMark = ctx.mark();
          for (var i = 0; i < step.alts.length; i++) {
            var r = parseStep(step.alts[i], state);
            if (r.ok) return r;
            ctx.revert(ctxMark);
          }
          return { ok: false };
        }
        case "action": {
          step.fn(ctx);
          return { ok: true, value: "", state: state };
        }
        default:
          throw new Error("Unknown step kind: " + step.kind);
      }
    }
    function applyBinaryEmit(l, op, r) { return l + " " + op + " " + r; }
    function parseAtom(state) {
      var name = rules["unaryExpr"] ? "unaryExpr"
               : rules["callExpr"]  ? "callExpr"
               : rules["primary"]   ? "primary"
               : null;
      if (!name) throw new Error("Grammar needs a 'unaryExpr', 'callExpr', or 'primary' rule for expressions");
      var def = rules[name];
      if (def.variants) return parseVariants(def.variants, state);
      return parseVariant(def, state);
    }
    var startRule = grammar.start || "program";
    var result    = parseRule(startRule, st);
    if (!result.ok) {
      var tok = currentTok(st);
      throw new Error("Parse failed at start. First token: " + tok.type + "(" + JSON.stringify(tok.value) + ")");
    }
    if (!isEOF(result.state)) {
      var tok = currentTok(result.state);
      throw new Error(
        "Unconsumed input at token " + result.state.pos +
        ": " + tok.type + "(" + JSON.stringify(tok.value) + ")"
      );
    }
    return result.value;
  }
  function createTranspiler(grammarOrPasses) {
    var passes = Array.isArray(grammarOrPasses) ? grammarOrPasses : [grammarOrPasses];
    return {
      parse: function (src) {
        var cur = src;
        for (var i = 0; i < passes.length; i++) {
          cur = runGrammar(passes[i], cur);
        }
        return cur;
      }
    };
  }
  return { createTranspiler: createTranspiler };
})()
