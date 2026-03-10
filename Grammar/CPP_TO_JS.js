function splitTopArgs(s) {
  var args = [], depth = 0, cur = "";
  for (var i = 0; i < s.length; i++) {
    var c = s[i];
    if (c === "(" || c === "[") { depth++; cur += c; }
    else if (c === ")" || c === "]") { depth--; cur += c; }
    else if (c === "," && depth === 0) { args.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

var CPP_TO_JS = (function () {
  function cppTokenise(src) {
    var tokens = [];
    var pos    = 0;
    var len    = src.length;
    function ch(offset) { return src[pos + (offset||0)]; }
    function rest()     { return src.slice(pos); }
    var KEYWORDS = {
      'if':1,'else':1,'while':1,'do':1,'for':1,'return':1,'break':1,'continue':1,
      'class':1,'struct':1,'public':1,'private':1,'protected':1,
      'new':1,'delete':1,'this':1,'namespace':1,'using':1,'typedef':1,
      'typename':1,'template':1,'try':1,'catch':1,'throw':1,
      'operator':1,'sizeof':1,'friend':1,'mutable':1,'virtual':1,
      'override':1,'explicit':1,'inline':1,'static':1,'const':1,
      'enum':1,'union':1,'extern':1,'register':1,'volatile':1,'noexcept':1
    };
    var TYPES = {
      'int':1,'long':1,'short':1,'unsigned':1,'signed':1,'float':1,'double':1,
      'bool':1,'char':1,'wchar_t':1,'void':1,'auto':1,'size_t':1,'string':1,
      'wstring':1,'int8_t':1,'int16_t':1,'int32_t':1,'int64_t':1,
      'uint8_t':1,'uint16_t':1,'uint32_t':1,'uint64_t':1,'ptrdiff_t':1
    };
    while (pos < len) {
      var c = ch();
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { pos++; continue; }
      if (c === '/' && ch(1) === '/') {
        while (pos < len && ch() !== '\n') pos++;
        continue;
      }
      if (c === '/' && ch(1) === '*') {
        pos += 2;
        while (pos < len && !(ch() === '*' && ch(1) === '/')) pos++;
        pos += 2;
        continue;
      }
      if (c === '#') {
        var start = pos;
        while (pos < len && ch() !== '\n') pos++;
        tokens.push({ type:'PREPROC', value: src.slice(start, pos), pos: start });
        continue;
      }
      if (c === '"') {
        var start = pos; pos++;
        while (pos < len && ch() !== '"') { if (ch() === '\\') pos++; pos++; }
        pos++;
        tokens.push({ type:'STRING', value: src.slice(start, pos), pos: start });
        continue;
      }
      if (c === "'") {
        var start = pos; pos++;
        while (pos < len && ch() !== "'") { if (ch() === '\\') pos++; pos++; }
        pos++;
        tokens.push({ type:'CHAR', value: src.slice(start, pos), pos: start });
        continue;
      }
      if (c >= '0' && c <= '9') {
        var m = rest().match(/^(0x[0-9a-fA-F]+[uUlL]*|[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?[fFlLuU]*)/);
        var val = m ? m[0] : c;
        tokens.push({ type:'NUMBER', value: val, pos: pos }); pos += val.length; continue;
      }
      if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
        var m = rest().match(/^[A-Za-z_][A-Za-z0-9_]*/);
        var word = m[0];
        var type;
        if (word === 'nullptr' || word === 'NULL') type = 'KW_NULLPTR';
        else if (word === 'true' || word === 'false') type = 'BOOL';
        else if (KEYWORDS[word]) type = 'KW_' + word.toUpperCase();
        else if (TYPES[word])    type = 'TYPENAME';
        else                     type = 'IDENT';
        tokens.push({ type: type, value: word, pos: pos }); pos += word.length; continue;
      }
      var two = src.slice(pos, pos+2);
      var three = src.slice(pos, pos+3);
      if (three === '...') { tokens.push({ type:'ELLIPSIS', value:'...', pos:pos }); pos+=3; continue; }
      if (two === '::') { tokens.push({ type:'SCOPE',    value:'::', pos:pos }); pos+=2; continue; }
      if (two === '->') { tokens.push({ type:'ARROW',    value:'->', pos:pos }); pos+=2; continue; }
      if (two === '==') { tokens.push({ type:'EQ',       value:'==', pos:pos }); pos+=2; continue; }
      if (two === '!=') { tokens.push({ type:'NEQ',      value:'!=', pos:pos }); pos+=2; continue; }
      if (two === '<=') { tokens.push({ type:'LEQ',      value:'<=', pos:pos }); pos+=2; continue; }
      if (two === '>=') { tokens.push({ type:'GEQ',      value:'>=', pos:pos }); pos+=2; continue; }
      if (two === '+=') { tokens.push({ type:'PLUS_EQ',  value:'+=', pos:pos }); pos+=2; continue; }
      if (two === '-=') { tokens.push({ type:'MINUS_EQ', value:'-=', pos:pos }); pos+=2; continue; }
      if (two === '*=') { tokens.push({ type:'STAR_EQ',  value:'*=', pos:pos }); pos+=2; continue; }
      if (two === '/=') { tokens.push({ type:'SLASH_EQ', value:'/=', pos:pos }); pos+=2; continue; }
      if (two === '%=') { tokens.push({ type:'PERCENT_EQ',value:'%=',pos:pos }); pos+=2; continue; }
      if (two === '&=') { tokens.push({ type:'AMP_EQ',   value:'&=', pos:pos }); pos+=2; continue; }
      if (two === '|=') { tokens.push({ type:'PIPE_EQ',  value:'|=', pos:pos }); pos+=2; continue; }
      if (two === '&&') { tokens.push({ type:'AND',      value:'&&', pos:pos }); pos+=2; continue; }
      if (two === '||') { tokens.push({ type:'OR',       value:'||', pos:pos }); pos+=2; continue; }
      if (two === '++') { tokens.push({ type:'INC',      value:'++', pos:pos }); pos+=2; continue; }
      if (two === '--') { tokens.push({ type:'DEC',      value:'--', pos:pos }); pos+=2; continue; }
      if (two === '<<') { tokens.push({ type:'LSHIFT',   value:'<<', pos:pos }); pos+=2; continue; }
      if (two === '>>') { tokens.push({ type:'GT', value:'>', pos:pos }); tokens.push({ type:'GT', value:'>', pos:pos+1 }); pos+=2; continue; }
      var SINGLES = {'(':'LPAREN',')':'RPAREN','{':'LBRACE','}':'RBRACE',
        '[':'LBRACK',']':'RBRACK',';':'SEMI',',':'COMMA','.':'DOT',
        '?':'QMARK',':':'COLON','~':'TILDE','!':'BANG','&':'AMP','|':'PIPE',
        '^':'XOR','%':'PERCENT','*':'STAR','/':'SLASH','+':'PLUS',
        '-':'MINUS','=':'ASSIGN','<':'LT','>':'GT'};
      if (SINGLES[c]) { tokens.push({ type:SINGLES[c], value:c, pos:pos }); pos++; continue; }
      pos++;
    }
    tokens.push({ type:'$EOF', value:'', pos:pos });
    return tokens;
  }
  function assembleClassBody(members, ind) {
    var ctor = null, methods = [], fieldInits = [];
    members.forEach(function(m) {
      if (!m || !m.trim()) return;
      if (m.startsWith('__CTOR__'))   { ctor = m.slice(8); }
      else if (m.startsWith('__MTH__')) { methods.push(m.slice(7)); }
      else { fieldInits.push(m); }
    });
    var parts = [];
    if (!ctor && fieldInits.length) {
      var body = fieldInits.filter(function(f){ return f.trim() && !f.trim().startsWith('//'); });
      if (body.length) {
        ctor = ind + '  constructor() {\n' + body.map(function(f){ return ind+'    this.'+f.trim(); }).join('\n') + '\n' + ind + '  }';
      }
    }
    if (ctor)  parts.push(ctor);
    methods.forEach(function(m){ parts.push(m); });
    return parts.join('\n\n');
  }
  return {
    _tokeniser: cppTokenise,
    ctx: { indent: 0 },
    start: 'program',
    operators: [
      { assoc:'right', ops:['=','+=','-=','*=','/=','%=','&=','|=','LSHIFT_EQ'], into:'$left $op $right' },
      { assoc:'left',  ops:['||'],           into:'$left || $right' },
      { assoc:'left',  ops:['&&'],           into:'$left && $right' },
      { assoc:'left',  ops:['|'],            into:'$left | $right'  },
      { assoc:'left',  ops:['^'],            into:'$left ^ $right'  },
      { assoc:'left',  ops:['&'],            into:'$left & $right'  },
      { assoc:'left',  ops:['EQ','NEQ'],     into:'$left $op $right'},
      { assoc:'left',  ops:['LT','GT','LEQ','GEQ'], into:'$left $op $right' },
      { assoc:'left',  ops:['LSHIFT'],       into:'$left << $right' },
      { assoc:'left',  ops:['+','-'],        into:'$left $op $right'},
      { assoc:'left',  ops:['*','/','%'],    into:'$left $op $right'},
    ],
    rules: {
      program: {
        pattern: [{ many:'topLevel', name:'items' }],
        into: function(caps) {
          return caps.items.filter(function(s){ return s && s.trim(); }).join('\n');
        }
      },
      topLevel: {
        variants: [
          { pattern:['preprocLine'],   into:'$1' },
          { pattern:['usingDecl'],     into:'$1' },
          { pattern:['namespaceDef'],  into:'$1' },
          { pattern:['classDef'],      into:'$1' },
          { pattern:['enumDef'],       into:'$1' },
          { pattern:['templateDecl'],  into:'$1' },
          { pattern:['funcDef'],       into:'$1' },
          { pattern:['varDeclStmt'],   into:'$1' },
          { pattern:['statement'],     into:'$1' },
        ]
      },
      preprocLine: {
        pattern: ['PREPROC'],
        into: function(caps){ return '// ' + caps['$1']; }
      },
      usingDecl: {
        variants: [
          { pattern:['KW_USING','KW_NAMESPACE','IDENT','SEMI'],   into: '' },
          { pattern:['KW_USING',{rule:'qualName',name:'n'},'SEMI'], into:function(caps){ return '// using '+caps.n; } },
          { pattern:['KW_TYPEDEF',{rule:'typeExpr'},'IDENT','SEMI'], into:function(caps,ctx){ return indent(ctx.get('indent'))+'// typedef'; } },
        ]
      },
      namespaceDef: {
        pattern: ['KW_NAMESPACE',{opt:'IDENT',name:'name'},'LBRACE',{many:'topLevel',name:'body'},'RBRACE'],
        into: function(caps){
          return '// namespace '+(caps.name||'')+'\n'+caps.body.filter(Boolean).join('\n');
        }
      },
      templateDecl: {
        pattern: ['KW_TEMPLATE','LT',{many:'tmplParam',name:'p'},'GT',{alt:['classDef','funcDef'],name:'body'}],
        into: '$body'
      },
      tmplParam: {
        variants: [
          {pattern:['KW_TYPENAME',{opt:'IDENT'}], into:''},
          {pattern:['TYPENAME',   {opt:'IDENT'}], into:''},
          {pattern:['IDENT',      {opt:'IDENT'}], into:''},
          {pattern:['COMMA'],                     into:''},
        ]
      },
      enumDef: {
        pattern: [{opt:'KW_CLASS'},'KW_ENUM',{opt:'IDENT',name:'name'},'LBRACE',{sep:'enumMember',by:'COMMA',name:'members'},'RBRACE','SEMI'],
        into: function(caps, ctx) {
          var ind = indent(ctx.get('indent'));
          var name = caps.name || 'Enum';
          var body = caps.members.filter(Boolean).map(function(m,i){ return ind+'  '+m; }).join(',\n');
          return ind+'const '+name+' = Object.freeze({\n'+body+'\n'+ind+'});';
        }
      },
      enumMember: {
        variants: [
          {pattern:[{token:'IDENT',name:'k'},'ASSIGN',{rule:'expr',name:'v'}], into:'$k: $v'},
          {pattern:[{token:'IDENT',name:'k'}],                                  into:'$k: "$k"'},
        ]
      },
      classDef: {
        pattern: [
          {alt:['KW_CLASS','KW_STRUCT'],name:'kw'},
          {token:'IDENT',name:'name'},
          {opt:'classInherit',name:'parent'},
          'LBRACE',
          {action:function(ctx){ ctx.set('indent', ctx.get('indent')+1); }},
          {many:'classMember',name:'members'},
          {action:function(ctx){ ctx.pop('indent'); }},
          'RBRACE','SEMI'
        ],
        into: function(caps, ctx) {
          var ind  = indent(ctx.get('indent'));
          var ext  = caps.parent ? ' extends '+caps.parent : '';
          var body = assembleClassBody(caps.members, ind);
          return ind+'class '+caps.name+ext+' {\n'+body+'\n'+ind+'}';
        }
      },
      classInherit: {
        pattern: ['COLON',{rule:'accessSpec'},'IDENT'],
        into: '$3'
      },
      accessSpec: {
        variants: [
          {pattern:['KW_PUBLIC'],    into:'public'},
          {pattern:['KW_PRIVATE'],   into:'private'},
          {pattern:['KW_PROTECTED'], into:'protected'},
        ]
      },
      classMember: {
        variants: [
          {pattern:[{rule:'accessSpec'},'COLON'],         into:''},
          {pattern:['constructorDef'],                    into:'$1'},
          {pattern:['destructorDef'],                     into:'$1'},
          {pattern:['methodDef'],                         into:'$1'},
          {pattern:['fieldDecl'],                         into:'$1'},
          {pattern:['classDef'],                          into:'$1'},
          {pattern:['KW_FRIEND',{rule:'typeExpr'},'IDENT','SEMI'], into:''},
        ]
      },
      constructorDef: {
        pattern: [
          {opt:'KW_EXPLICIT'},
          {token:'IDENT',name:'name'},'LPAREN',{opt:'paramList',name:'params'},'RPAREN',
          {opt:'initList',name:'inits'},
          'LBRACE',
          {action:function(ctx){ ctx.set('indent',ctx.get('indent')+1); }},
          {many:'statement',name:'body'},
          {action:function(ctx){ ctx.pop('indent'); }},
          'RBRACE'
        ],
        into: function(caps, ctx) {
          var ind    = indent(ctx.get('indent'));
          var params = caps.params||'';
          var inits  = caps.inits ? caps.inits.map(function(it){ return ind+'    this.'+it+';'; }) : [];
          var body   = caps.body.filter(function(s){ return s&&s.trim(); });
                    var processedInits = caps.inits ? caps.inits.map(function(it) {
            if (/^[A-Z]/.test(it)) {
              var args = it.replace(/^[^(]*/, '');
              return ind+'    super'+args+';';
            }
            var m = it.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
            if (m) return ind+'    this.'+m[1]+' = '+m[2]+';';
            return ind+'    this.'+it+';';
          }) : [];
          return '__CTOR__'+ind+'  constructor('+params+') {\n'+processedInits.concat(body).join('\n')+'\n'+ind+'  }';
        }
      },
      initList: {
        pattern: ['COLON',{sep:'initItem',by:'COMMA',name:'items'}],
        into: function(caps){ return caps.items; }
      },
      initItem: {
        variants: [
          {
            pattern:[{token:'IDENT',name:'field'},'LPAREN',{opt:'argList',name:'args'},'RPAREN'],
            into: function(caps){ return caps.field+'('+( caps.args||'')+')'; }
          }
        ]
      },
      destructorDef: {
        pattern: [
          'TILDE',{token:'IDENT',name:'name'},'LPAREN','RPAREN',
          'LBRACE',
          {action:function(ctx){ ctx.set('indent',ctx.get('indent')+1); }},
          {many:'statement',name:'body'},
          {action:function(ctx){ ctx.pop('indent'); }},
          'RBRACE'
        ],
        into: function(caps, ctx) {
          var ind  = indent(ctx.get('indent'));
          var body = caps.body.filter(function(s){ return s&&s.trim(); });
          return '__MTH__'+ind+'  destroy() { // destructor\n'+body.join('\n')+'\n'+ind+'  }';
        }
      },
      methodDef: {
        pattern: [
          {many:'methodMod',name:'mods'},
          {rule:'typeExpr',name:'ret'},
          {token:'IDENT',name:'name'},'LPAREN',{opt:'paramList',name:'params'},'RPAREN',
          {many:'methodSuffix'},
          'LBRACE',
          {action:function(ctx){ ctx.set('indent',ctx.get('indent')+1); }},
          {many:'statement',name:'body'},
          {action:function(ctx){ ctx.pop('indent'); }},
          'RBRACE'
        ],
        into: function(caps, ctx) {
          var ind  = indent(ctx.get('indent'));
          var kw   = caps.mods.indexOf('static') !== -1 ? 'static ' : '';
          var body = caps.body.filter(function(s){ return s&&s.trim(); });
          return '__MTH__'+ind+'  '+kw+caps.name+'('+(caps.params||'')+') {\n'+body.join('\n')+'\n'+ind+'  }';
        }
      },
      methodMod: {
        variants: [
          {pattern:['KW_STATIC'],   into:'static'},
          {pattern:['KW_VIRTUAL'],  into:'virtual'},
          {pattern:['KW_INLINE'],   into:'inline'},
          {pattern:['KW_EXPLICIT'], into:'explicit'},
          {pattern:['KW_CONST'],    into:'const'},
        ]
      },
      methodSuffix: {
        variants: [
          {pattern:['KW_CONST'],    into:''},
          {pattern:['KW_OVERRIDE'], into:''},
          {pattern:['KW_NOEXCEPT'], into:''},
        ]
      },
      fieldDecl: {
        pattern: [
          {opt:'KW_STATIC'},{opt:'KW_CONST'},
          {rule:'typeExpr'},
          {token:'IDENT',name:'name'},
          {opt:{seq:['ASSIGN',{rule:'expr',name:'v'}]},name:'init'},
          'SEMI'
        ],
        into: function(caps, ctx) {
          var rhs = caps.init ? (Array.isArray(caps.init)?caps.init[1]||caps.init[caps.init.length-1]:caps.init) : 'undefined';
          return caps.name + ' = ' + rhs + ';';
        }
      },
      funcDef: {
        pattern: [
          {many:'methodMod'},
          {rule:'typeExpr'},
          {rule:'qualName',name:'name'},'LPAREN',{opt:'paramList',name:'params'},'RPAREN',
          {many:'methodSuffix'},
          'LBRACE',
          {action:function(ctx){ ctx.set('indent',ctx.get('indent')+1); }},
          {many:'statement',name:'body'},
          {action:function(ctx){ ctx.pop('indent'); }},
          'RBRACE'
        ],
        into: function(caps, ctx) {
          var ind  = indent(ctx.get('indent'));
          var body = caps.body.filter(function(s){ return s&&s.trim(); });
          return ind+'function '+caps.name+'('+(caps.params||'')+') {\n'+body.join('\n')+'\n'+ind+'}';
        }
      },
      paramList: {
        pattern: [{sep:'param',by:'COMMA',name:'params'}],
        into: function(caps){ return caps.params.filter(Boolean).join(', '); }
      },
      param: {
        variants: [
          {pattern:['ELLIPSIS'], into:'...args'},
          {
            pattern:[{rule:'typeExpr'},{token:'IDENT',name:'n'},{opt:{seq:['ASSIGN',{rule:'expr',name:'dv'}]},name:'def'}],
            into: function(caps){ return caps.n+(caps.def?' = '+(Array.isArray(caps.def)?caps.def[1]||'':caps.def):''); }
          },
          {pattern:[{rule:'typeExpr'}], into:'_'},
        ]
      },
      typeExpr: {
        variants: [
          {pattern:['KW_CONST',{rule:'typeExpr'}],  into:''},
          {pattern:['KW_STATIC',{rule:'typeExpr'}],  into:''},
          {pattern:['KW_MUTABLE',{rule:'typeExpr'}], into:''},
          {pattern:['KW_VOLATILE',{rule:'typeExpr'}],into:''},
          {pattern:[{rule:'qualName'},{opt:'tmplArgList'},{many:'ptrRef'}],into:''},
          {pattern:['TYPENAME',{opt:'tmplArgList'},{many:'ptrRef'}],into:''},
          {pattern:['KW_UNSIGNED',{opt:'TYPENAME'},{many:'ptrRef'}],into:''},
          {pattern:['KW_SIGNED',  {opt:'TYPENAME'},{many:'ptrRef'}],into:''},
          {pattern:['KW_LONG','KW_LONG',{opt:'TYPENAME'},{many:'ptrRef'}],into:''},
          {pattern:['KW_LONG',{opt:'TYPENAME'},{many:'ptrRef'}],into:''},
        ]
      },
      ptrRef: {
        variants: [
          {pattern:['STAR'],     into:''},
          {pattern:['AMP'],      into:''},
          {pattern:['KW_CONST'], into:''},
        ]
      },
      tmplArgList: {
        pattern: ['LT',{many:'tmplArgItem'},'GT'],
        into: ''
      },
      tmplArgItem: {
        variants: [
          {pattern:[{rule:'typeExpr'}], into:''},
          {pattern:['COMMA'],           into:''},
          {pattern:['NUMBER'],          into:''},
          {pattern:['IDENT'],           into:''},
        ]
      },
      nameToken: {
        variants: [
          {pattern:[{token:'IDENT',   name:'n'}], into:'$n'},
          {pattern:[{token:'TYPENAME',name:'n'}], into:'$n'},
        ]
      },
      qualName: {
        pattern: [{rule:'nameToken',name:'first'},{many:{seq:['SCOPE',{rule:'nameToken'}]},name:'rest'}],
        into: function(caps) {
          var parts = [caps.first];
          caps.rest.forEach(function(r){
            var part = Array.isArray(r) ? (r[1]||r[r.length-1]) : String(r).replace(/^::/, '');
            if (part) parts.push(part);
          });
          if (parts[0]==='std') parts.shift();
          return parts.filter(Boolean).join('.');
        }
      },
      statement: {
        variants: [
          {pattern:['ifStmt'],       into:'$1'},
          {pattern:['whileStmt'],    into:'$1'},
          {pattern:['doWhileStmt'],  into:'$1'},
          {pattern:['forRangeStmt'], into:'$1'},
          {pattern:['forStmt'],      into:'$1'},
          {pattern:['returnStmt'],   into:'$1'},
          {pattern:['breakStmt'],    into:'$1'},
          {pattern:['continueStmt'], into:'$1'},
          {pattern:['throwStmt'],    into:'$1'},
          {pattern:['tryStmt'],      into:'$1'},
          {pattern:['coutStmt'],     into:'$1'},
          {pattern:['deleteStmt'],   into:'$1'},
          {pattern:['varDeclStmt'],  into:'$1'},
          {pattern:['exprStmt'],     into:'$1'},
          {pattern:['blockStmt'],    into:'$1'},
          {pattern:['SEMI'],         into:''},
        ]
      },
      blockStmt: {
        pattern: [
          'LBRACE',
          {action:function(ctx){ ctx.set('indent',ctx.get('indent')+1); }},
          {many:'statement',name:'stmts'},
          {action:function(ctx){ ctx.pop('indent'); }},
          'RBRACE'
        ],
        into: function(caps, ctx) {
          var ind = indent(ctx.get('indent'));
          return '{\n'+caps.stmts.filter(function(s){ return s&&s.trim(); }).join('\n')+'\n'+ind+'}';
        }
      },
      ifStmt: {
        pattern: [
          'KW_IF','LPAREN',{rule:'expr',name:'cond'},'RPAREN',
          {rule:'stmtOrBlock',name:'then'},
          {opt:{seq:['KW_ELSE',{rule:'stmtOrBlock',name:'els'}]},name:'elseRaw'}
        ],
        into: function(caps, ctx) {
          var ind = indent(ctx.get('indent'));
          var out = ind+'if ('+caps.cond+') '+caps.then;
          if (caps.elseRaw) {
            var ep = Array.isArray(caps.elseRaw) ? caps.elseRaw[1]||caps.elseRaw[caps.elseRaw.length-1] : caps.elseRaw;
            out += ' else '+ep;
          }
          return out;
        }
      },
      stmtOrBlock: {
        variants: [
          {pattern:['blockStmt'], into:'$1'},
          {
            pattern:[
              {action:function(ctx){ ctx.set('indent',ctx.get('indent')+1); }},
              {rule:'statement',name:'s'},
              {action:function(ctx){ ctx.pop('indent'); }}
            ],
            into: function(caps){ return '{\n'+caps.s+'\n}'; }
          }
        ]
      },
      whileStmt: {
        pattern:['KW_WHILE','LPAREN',{rule:'expr',name:'cond'},'RPAREN',{rule:'stmtOrBlock',name:'body'}],
        into:function(caps,ctx){ return indent(ctx.get('indent'))+'while ('+caps.cond+') '+caps.body; }
      },
      doWhileStmt: {
        pattern:['KW_DO',{rule:'stmtOrBlock',name:'body'},'KW_WHILE','LPAREN',{rule:'expr',name:'cond'},'RPAREN','SEMI'],
        into:function(caps,ctx){ return indent(ctx.get('indent'))+'do '+caps.body+' while ('+caps.cond+');'; }
      },
      forRangeStmt: {
        pattern:['KW_FOR','LPAREN',{rule:'typeExpr'},{token:'IDENT',name:'v'},'COLON',{rule:'expr',name:'iter'},'RPAREN',{rule:'stmtOrBlock',name:'body'}],
        into:function(caps,ctx){ return indent(ctx.get('indent'))+'for (const '+caps.v+' of '+caps.iter+') '+caps.body; }
      },
      forStmt: {
        pattern:[
          'KW_FOR','LPAREN',
          {opt:'forInit',name:'init'},'SEMI',
          {opt:'expr',name:'cond'},'SEMI',
          {opt:'exprList',name:'upd'},
          'RPAREN',{rule:'stmtOrBlock',name:'body'}
        ],
        into:function(caps,ctx){
          var ind = indent(ctx.get('indent'));
          var init = caps.init||'', cond = caps.cond||'', upd = caps.upd||'';
          return ind+'for ('+init+'; '+cond+'; '+upd+') '+caps.body;
        }
      },
      forInit: {
        variants: [
          {pattern:['varDeclCore'],
           into:function(caps){
             return (caps['$1']||'').replace(/\n/g,' ').replace(/^\s+/,'').replace(/;+\s*$/,'').replace(/;\s*/g,', ').replace(/,\s*$/,'');
           }
          },
          {pattern:['exprList'],into:'$1'},
        ]
      },
      exprList: {
        pattern:[{sep:'expr',by:'COMMA',name:'es'}],
        into:function(caps){ return caps.es.join(', '); }
      },
      returnStmt: {
        pattern:['KW_RETURN',{opt:'expr',name:'val'},'SEMI'],
        into:function(caps,ctx){ return indent(ctx.get('indent'))+'return'+(caps.val?' '+caps.val:'')+';'; }
      },
      breakStmt:    {pattern:['KW_BREAK','SEMI'],    into:function(caps,ctx){ return indent(ctx.get('indent'))+'break;'; }},
      continueStmt: {pattern:['KW_CONTINUE','SEMI'], into:function(caps,ctx){ return indent(ctx.get('indent'))+'continue;'; }},
      throwStmt: {
        pattern:['KW_THROW',{opt:'expr',name:'val'},'SEMI'],
        into:function(caps,ctx){ return indent(ctx.get('indent'))+'throw '+(caps.val||'new Error()')+';'; }
      },
      tryStmt: {
        pattern:['KW_TRY',{rule:'blockStmt',name:'tryB'},{many1:'catchClause',name:'catches'}],
        into:function(caps,ctx){ return indent(ctx.get('indent'))+'try '+caps.tryB+'\n'+caps.catches.join('\n'); }
      },
      catchClause: {
        pattern:['KW_CATCH','LPAREN',{opt:{seq:[{rule:'typeExpr'},{opt:'IDENT',name:'n'}]},name:'prm'},'RPAREN',{rule:'blockStmt',name:'body'}],
        into:function(caps,ctx){
          var ind = indent(ctx.get('indent'));
          var n = Array.isArray(caps.prm) ? caps.prm[1]||'e' : 'e';
          if (!n||!n.trim()) n='e';
          return ind+'catch ('+n+') '+caps.body;
        }
      },
      coutStmt: {
        pattern:[{rule:'coutStream',name:'stream'},'LSHIFT',{sep:'coutArg',by:'LSHIFT',name:'args'},'SEMI'],
        into:function(caps,ctx){
          if (!caps.stream) return ''; // coutStream matched but wasn't cout/cerr
          var ind = indent(ctx.get('indent'));
          var fn  = (caps.stream==='cerr'||caps.stream.endsWith('.cerr')) ? 'console.error' : 'console.log';
          var args = caps.args.filter(function(a){ return a&&a!=='endl'&&a!=='std.endl'&&a!=='"\\n"'&&a!=="'\\n'"; });
          return ind+fn+'('+args.join(', ')+');';
        }
      },
      coutStream: {
        variants: [
          {pattern:[{token:'IDENT',name:'ns'},'SCOPE',{token:'IDENT',name:'n'}],
           into:function(caps){ return caps.n==='cout'||caps.n==='cerr'?caps.ns+'.'+caps.n:''; }},
          {pattern:[{token:'IDENT',name:'n'}],
           into:function(caps){ return caps.n==='cout'||caps.n==='cerr'?caps.n:''; }},
        ]
      },
      coutArg: {
        variants: [{pattern:[{rule:'unaryExpr',name:'e'}], into:'$e'}]
      },
      deleteStmt: {
        variants: [
          {pattern:['KW_DELETE','LBRACK','RBRACK',{rule:'expr',name:'e'},'SEMI'],
           into:function(caps,ctx){ return indent(ctx.get('indent'))+'// delete[] '+caps.e; }},
          {pattern:['KW_DELETE',{rule:'expr',name:'e'},'SEMI'],
           into:function(caps,ctx){ return indent(ctx.get('indent'))+'// delete '+caps.e; }},
        ]
      },
      varDeclStmt: {
        pattern:[{rule:'varDeclCore',name:'d'},'SEMI'],
        into:'$d'
      },
      varDeclCore: {
        pattern:[
          {opt:'KW_CONST',name:'cn'},{opt:'KW_STATIC',name:'st'},
          {rule:'typeExprCapture',name:'ty'},
          {sep:'declarator',by:'COMMA',name:'decls'}
        ],
        into:function(caps,ctx){
          var ind = indent(ctx.get('indent'));
          var kw  = caps.cn ? 'const' : 'let';
          var ty  = caps.ty||'Object';
          return caps.decls.filter(Boolean).map(function(d){
            d = d.replace(/^([A-Za-z_$][A-Za-z0-9_$]*) = new \1\(/, caps.n+' = new '+ty+'(');
            return ind+kw+' '+d+';';
          }).join('\n');
        }
      },
      typeExprCapture: {
        variants: [
          {pattern:['KW_CONST',{rule:'typeExprCapture',name:'t'}],  into:'$t'},
          {pattern:['KW_STATIC',{rule:'typeExprCapture',name:'t'}],  into:'$t'},
          {pattern:[{rule:'qualName',name:'n'},{opt:'tmplArgList'},{many:'ptrRef'}],into:function(caps){ return caps.n; }},
          {pattern:['TYPENAME',{opt:'tmplArgList'},{many:'ptrRef'}],into:function(caps){ return caps['$1']; }},
          {pattern:['KW_UNSIGNED',{opt:'TYPENAME'},{many:'ptrRef'}],into:'Number'},
          {pattern:['KW_SIGNED',  {opt:'TYPENAME'},{many:'ptrRef'}],into:'Number'},
          {pattern:['KW_LONG','KW_LONG',{opt:'TYPENAME'},{many:'ptrRef'}],into:'Number'},
          {pattern:['KW_LONG',{opt:'TYPENAME'},{many:'ptrRef'}],into:'Number'},
        ]
      },
      declarator: {
        pattern:[
          {token:'IDENT',name:'n'},
          {opt:{seq:['LBRACK',{opt:'expr',name:'sz'},'RBRACK']},name:'arr'},
          {opt:{seq:['ASSIGN',{rule:'expr',name:'v'}]},name:'init'},
          {opt:{seq:['LPAREN',{opt:'argList',name:'args'},'RPAREN']},name:'ctor'},
          {opt:{seq:['LBRACE',{opt:'argList',name:'iargs'},'RBRACE']},name:'brace'}
        ],
        into:function(caps){
          var rhs;
          if (caps.init)  rhs = Array.isArray(caps.init)  ? caps.init[1]||caps.init[caps.init.length-1]   : caps.init;
          else if (caps.brace) rhs = '[' + (Array.isArray(caps.brace) ? caps.brace[1]||'' : '') + ']';
          else if (caps.ctor)  rhs = 'new '+caps.n+'('+(Array.isArray(caps.ctor)?caps.ctor[1]||'':'')+')';
          else rhs = 'undefined';
          return caps.n+' = '+rhs;
        }
      },
      exprStmt: {
        pattern:[{rule:'expr',name:'e'},'SEMI'],
        into:function(caps,ctx){
          if (!caps.e||!caps.e.trim()) return '';
          return indent(ctx.get('indent'))+caps.e+';';
        }
      },
      unaryExpr: {
        variants: [
          {pattern:['INC',{rule:'unaryExpr',name:'e'}], into:'++$e'},
          {pattern:['DEC',{rule:'unaryExpr',name:'e'}], into:'--$e'},
          {pattern:['MINUS',{rule:'unaryExpr',name:'e'}],into:'-$e'},
          {pattern:['BANG', {rule:'unaryExpr',name:'e'}],into:'!$e'},
          {pattern:['TILDE',{rule:'unaryExpr',name:'e'}],into:'~$e'},
          {pattern:['STAR', {rule:'unaryExpr',name:'e'}],into:'$e'},
          {pattern:['AMP',  {rule:'unaryExpr',name:'e'}],into:'$e'},
          {pattern:['KW_NEW','TYPENAME',{opt:'tmplArgList'},'LBRACK',{rule:'expr',name:'sz'},'RBRACK'],
           into:function(caps){ return 'new Array('+caps.sz+')'; }},
          {pattern:['KW_NEW',{rule:'qualName',name:'n'},{opt:'tmplArgList'},'LBRACK',{rule:'expr',name:'sz'},'RBRACK'],
           into:function(caps){ return 'new Array('+caps.sz+')'; }},
          {pattern:['KW_NEW','TYPENAME',{opt:'tmplArgList'},'LPAREN',{opt:'argList',name:'args'},'RPAREN'],
           into:function(caps,ctx,tok){ return 'new Object()/*new '+caps['$2']+'*/'; }},
          {pattern:['KW_NEW',{rule:'qualName',name:'n'},{opt:'tmplArgList'},'LPAREN',{opt:'argList',name:'args'},'RPAREN'],
           into:function(caps){ return 'new '+caps.n+'('+(caps.args||'')+')'; }},
          {pattern:['KW_NEW','LPAREN',{rule:'expr'},'RPAREN','TYPENAME',{opt:'tmplArgList'}],
           into:function(caps){ return 'undefined/*placement new*/'; }},
          {pattern:['KW_SIZEOF','LPAREN',{rule:'typeExpr'},'RPAREN'], into:'4'},
          {pattern:['KW_SIZEOF',{rule:'unaryExpr'}],                  into:'4'},
          {pattern:['LPAREN',{rule:'typeExpr'},'RPAREN',{rule:'unaryExpr',name:'e'}], into:'$e'},
          {pattern:['IDENT','LT',{rule:'typeExpr'},'GT','LPAREN',{rule:'expr',name:'e'},'RPAREN'], into:'$e'},
          {
            pattern:[{rule:'postfixExpr',name:'c'},'QMARK',{rule:'expr',name:'a'},'COLON',{rule:'expr',name:'b'}],
            into:'$c ? $a : $b'
          },
          {pattern:[{rule:'postfixExpr',name:'e'}], into:'$e'},
        ]
      },
      postfixExpr: {
        pattern:[{rule:'primaryExpr',name:'b'},{many:'postfixSuffix',name:'s'}],
        into:function(caps){ return caps.b+caps.s.join(''); }
      },
      postfixSuffix: {
        variants: [
          {pattern:['INC'], into:'++'},
          {pattern:['DEC'], into:'--'},
          {pattern:['LPAREN',{opt:'argList',name:'args'},'RPAREN'], into:function(caps){ return '('+(caps.args||'')+')'; }},
          {pattern:['LBRACK',{rule:'expr',name:'idx'},'RBRACK'],    into:'[$idx]'},
          {pattern:['DOT',  {token:'IDENT',name:'m'}],              into:'.$m'},
          {pattern:['ARROW',{token:'IDENT',name:'m'}],              into:'.$m'},
          {pattern:['SCOPE',{token:'IDENT',name:'m'}],              into:'.$m'},
        ]
      },
      primaryExpr: {
        variants: [
          {pattern:['KW_NULLPTR'],into:'null'},
          {pattern:['BOOL'],      into:'$1'},
          {pattern:['NUMBER'],    into:function(caps){ return caps['$1'].replace(/[fFlLuU]+$/,''); }},
          {pattern:['STRING'],    into:'$1'},
          {pattern:['CHAR'],      into:'$1'},
          {pattern:['KW_THIS'],   into:'this'},
          {pattern:['LPAREN',{rule:'expr',name:'e'},'RPAREN'], into:'($e)'},
          {pattern:['LBRACE',{opt:'argList',name:'items'},'RBRACE'], into:'[$items]'},
          {pattern:[{rule:'qualName',name:'n'}], into:'$n'},
        ]
      },
      argList: {
        pattern:[{sep:'expr',by:'COMMA',name:'args'}],
        into:function(caps){ return caps.args.join(', '); }
      }
    }
  };
})();
