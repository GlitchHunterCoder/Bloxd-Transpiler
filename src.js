// ——— Context Implementation ———
function createCtx(initial = {}) {
  const stacks = Object.create(null); // per-variable history
  const instr = [];

  // initialize stacks
  for (const k in initial) {
    stacks[k] = [initial[k]];
  }

  function pushVar(key, value) {
    (stacks[key] ??= []).push(value);
    instr.push(key);
  }

  function popVar(key) {
    const stack = stacks[key];
    if (!stack || stack.length === 0) throw new Error("ctx underflow: " + key);
    stack.pop();
    instr.push(key);
  }

  return new Proxy({}, {
    get(_, prop) {
      if (prop === "instr") return instr;

      if (!(prop in stacks)) return undefined;
      const stack = stacks[prop];
      return stack[stack.length - 1];
    },

    set(_, prop, value) {
      if (prop === "instr") throw new Error("Direct assignment to ctx.instr is forbidden");

      if (value === undefined) {
        popVar(prop);
      } else {
        pushVar(prop, value);
      }
      return true;
    },

    deleteProperty() {
      throw new Error("Use ctx.var = undefined to pop");
    }
  });
}

// ——— Parser with integrated ctx ———
function createObjectTranspiler(grammar, options = {}) {
  const evalNow = options.evalNow ?? false;
  const passes = Array.isArray(grammar) ? grammar : [grammar];

  function Parse(ruleObj, src, ctx) {
    const mainKeys = ruleObj.main || [];

    for (const key of mainKeys) {
      const subRule = ruleObj[key];
      if (!subRule) continue;

      const symbols = subRule.match || [];
      const values = [];
      let rest = src;
      let matched = true;

      const mark = ctx.instr.length; // snapshot ctx for rollback

      for (const sym of symbols) {
        if (typeof sym === "string") {
          if (rest.startsWith(sym)) {
            values.push(sym);
            rest = rest.slice(sym.length);
          } else {
            matched = false;
            break;
          }
        }

        else if (sym instanceof RegExp) {
          const m = rest.match(sym);
          if (m && m.index === 0) {
            values.push(m[0]);
            rest = rest.slice(m[0].length);
          } else {
            matched = false;
            break;
          }
        }

        else if (typeof sym === "object") {
          try {
            const r = Parse(sym, rest, ctx);
            values.push(r.value);
            rest = r.rest;
          } catch {
            matched = false;
            break;
          }
        }

        else if (typeof sym === "function") {
          // optional predicate matcher: must return true to match
          // note: predicate must NOT consume input (it only peeks)
          if (!sym(rest, ctx)) {
            matched = false;
            break;
          }
        }

        else {
          throw new Error("Unknown symbol type: " + sym);
        }
      }

      if (matched) {
        const out = subRule.emit
          ? subRule.emit(values, ctx)
          : values.join("");

        return { value: evalNow ? eval(out) : out, rest };
      }

      // rollback ctx if failed
      while (ctx.instr.length > mark) {
        const key = ctx.instr.pop();
        // pop that variable's stack by setting to undefined
        ctx[key] = undefined;
      }
    }

    throw new Error("No rule matched for input: " + src.slice(0, 50));
  }

  function runPass(passGrammar, src, ctx) {
    const result = Parse(passGrammar.main, src, ctx);
    if (result.rest.length !== 0) {
      throw new Error("Unconsumed input: " + result.rest.slice(0, 50));
    }
    return result.value;
  }

  return {
    Parse(src) {
      const ctx = createCtx({ indent: 0 }); // top-level indent = 0
      let cur = src;
      for (const pass of passes) {
        cur = runPass(pass, cur, ctx);
      }
      return cur;
    }
  };
}
