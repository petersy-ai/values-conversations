/* Enough of Both: a conversation guide about security and novelty, for two
 * people on one shared device (or one device each for the private preparation,
 * with a locked set of answers sent between them as a file or text).
 * No scores, no rankings, no verdicts.
 * Answers stay in the browser; they leave it only as files the couple saves. */
(function () {
  'use strict';
  var KEY = 'enough-of-both-v1';
  var $app = document.getElementById('app');
  var RULE_RE = /\b(you should|you need to|you always|you never|you have to)\b/i;
  var PRIVATE = ['p-intro', 'p-cards', 'p-reflect', 'p-pick', 'p-pref', 'p-lock', 'x-note', 'x-reply', 'u-rate'];

  // ---------- state ----------
  function blankPrep() {
    return { ratings: {}, idx: 0, reflect: {}, rIdx: 0, core: [], flexible: [], fear: {}, hope: {},
      first: null, readNotes: null, share: { notes: false, reflect: false }, locked: false, lockedAt: null, stage: null };
  }
  function blankOffers() { return { offers: ['', '', ''], asks: ['', '', ''], support: {} }; }
  function fresh() {
    return { v: 1, app: 'enough-of-both', screen: 'welcome', mode: null, id: null, createdAt: new Date().toISOString(),
      names: { a: '', b: '' }, opts: { save: true, exchange: false, reviewDays: 21 },
      custom: [], context: null, turn: null, handover: null,
      prep: { a: blankPrep(), b: blankPrep() },
      exchange: { notes: { a: '', b: '' }, replies: { a: '', b: '' }, note: { a: false, b: false }, reply: { a: false, b: false } },
      conv: { agree: { a: false, b: false }, view: 'area', first: null, rounds: [], cur: null,
        pattern: { trigger: '', x: '', y: '', then: '', instead: '' }, stressors: {}, stressOther: '',
        sitting2: '', recapNote: '', timeouts: [] },
      map: { moves: {}, added: [] },
      offers: { a: blankOffers(), b: blankOffers() },
      experiments: [],
      close: { appr: { a: '', b: '' }, understood: { a: { value: null, shared: false, done: false }, b: { value: null, shared: false, done: false } },
        include: { exp: true, map: true, pattern: true, offers: true, cards: true, notes: true, exchange: false, appr: false, understood: true, reviews: true, context: false } },
      reviews: [], timeout: null };
  }
  function deepMerge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      out[k] = (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) ? deepMerge(base[k], over[k]) : over[k];
    });
    return out;
  }
  function normalise(st) { var s = deepMerge(fresh(), st); s.mode = 'shared'; return s; }
  var state = fresh();
  var ui = { keep: {} };

  function save() {
    try {
      if (state.opts.save && state.mode) localStorage.setItem(KEY, JSON.stringify(state));
      else localStorage.removeItem(KEY);
    } catch (e) { /* storage unavailable: carry on in memory */ }
  }
  function loadSaved() { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function eraseAll() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state = fresh(); ui = { keep: {} };
    go('welcome');
    toast('Everything has been erased from this browser.');
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nm(p) { return state.names[p] || (p === 'a' ? 'Person 1' : 'Person 2'); }
  function other(p) { return p === 'a' ? 'b' : 'a'; }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function cards() {
    return EB.CARDS.concat(state.custom.map(function (c) {
      return { id: c.id, domain: 'custom', pole: c.pole || null, text: c.text, short: c.text.length > 36 ? c.text.slice(0, 34) + '…' : c.text, custom: true, owner: c.owner };
    }));
  }
  function card(id) { return cards().filter(function (c) { return c.id === id; })[0] || { id: id, text: id, short: id, domain: 'custom' }; }
  function rating(p, id) { return state.prep[p].ratings[id] || {}; }
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function z(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function fmtDate(s) { if (!s) return ''; var d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function fmtTime(ms) { return new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }); }
  function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person'; }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()); }

  var toastTimer, $toast = document.getElementById('toast');
  function toast(msg) {
    $toast.textContent = msg; $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.classList.remove('show'); }, 3000);
  }
  function go(screen) {
    if (screen.indexOf('p-') === 0 && state.turn) state.prep[state.turn].stage = screen;
    state.screen = screen; save(); render(); window.scrollTo(0, 0);
  }
  function copy(text, elId) {
    var fallback = function () { selectEl(elId); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, fallback); return; } catch (e) { /* fall through */ }
    }
    fallback();
  }
  function selectEl(id) {
    var el = document.getElementById(id);
    if (!el) return toast('Copy did not work here. Select the text and copy it.');
    if (el.select) { el.focus(); el.select(); }
    else { var rg = document.createRange(); rg.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); }
    toast('Text selected. Use your device’s Copy to copy it.');
  }

  // Small HTML builders.
  function field(label, path, o) {
    o = o || {};
    var v = getPath(state, path); v = v == null ? '' : v;
    var attrs = ' id="f-' + path.replace(/\./g, '-') + '" data-bind="' + path + '"' + (o.check ? ' data-check="1"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') +
      (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.disabled ? ' disabled' : '') + ' autocomplete="off"';
    var input = o.type === 'date' ? '<input type="date"' + attrs + ' value="' + esc(v) + '">'
      : o.rows ? '<textarea' + attrs + ' rows="' + o.rows + '">' + esc(v) + '</textarea>'
      : '<input' + attrs + ' value="' + esc(v) + '">';
    return '<label class="field"><span>' + label + (o.hint ? ' <small>' + o.hint + '</small>' : '') + '</span>' + input + '</label>' + (o.check ? chk(path, v) : '');
  }
  function chk(path, v) {
    var show = RULE_RE.test(v || '') && !ui.keep[path];
    return '<div class="wcheck" data-chk="' + path + '"' + (show ? '' : ' hidden') + '>This might land as a rule. Want to try “Would you be open to…” or “What I need is…”? ' +
      '<span class="wbtns"><button class="link" data-act="reword" data-arg="' + path + '">Reword</button><button class="link" data-act="keepWording" data-arg="' + path + '">Keep as is</button></span></div>';
  }
  function checkbox(label, path, o) {
    o = o || {};
    return '<label class="check"><input type="checkbox" data-bind="' + path + '"' + (getPath(state, path) ? ' checked' : '') + '> ' + label + (o.hint ? ' <small>' + o.hint + '</small>' : '') + '</label>';
  }
  function nameTag(p) { return '<b class="who-txt-' + p + '">' + esc(nm(p)) + '</b>'; }
  function actions(back, next, nextLabel, extra) {
    return '<div class="actions">' + (back ? '<button class="btn" data-act="go" data-arg="' + back + '">Back</button>' : '') + (extra || '') +
      (next ? '<button class="btn primary" data-act="' + (next.indexOf(':') > 0 ? next.split(':')[0] : 'go') + '" data-arg="' + (next.indexOf(':') > 0 ? next.split(':')[1] : next) + '">' + (nextLabel || 'Continue') + '</button>' : '') + '</div>';
  }
  function dots(need, p) {
    if (need == null) return '<span class="scale muted small">passed</span>';
    var s = '<span class="scale" aria-label="' + need + ' of 4">';
    for (var i = 0; i <= 4; i++) s += '<span class="' + (i === need ? 'on on-' + p : '') + '"></span>';
    return s + '</span>';
  }

  // ---------- files ----------
  var dlPromise = null;
  function getDownloads() {
    if (!dlPromise) {
      dlPromise = (window.claude && typeof window.claude.use === 'function')
        ? Promise.resolve(window.claude.use('downloads')).catch(function () { return null; }) : Promise.resolve(null);
    }
    return dlPromise;
  }
  getDownloads();
  function browserDownload(filename, data) {
    try {
      var type = /\.pdf$/.test(filename) ? 'application/pdf' : /\.json$/.test(filename) ? 'application/json' : 'text/plain';
      var blob = data instanceof Blob ? data : new Blob([data], { type: type });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return true;
    } catch (e) { return false; }
  }
  function saveFile(filename, data, onUnavailable) {
    return getDownloads().then(function (dl) {
      if (!dl) {
        // Outside claude.ai (for example on GitHub Pages) an ordinary download works.
        if (!(window.claude && typeof window.claude.use === 'function') && browserDownload(filename, data)) { toast('Saved ' + filename); return; }
        if (onUnavailable) onUnavailable(); return;
      }
      return dl.save({ filename: filename, data: data }).then(function () { toast('Saved ' + filename); }, function (e) {
        var c = e && e.code;
        if (c === 'declined') toast('Not saved.');
        else if (c === 'rate_limited') toast('A save is already waiting for an answer. Try again in a moment.');
        else { toast(c === 'host_unavailable' ? 'This app cannot save files. Open the page in a web browser to save.' : 'Saving files is not available here.'); if (onUnavailable) onUnavailable(); }
      });
    });
  }
  function sessionJson() {
    var snap = JSON.parse(JSON.stringify(state));
    if (snap.screen === 'pair' || (ui.prev === 'pair' && ['save', 'about', 'help'].indexOf(snap.screen) >= 0)) snap.screen = snap.handover ? 'handover' : 'welcome';
    if (['save', 'about', 'help', 'resume', 'repair', 'timeout'].indexOf(snap.screen) >= 0) snap.screen = ui.prev && ui.prev !== snap.screen ? ui.prev : 'welcome';
    if (snap.timeout) snap.screen = snap.timeout.prev || snap.screen;
    snap.timeout = null;
    return JSON.stringify({ app: 'enough-of-both', kind: 'session', version: 1, savedAt: new Date().toISOString(), state: snap }, null, 1);
  }
  function loadSession(obj) {
    if (obj && obj.app === 'enough-of-both' && obj.kind === 'half') return importHalf(obj);
    if (obj && obj.app === 'values-deck') return toast('That is a Values Deck file. To use it, start a new conversation and add it in Set up.');
    if (!obj || obj.app !== 'enough-of-both' || obj.kind !== 'session' || !obj.state || obj.state.v !== 1) return toast('That is not an Enough of Both save file.');
    state = normalise(obj.state); ui = { keep: {} };
    var s = state.screen;
    if (s === 'pair') s = state.handover ? 'handover' : 'setup';
    if (!SCREENS[s] || ['welcome', 'resume', 'save', 'about', 'help', 'repair', 'timeout'].indexOf(s) >= 0) s = 'setup';
    ui.resumeTo = s; state.screen = 'resume';
    save(); render(); window.scrollTo(0, 0);
    toast('Saved session opened.');
  }
  function readFile(input, cb) {
    var f = input.files && input.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { var obj; try { obj = parseText(rd.result); } catch (e) { return toast('That file could not be read.'); } cb(obj); };
    rd.readAsText(f);
  }
  function loadControls() {
    return '<div class="actions wrap"><label class="btn filebtn">Open a saved file<input type="file" id="loadFile" accept=".json,application/json,text/plain" data-file="session" hidden></label></div>' +
      '<details class="paste"><summary>Or paste the saved text</summary><textarea id="loadText" rows="4" spellcheck="false" autocomplete="off"></textarea>' +
      '<button class="btn" data-act="loadPaste">Open</button></details>';
  }

  // ---------- two devices ----------
  // Each person can prepare on their own device. A locked preparation (one
  // person's "half") is sent as a file or as text, and the other device adds it
  // beside its own. Nothing is sent by the app itself.
  // What travels is scrambled with a key built into the app, so it cannot be
  // read by opening the file or decoding the text. This removes the temptation
  // to peek; it is not strong encryption, because the key ships with the page.
  var SEAL_KEY = 'enough-of-both:sealed-until-you-are-together', SEAL_TAG = 'VC1.';
  function sealStream(salt) {
    var h = 2166136261, i, src = SEAL_KEY + '|' + salt.join(',');
    for (i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
    h = h >>> 0 || 1;
    return function () { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h & 255; };
  }
  function seal(str) {
    var bytes = unescape(encodeURIComponent(str)), salt = [], i, out = '';
    for (i = 0; i < 6; i++) salt.push(Math.floor(Math.random() * 256));
    var next = sealStream(salt);
    for (i = 0; i < salt.length; i++) out += String.fromCharCode(salt[i]);
    for (i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes.charCodeAt(i) ^ next());
    return SEAL_TAG + btoa(out);
  }
  function unseal(t) {
    var raw = atob(t.slice(SEAL_TAG.length).replace(/\s+/g, '')), salt = [], i, out = '';
    for (i = 0; i < 6; i++) salt.push(raw.charCodeAt(i));
    var next = sealStream(salt);
    for (i = 6; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ next());
    return decodeURIComponent(escape(out));
  }
  function parseText(t) {
    t = String(t || '').trim();
    return JSON.parse(t.indexOf(SEAL_TAG) === 0 ? unseal(t) : t);
  }
  function bothLocked() { return state.prep.a.locked && state.prep.b.locked; }
  function lockedOne() {
    var la = state.prep.a.locked, lb = state.prep.b.locked;
    return la && !lb ? 'a' : lb && !la ? 'b' : null;
  }
  function halfJson(p) {
    return JSON.stringify({ app: 'enough-of-both', kind: 'half', version: 1, savedAt: new Date().toISOString(), id: state.id,
      person: p, name: nm(p), custom: state.custom, prep: state.prep[p] });
  }
  function importHalf(obj) {
    if (!obj || obj.version !== 1 || !obj.prep || !obj.prep.locked) return toast('That preparation is not locked yet. Lock it on the other device, then send it again.');
    var mine = lockedOne();
    if (bothLocked()) return toast('This device already has both preparations.');
    if (!state.mode || !mine) return toast('Lock your own preparation on this device first, then add your partner’s.');
    if (obj.prep.lockedAt && obj.prep.lockedAt === state.prep[mine].lockedAt) return toast('That is the preparation from this device. Add your partner’s instead.');
    var slot = other(mine), r = deepMerge(blankPrep(), obj.prep);
    r.stage = null;
    // Custom cards made on the other device join this deck.
    (Array.isArray(obj.custom) ? obj.custom : []).forEach(function (c) {
      if (!c || !/^C[a-z0-9]{1,12}$/.test(c.id) || state.custom.length >= EB.CUSTOM_MAX * 2 || state.custom.some(function (x) { return x.id === c.id; })) return;
      state.custom.push({ id: c.id, owner: c.owner === obj.person ? slot : mine, text: String(c.text || '').slice(0, 90), pole: c.pole === 'S' || c.pole === 'N' ? c.pole : null });
    });
    var ids = cards().map(function (c) { return c.id; });
    var known = function (list) { return (Array.isArray(list) ? list : []).filter(function (id) { return ids.indexOf(id) >= 0; }); };
    r.core = known(r.core); r.flexible = known(r.flexible);
    // A card one of you never saw counts as passed.
    [r, state.prep[mine]].forEach(function (q) {
      ids.forEach(function (id) { if (!q.ratings[id] || (q.ratings[id].need == null && !q.ratings[id].pass)) q.ratings[id] = Object.assign(q.ratings[id] || {}, { pass: true }); });
    });
    var name = String(obj.name || '').trim().slice(0, 20);
    if (name && name.toLowerCase() !== nm(mine).trim().toLowerCase()) { state.names[slot] = name; if (state.context) matchContext(state.context); }
    state.prep[slot] = r; ui = { keep: {} };
    state.turn = mine;
    afterPrivate('prep');
    toast(nm(slot) + '’s preparation added.');
  }

  // Values Deck results, imported as context only: a saved Values Deck session,
  // or a summary file made from a Values Deck PDF report.
  function importValuesDeck(obj, quiet) {
    var isSummary = obj && obj.app === 'values-deck' && obj.kind === 'summary' && obj.lean;
    if (!isSummary && !(obj && obj.app === 'values-deck' && obj.state && obj.state.resp)) return toast('That is not a Values Deck file.');
    var ctx = { names: { a: '', b: '' }, lean: {}, areas: {}, pos: {}, top: {}, core: [], swapped: false, importedAt: today(), source: '' };
    if (isSummary) {
      ctx.names = { a: (obj.names || {}).a || '', b: (obj.names || {}).b || '' };
      ctx.source = obj.source || 'Values Deck summary';
      ctx.core = obj.core || [];
      ['a', 'b'].forEach(function (p) {
        ctx.lean[p] = obj.lean[p] || null; ctx.top[p] = (obj.top || {})[p] || []; ctx.areas[p] = {}; ctx.pos[p] = {};
        EB.VD_AREAS.forEach(function (d) {
          var v = ((obj.areas || {})[p] || {})[d[0]];
          ctx.areas[p][d[0]] = v && v.imp != null ? v.imp : null;
          ctx.pos[p][d[0]] = v ? [v.pos, v.flex].filter(Boolean).join(', ') : '';
        });
      });
    } else {
      var st = obj.state, ho = Object.assign({}, EB.VD_HO), names = Object.assign({}, EB.VD_NAMES);
      (st.custom || []).forEach(function (c) { if (c.ho) ho[c.id] = c.ho; names[c.id] = c.name; });
      var eff = function (r, id) { return (r.top || []).indexOf(id) >= 0 ? 'very' : (r.piles || {})[id]; };
      var lean = function (r) {
        if (!r || !r.piles) return null;
        var score = { very: 2, imp: 1, less: 0 }, all = [], by = { OC: [], SE: [], CO: [], ST: [] };
        Object.keys(r.piles).forEach(function (id) {
          var pl = r.piles[id]; if (score[pl] == null) return;
          var s = score[pl], k = (r.top || []).indexOf(id);
          if (k >= 0) s += (8 - (k + 1)) * 0.25;
          all.push(s); if (ho[id]) by[ho[id]].push(s);
        });
        var mean = function (xs) { return xs.length ? xs.reduce(function (t, v) { return t + v; }, 0) / xs.length : null; }, mm = mean(all), out = {};
        Object.keys(by).forEach(function (k) { var v = mean(by[k]); out[k] = v == null || mm == null ? null : v - mm; });
        return out;
      };
      ctx.names = { a: st.names && st.names.a || '', b: st.names && st.names.b || '' };
      ctx.source = 'Values Deck saved session';
      var RA = st.resp.a || {}, RB = st.resp.b || {};
      ctx.core = Object.keys(Object.assign({}, RA.piles, RB.piles)).filter(function (id) { return eff(RA, id) === 'very' && eff(RB, id) === 'very'; }).map(function (id) { return names[id] || id; });
      ['a', 'b'].forEach(function (p) {
        var r = st.resp[p] || {};
        ctx.lean[p] = lean(r); ctx.top[p] = (r.top || []).map(function (id) { return names[id] || id; }); ctx.areas[p] = {}; ctx.pos[p] = {};
        EB.VD_AREAS.forEach(function (d) {
          var v = (r.domains || {})[d[0]], ok = v && !v.pass;
          ctx.areas[p][d[0]] = ok && v.imp != null ? v.imp : null;
          ctx.pos[p][d[0]] = ok ? [v.pos != null ? (EB.VD_OPTIONS[d[0]] || [])[v.pos] : null, v.flex ? EB.VD_FLEX[v.flex] : null].filter(Boolean).join(', ') : '';
        });
      });
    }
    ctx.builtIn = !!obj.builtIn;
    matchContext(ctx);
    state.context = ctx;
    if (quiet) return;
    save(); render();
    toast('Values Deck results added as context.');
  }
  // Match names loosely ("Sam" and "Samuel"); otherwise keep the order and offer Swap.
  function matchContext(ctx) {
    if (!ctx || ctx.manualSwap) return;
    var lc = function (s) { return String(s || '').trim().toLowerCase(); };
    var same = function (x, y) { x = lc(x); y = lc(y); return !!x && !!y && (x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0); };
    var straight = same(ctx.names.a, state.names.a) || same(ctx.names.b, state.names.b);
    var cross = same(ctx.names.a, state.names.b) || same(ctx.names.b, state.names.a);
    ctx.swapped = cross && !straight;
  }
  function ctxMapHtml() {
    var c = state.context;
    return ['a', 'b'].map(function (p) { return '<p class="small">' + (state.names[p] ? nameTag(p) : '<b>' + (p === 'a' ? 'First person' : 'Second person') + '</b>') + ' \u2190 ' + esc(c.names[ctxFor(p)] || '?') + '</p>'; }).join('');
  }
  function ctxFor(p) { // our person p -> imported person key
    var c = state.context; if (!c) return null;
    return c.swapped ? other(p) : p;
  }
  function leanText(l) {
    if (!l || l.OC == null || l.CO == null) return 'No circle data';
    var d = l.OC - l.CO, mag = Math.abs(d) < 0.75 ? 'slightly ' : '';
    var t = Math.abs(d) < 0.25 ? 'Sits between openness to change and conservation' : d > 0 ? 'Leans ' + mag + 'towards openness to change' : 'Leans ' + mag + 'towards conservation (security, order, tradition)';
    var top = Object.keys(l).filter(function (k) { return l[k] != null; }).sort(function (x, y) { return l[y] - l[x]; })[0];
    return t + (top ? '. Strongest group: ' + EB.HO_NAME[top].toLowerCase() + '.' : '.');
  }
  function contextPanel(open) {
    var c = state.context; if (!c) return '';
    var rows = EB.VD_AREAS.map(function (d) {
      return '<tr><td>' + esc(d[1]) + '</td>' + ['a', 'b'].map(function (p) {
        var q = ctxFor(p), v = c.areas[q][d[0]], ps = ((c.pos || {})[q] || {})[d[0]];
        return '<td><span class="n">' + (v == null ? '–' : v) + '</span>' + (ps ? '<br><small class="muted">' + esc(ps) + '</small>' : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<details class="ctx"' + (open ? ' open' : '') + '><summary>From your Values Deck <small>(context only)</small></summary>' +
      (c.core && c.core.length ? '<p class="small"><b>Shared core:</b> ' + esc(c.core.join(', ')) + '</p>' : '') +
      ['a', 'b'].map(function (p) {
        var q = ctxFor(p), top = (c.top || {})[q] || [];
        return '<p class="small">' + nameTag(p) + ': ' + esc(leanText(c.lean[q])) + (top.length ? '<br><span class="muted">Top 7: ' + esc(top.join(', ')) + '</span>' : '') + '</p>';
      }).join('') +
      '<div class="tablewrap"><table class="mini"><thead><tr><th>Life area (importance 0 to 4)</th><th>' + esc(nm('a')) + '</th><th>' + esc(nm('b')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>';
  }

  // ---------- layout ----------
  function header() {
    var s = state.screen, right = '';
    if (PRIVATE.indexOf(s) >= 0 && state.turn) right = '<span class="who who-' + state.turn + '">' + esc(nm(state.turn)) + ', private</span>';
    else if (s.indexOf('j-') === 0 || s === 'x-read' || s === 'review') {
      right = '<span class="hbtns"><button class="hbtn" data-act="repairOpen">Repair</button><button class="hbtn to" data-act="timeoutOpen">Time-out</button></span>';
    }
    return '<header class="top"><button class="brand" data-act="about" aria-label="About">Enough of Both</button>' + right + '</header>';
  }
  function footer() {
    var erase = state.mode ? (ui.eraseArm ? '<button class="link danger" data-act="erase">Tap again to erase everything</button>'
      : '<button class="link" data-act="armErase">Erase everything</button>') : '';
    var saveLink = state.mode && state.screen !== 'save' ? '<button class="link" data-act="util" data-arg="save">Save to a file</button>' : '';
    return '<footer class="foot"><button class="link" data-act="util" data-arg="about">About and evidence</button>' +
      '<button class="link" data-act="util" data-arg="help">Getting help</button>' + saveLink + erase + '</footer>';
  }
  function render() {
    var fn = SCREENS[state.screen] || SCREENS.welcome;
    $app.innerHTML = header() + '<main class="screen screen-' + state.screen + '">' + fn() + '</main>' + footer();
    tick();
  }

  var SCREENS = {};

  // ---------- start ----------
  SCREENS.welcome = function () {
    return '<h1>Enough of both</h1>' +
      '<p class="lede">A guide for talking about security and novelty: plans and open time, savings and experiences, safety and adventure.</p>' +
      '<div class="notice">This is a conversation guide, not a test. There are no scores and no right answers. It helps you each say what you need, feel heard, and try small things. ' +
      'You can pass on any question. If either of you feels unsafe or stuck, stop and talk to a professional. This app does not replace therapy.</div>' +
      '<h2>How it runs</h2><ol class="how">' +
      '<li><b>Private preparation</b>, 30 to 40 minutes each: rate situation cards, write a little, and pick what is core for you and where you have give.</li>' +
      '<li><b>Sitting one</b>, 60 to 75 minutes together: look at the cards, take turns as speaker and listener, name your pattern, and build a map of core and flexible needs.</li>' +
      '<li><b>Sitting two</b>, within a week, 40 to 50 minutes: offers, then asks, then one to three small experiments with a review date.</li>' +
      '<li><b>Review</b>, 20 to 30 minutes on the review date: keep, tweak or drop each experiment.</li></ol>' +
      '<p class="small muted">You need one phone, tablet or laptop and pass it between you. To prepare at the same time on a device each, both choose Start and then <b>Use two devices</b> after the set-up. The app sends your answers nowhere. They stay in this browser, and you can save them to a file to carry on later.</p>' +
      '<div class="choice"><button class="btn big primary" data-act="start">Start<span>Set up together, about 5 minutes</span></button></div>' +
      '<h2>Carry on from a saved file</h2><p class="small">Open a file you saved earlier, including for a review.</p>' + loadControls() +
      '<p class="small"><button class="link" data-act="util" data-arg="help">Getting help: when to stop, and who to call</button></p>';
  };

  SCREENS.resume = function () {
    var started = new Date(state.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    return '<h1>Welcome back</h1><p>You have a conversation in progress for ' + esc(nm('a')) + ' and ' + esc(nm('b')) + ', started ' + esc(started) + '.</p>' +
      '<div class="actions"><button class="btn" data-act="armErase">Start over</button><button class="btn primary" data-act="resume">Carry on</button></div>' +
      (ui.eraseArm ? '<p><button class="btn danger" data-act="erase">Erase this conversation and start over</button></p>' : '') +
      '<h2>Open a different saved file</h2>' + loadControls();
  };

  SCREENS.setup = function () {
    var c = state.context;
    var ctx = c ? '<div class="panel"><p class="small">' + (c.builtIn ? 'Built in: ' : '') + 'Values Deck results for ' + esc(c.names.a || 'Person 1') + ' and ' + esc(c.names.b || 'Person 2') + (c.source ? ' <span class="muted">(' + esc(c.source) + ')</span>' : '') + '.</p>' +
      '<div id="ctxMap">' + ctxMapHtml() + '</div>' +
      '<div class="actions wrap"><button class="btn sm" data-act="ctxSwap">Swap who is who</button><button class="btn sm ghost" data-act="ctxRemove">Remove</button></div></div>'
      : '<div class="actions wrap"><label class="btn filebtn">Add Values Deck results<input type="file" accept=".json,application/json,text/plain" data-file="vd" hidden></label></div>' +
        '<details class="paste"><summary>Or paste the text of the file</summary><textarea id="vdText" rows="4" spellcheck="false" autocomplete="off"></textarea>' +
        '<button class="btn" data-act="vdPaste">Add</button></details>' +
        (EB.PRELOAD ? '<div class="actions wrap"><button class="btn sm" data-act="ctxBuiltIn">Use the built-in results for ' + esc(EB.PRELOAD.names.a) + ' and ' + esc(EB.PRELOAD.names.b) + '</button></div>' : '');
    return '<h1>Set up</h1>' +
      '<label class="field"><span>First person <small>(prepares first)</small></span><input id="nameA" data-bind="names.a" value="' + esc(state.names.a) + '" maxlength="20" autocomplete="off"></label>' +
      '<label class="field"><span>Second person</span><input id="nameB" data-bind="names.b" value="' + esc(state.names.b) + '" maxlength="20" autocomplete="off"></label>' +
      '<p class="small muted">Who speaks first in the conversation is decided later, from what you each choose privately.</p>' +
      '<fieldset class="field"><legend>Options</legend>' +
      checkbox('Exchange short written notes before you talk', 'opts.exchange', { hint: '(each writes what they would like the other to understand, then each replies with reflection only; you can leave a day or two in between)' }) +
      checkbox('Save progress in this browser', 'opts.save', { hint: '(so you can stop and resume; erase at the end)' }) +
      '<label class="field inline"><span>Review experiments after</span><select id="reviewDays" data-bind="opts.reviewDays" data-num="1">' +
      [14, 21, 28].map(function (n) { return '<option value="' + n + '"' + (+state.opts.reviewDays === n ? ' selected' : '') + '>' + n + ' days</option>'; }).join('') + '</select></label></fieldset>' +
      '<h2>Values Deck results <small class="muted">(optional)</small></h2><p class="small">If you did the Values Deck, add its saved file. Your values circle and life-area ratings appear beside the cards, for context only.</p>' + ctx +
      '<div class="actions"><button class="btn" data-act="go" data-arg="welcome">Back</button><button class="btn primary" data-act="setupNext">Continue</button></div>';
  };

  SCREENS.custom = function () {
    var f = ui.cf || (ui.cf = { owner: 'a', text: '', pole: '' });
    var list = state.custom.length ? '<ul class="customs">' + state.custom.map(function (c) {
      return '<li>' + esc(c.text) + ' <small class="muted">(' + esc(nm(c.owner)) + ')</small> <button class="link" data-act="delCustom" data-arg="' + c.id + '">Remove</button></li>';
    }).join('') + '</ul>' : '';
    var full = state.custom.length >= EB.CUSTOM_MAX;
    return '<h1>Your own situation cards</h1><p>The deck has ' + EB.CARDS.length + ' cards about time, money, risk, planning, home, travel, work and health. ' +
      'You can add up to ' + EB.CUSTOM_MAX + ' of your own between you. Both of you rate every card.</p>' + list +
      (full ? '<p class="small muted">That is the most cards you can add.</p>' :
      '<div class="panel"><label class="field"><span>Whose idea?</span><select data-bind="_cf.owner">' +
      ['a', 'b'].map(function (p) { return '<option value="' + p + '"' + (f.owner === p ? ' selected' : '') + '>' + esc(nm(p)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>The situation, as a short sentence</span><input data-bind="_cf.text" value="' + esc(f.text) + '" maxlength="90" placeholder="e.g. Seeing my friends on my own most weeks."></label>' +
      '<label class="field"><span>Does it lean towards security or novelty? <small>(optional)</small></span><select data-bind="_cf.pole">' +
      [['', 'Not sure'], ['S', 'Security'], ['N', 'Novelty']].map(function (o) { return '<option value="' + o[0] + '"' + (f.pole === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label><button class="btn" data-act="addCustom">Add card</button></div>') +
      actions('setup', 'customNext:1', 'Continue to private preparation');
  };

  SCREENS.handover = function () {
    var h = state.handover || { to: 'a', purpose: 'prep' }, t = h.to, o = other(t);
    var what = {
      prep: 'Private preparation, about 30 to 40 minutes. You can stop part-way: save to a file and come back.',
      note: 'Write a short note for ' + esc(nm(o)) + ': what you would like them to understand.',
      reply: 'Read ' + esc(nm(o)) + '’s note, then write a reply that starts with reflection.',
      rate: 'One private question. It takes a few seconds.'
    }[h.purpose];
    return '<div class="handover"><p class="muted">Private turn</p><h1>Pass the device to ' + esc(nm(t)) + '</h1>' +
      '<p>' + what + '</p><p>' + esc(nm(o)) + ', look elsewhere until ' + esc(nm(t)) + ' hands it back.</p>' +
      '<button class="btn primary big" data-act="beginPrivate">I’m ' + esc(nm(t)) + ' and ready</button>' +
      (h.purpose !== 'prep' ? '' : lockedOne()
        ? '<p>Is ' + esc(nm(t)) + ' preparing on another device?</p><button class="btn" data-act="pairOpen">Send or add a preparation</button>'
        : '<p class="small muted">One device each for this part? <button class="link" data-act="pairOpen">Use two devices</button></p>') +
      '<p class="small muted">Stopping here for today? <button class="link" data-act="util" data-arg="save">Save to a file</button> first.</p></div>';
  };

  SCREENS.pair = function () {
    var mine = lockedOne(), o = mine && other(mine), h = '<h1>Two devices</h1>', to = (state.handover || {}).to;
    if (bothLocked()) return h + '<p>This device already has both preparations.</p><div class="actions"><button class="btn primary" data-act="pairBack">Back</button></div>';
    if (!mine) {
      return h + '<p>Each of you can do the private preparation on your own device, at the same time. Afterwards one device brings both together, and you use that device for the sittings.</p>' +
        '<ol class="how"><li>On each device, open this page, choose Start and set up with the same two names.</li>' +
        '<li>Below, choose who is preparing on this device. Do your preparation and lock it.</li>' +
        '<li>When it is locked, come back to this screen to send it to your partner, or to add theirs.</li></ol>' +
        '<h2>Who is preparing on this device?</h2><div class="actions wrap">' + ['a', 'b'].map(function (p) {
          return '<button class="btn' + (to === p ? ' on' : '') + '" data-act="pairWho" data-arg="' + p + '">' + esc(nm(p)) + '</button>';
        }).join('') + '</div>' +
        '<p class="small muted">The options, Values Deck results and written-notes exchange come from the device that ends up with both preparations. Custom cards from both devices are kept; a card one of you never saw counts as passed.</p>' +
        '<div class="actions"><button class="btn primary" data-act="pairBack">Continue</button></div>';
    }
    return h + '<p>' + esc(nm(mine)) + '’s preparation is locked on this device. One device needs both: either send ' + esc(nm(mine)) + '’s preparation to ' + esc(nm(o)) + ', or add ' + esc(nm(o)) + '’s here. Only one of you needs to send.</p>' +
      '<h2>Send ' + esc(nm(mine)) + '’s preparation</h2>' +
      '<p class="small">This holds ' + esc(nm(mine)) + '’s ratings and private writing, and nothing else, scrambled so it cannot be read outside the app. Send it to ' + esc(nm(o)) + ' yourself, for example in a message. The app sends nothing.</p>' +
      '<div class="actions wrap"><button class="btn primary" data-act="pairCopy">Copy as text</button><button class="btn" data-act="pairSave">Save as a file</button></div>' +
      '<details class="paste"><summary>Show the text</summary><textarea id="pairText" rows="5" readonly spellcheck="false">' + esc(seal(halfJson(mine))) + '</textarea></details>' +
      '<h2>Add ' + esc(nm(o)) + '’s preparation</h2>' +
      '<p class="small">Paste the text ' + esc(nm(o)) + ' sent you, or open their file. The next step is done together, so do this when you are both there.</p>' +
      '<textarea id="pairIn" rows="4" spellcheck="false" autocomplete="off" placeholder="Paste the text here"></textarea>' +
      '<div class="actions wrap"><button class="btn primary" data-act="pairPaste">Add the pasted preparation</button>' +
      '<label class="btn filebtn">Open their file<input type="file" accept=".txt,.json,application/json,text/plain" data-file="session" hidden></label></div>' +
      '<div class="actions"><button class="btn" data-act="pairBack">Back</button></div>';
  };

  // ---------- private preparation ----------
  var STEPS = [['p-cards', 'Cards'], ['p-reflect', 'Writing'], ['p-pick', 'Core and flexible'], ['p-pref', 'For the talk'], ['p-lock', 'Lock']];
  function stepper(cur) {
    var idx = STEPS.map(function (s) { return s[0]; }).indexOf(cur);
    return '<ol class="stepper">' + STEPS.map(function (s, i) { return '<li class="' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '">' + s[1] + '</li>'; }).join('') + '</ol>';
  }
  function P() { return state.prep[state.turn]; }

  SCREENS['p-intro'] = function () {
    var o = nm(other(state.turn));
    return '<h1>' + esc(nm(state.turn)) + ', this part is private</h1>' +
      '<p>Answer for yourself, as you are now. You can pass on anything, or mark a writing prompt “not yet” and come back to it.</p>' +
      '<ol class="how"><li><b>Cards</b>, 10 to 12 minutes: how much you need each situation, and how flexible you feel about it.</li>' +
      '<li><b>Writing</b>, 12 to 20 minutes: short prompts about security, newness, fears and hopes.</li>' +
      '<li><b>Core and flexible</b>, 3 minutes: up to three things that are core for you, and up to three where you have give.</li>' +
      '<li><b>For the talk</b>: whether you’d like to speak first, and what to share.</li></ol>' +
      '<div class="notice">What ' + esc(o) + ' will see: your need and flexibility ratings, and the core and flexible items you choose. ' +
      'Your card notes and your writing stay private unless you choose to share them. Your fear and hope lines are yours to read out or not.</div>' +
      '<div class="actions"><button class="btn primary" data-act="go" data-arg="p-cards">Start</button></div>';
  };

  SCREENS['p-cards'] = function () {
    var cs = cards(), r = P(), i = Math.min(r.idx, cs.length - 1), c = cs[i], a = r.ratings[c.id] || {};
    var dom = EB.DOMAINS.filter(function (d) { return d.id === c.domain; })[0];
    return stepper('p-cards') +
      '<p class="counter">Card ' + (i + 1) + ' of ' + cs.length + ' · ' + esc(dom ? dom.name : '') + '</p>' +
      '<div class="vcard dcard' + (a.pass ? ' passed' : '') + '"><p class="sit">' + esc(c.text) + '</p>' + (c.custom ? '<p class="small muted">Added by ' + esc(nm(c.owner)) + '</p>' : '') + '</div>' +
      '<h3>How much do you need this?</h3><div class="seg">' + EB.NEED.map(function (lab, n) {
        return '<button class="btn sm' + (a.need === n && !a.pass ? ' on' : '') + '" data-act="rate" data-arg="need:' + n + '">' + n + '<small>' + lab + '</small></button>';
      }).join('') + '</div>' +
      '<h3>How flexible do you feel about it?</h3><div class="seg three">' + Object.keys(EB.FLEX).map(function (k) {
        return '<button class="btn sm' + (a.flex === k && !a.pass ? ' on' : '') + '" data-act="rate" data-arg="flex:' + k + '">' + EB.FLEX[k] + '</button>';
      }).join('') + '</div>' +
      '<label class="field"><span>A note <small>(optional, private unless you share notes later)</small></span><input data-bind="prep.' + state.turn + '.ratings.' + c.id + '.note" maxlength="140" value="' + esc(a.note || '') + '"></label>' +
      '<div class="actions spread"><button class="btn" data-act="cardNav" data-arg="-1">Back</button>' +
      '<button class="btn ghost" data-act="rate" data-arg="pass:1">' + (a.pass ? 'Un-pass' : 'Pass') + '</button>' +
      '<button class="btn primary" data-act="cardNav" data-arg="1">Next</button></div>';
  };

  SCREENS['p-reflect'] = function () {
    var r = P(), i = Math.min(r.rIdx, EB.REFLECT.length - 1), q = EB.REFLECT[i], a = r.reflect[q.id] || {};
    var path = 'prep.' + state.turn + '.reflect.' + q.id + '.text', words = (a.text || '').trim().split(/\s+/).filter(Boolean).length;
    return stepper('p-reflect') + '<p class="counter">Prompt ' + (i + 1) + ' of ' + EB.REFLECT.length + (q.id === 'R12' ? ' · a different angle' : '') + '</p>' +
      '<div class="prompt"><p class="q">' + esc(q.q) + '</p>' + (q.hint ? '<p class="small">' + esc(q.hint) + '</p>' : '') + '</div>' +
      (a.pass ? '<p class="small muted">You passed on this one. Write something to un-pass it.</p>' : '') +
      '<label class="field"><span class="sr">Your answer</span><textarea id="reflectText" data-bind="' + path + '" data-wc="1" rows="6" maxlength="1500">' + esc(a.text || '') + '</textarea></label>' +
      '<p class="small muted" id="wc">' + words + ' words. No minimum.</p>' +
      '<div class="actions spread"><button class="btn" data-act="refNav" data-arg="-1">Back</button>' +
      '<span class="gap"><button class="btn ghost" data-act="refMark" data-arg="notYet">Not yet</button><button class="btn ghost" data-act="refMark" data-arg="pass">Pass</button></span>' +
      '<button class="btn primary" data-act="refNav" data-arg="1">Next</button></div>';
  };

  function pickList(kind) {
    var r = P(), rated = cards().filter(function (c) { var a = r.ratings[c.id]; return a && !a.pass && a.need != null; });
    var mine = kind === 'core' ? r.core : r.flexible, others = kind === 'core' ? r.flexible : r.core;
    var fit = kind === 'core'
      ? function (a) { return a.flex === 'core' || a.need >= 3; }
      : function (a) { return a.flex === 'very' || a.flex === 'some'; };
    var list = rated.filter(function (c) { return ui['all_' + kind] || fit(r.ratings[c.id]) || mine.indexOf(c.id) >= 0; });
    list.sort(function (x, y) {
      var ax = r.ratings[x.id], ay = r.ratings[y.id];
      return kind === 'core' ? (ay.need - ax.need) : ((ax.flex === 'very' ? 0 : 1) - (ay.flex === 'very' ? 0 : 1) || ax.need - ay.need);
    });
    return '<div class="chips">' + (list.length ? list.map(function (c) {
      var a = r.ratings[c.id], on = mine.indexOf(c.id) >= 0, dis = others.indexOf(c.id) >= 0;
      return '<button class="chip tap' + (on ? ' on' : '') + '" data-act="pick" data-arg="' + kind + ':' + c.id + '"' + (dis ? ' disabled' : '') + ' title="' + esc(c.text) + '">' +
        esc(c.short) + ' <small>' + a.need + ' · ' + EB.FLEX_SHORT[a.flex] + '</small></button>';
    }).join('') : '<p class="small muted">No cards fit yet.</p>') + '</div>' +
      '<button class="link small" data-act="toggleAll" data-arg="' + kind + '">' + (ui['all_' + kind] ? 'Show suggested cards only' : 'Show all my rated cards') + '</button>';
  }
  SCREENS['p-pick'] = function () {
    var r = P(), t = state.turn, notYet = EB.REFLECT.filter(function (q) { return (r.reflect[q.id] || {}).notYet && !(r.reflect[q.id] || {}).text; });
    return stepper('p-pick') + '<h1>Core and flexible</h1>' +
      (notYet.length ? '<p class="small">You marked ' + notYet.length + ' writing prompt' + (notYet.length > 1 ? 's' : '') + ' “not yet”. <button class="link" data-act="refJump" data-arg="' + notYet[0].id + '">Go back to ' + (notYet.length > 1 ? 'them' : 'it') + '</button></p>' : '') +
      '<h2>Core for me <small class="muted">(up to 3)</small></h2><p class="small">The things you would most want protected. Suggested: cards you marked core or need quite a lot.</p>' + pickList('core') +
      (r.core.length ? r.core.map(function (id) {
        return '<div class="panel"><h3>' + esc(card(id).short) + '</h3>' +
          field('What I’m afraid would happen without this is…', 'prep.' + t + '.fear.' + id, { rows: 2, max: 280 }) +
          field('What I hope having this would give us is…', 'prep.' + t + '.hope.' + id, { rows: 2, max: 280 }) + '</div>';
      }).join('') : '') +
      '<h2>Flexible for me <small class="muted">(up to 3)</small></h2><p class="small">Places where you have give, and could offer something. Suggested: cards you marked very flexible or some give.</p>' + pickList('flexible') +
      actions('p-reflect', 'p-pref');
  };

  SCREENS['p-pref'] = function () {
    var r = P(), t = state.turn, o = nm(other(t));
    function opt(path, val, label) { return '<button class="btn sm' + (getPath(state, path) === val ? ' on' : '') + '" data-act="setv" data-arg="' + path + '|' + val + '">' + label + '</button>'; }
    return stepper('p-pref') + '<h1>For the conversation</h1>' +
      '<h3>Would you like to speak first or second?</h3><div class="seg three">' + opt('prep.' + t + '.first', 'first', 'First') + opt('prep.' + t + '.first', 'second', 'Second') + opt('prep.' + t + '.first', 'either', 'Either') + '</div>' +
      '<p class="small muted">' + esc(o) + ' won’t see your answer. The app uses both answers to suggest who starts.</p>' +
      '<h3>Would it help to read from your notes when it’s your turn?</h3><div class="seg three">' + opt('prep.' + t + '.readNotes', 'yes', 'Yes') + opt('prep.' + t + '.readNotes', 'no', 'No') + opt('prep.' + t + '.readNotes', 'maybe', 'Maybe') + '</div>' +
      '<h3>Sharing</h3>' +
      checkbox('Show my card notes to ' + esc(o) + ' when we look at the cards together', 'prep.' + t + '.share.notes') +
      checkbox('Show my writing to ' + esc(o) + ' at the end of my turn as speaker', 'prep.' + t + '.share.reflect', { hint: '(you can still open it yourself while you speak)' }) +
      actions('p-pick', 'p-lock');
  };

  SCREENS['p-lock'] = function () {
    var r = P(), rated = Object.keys(r.ratings).filter(function (k) { return r.ratings[k] && !r.ratings[k].pass && r.ratings[k].need != null; }).length;
    var passed = Object.keys(r.ratings).filter(function (k) { return r.ratings[k] && r.ratings[k].pass; }).length;
    var wrote = EB.REFLECT.filter(function (q) { return (r.reflect[q.id] || {}).text; }).length;
    var missing = cards().length - rated - passed;
    return stepper('p-lock') + '<h1>Lock your answers</h1>' +
      '<p>' + rated + ' cards rated, ' + passed + ' passed' + (missing > 0 ? ', <b>' + missing + ' not yet answered</b> (they will count as passed)' : '') + '. ' + wrote + ' of ' + EB.REFLECT.length + ' writing prompts answered.</p>' +
      '<p><b>Core for you:</b> ' + (r.core.length ? r.core.map(function (id) { return esc(card(id).short); }).join(', ') : 'none chosen') + '<br>' +
      '<b>Flexible for you:</b> ' + (r.flexible.length ? r.flexible.map(function (id) { return esc(card(id).short); }).join(', ') : 'none chosen') + '</p>' +
      '<div class="notice">Once locked, your ratings can’t be changed. That keeps the reveal fair. You can still pass on anything in the conversation.</div>' +
      actions('p-pref', 'lock:1', 'Lock my answers');
  };

  // ---------- written exchange ----------
  SCREENS['x-note'] = function () {
    var t = state.turn, o = other(t);
    return '<h1>A note for ' + esc(nm(o)) + '</h1><p>What would you like ' + esc(nm(o)) + ' to understand before you talk? Write about yourself. A few sentences is enough.</p>' +
      field('What I’d like you to understand', 'exchange.notes.' + t, { rows: 7, max: 1500, check: true }) +
      '<p class="small muted">' + esc(nm(o)) + ' reads this privately, then writes a reply that starts with what they heard.</p>' +
      actions(null, 'noteDone:1', 'Done');
  };
  SCREENS['x-wait'] = function () {
    return '<h1>Both notes are written</h1><p>If you like, take a day or two before reading and replying. Save to a file now, and open it again when you are ready.</p>' +
      '<p>When you are ready, each of you reads the other’s note privately and writes a reply. The reply starts with reflection, with no rebuttal. There will be time to say your side.</p>' +
      '<div class="actions wrap"><button class="btn" data-act="util" data-arg="save">Save to a file</button></div>' +
      actions(null, 'startReplies:1', 'Start the replies');
  };
  var REPLY_STEMS = ['What I heard is…', 'What I’m curious about is…', 'It makes sense to me that…', 'What I’m hearing you hope for is…'];
  SCREENS['x-reply'] = function () {
    var t = state.turn, o = other(t);
    return '<h1>' + esc(nm(o)) + '’s note</h1><blockquote class="said said-' + o + '">' + esc(state.exchange.notes[o] || '(No note written.)') + '</blockquote>' +
      '<h2>Your reply</h2><p class="small">Start with reflection: what you heard, and what you are curious about. No rebuttal.</p>' +
      '<div class="chips">' + REPLY_STEMS.map(function (s, i) { return '<button class="chip tap" data-act="stem" data-arg="' + i + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      field('Reply', 'exchange.replies.' + t, { rows: 6, max: 1500, check: true }) +
      actions(null, 'replyDone:1', 'Done');
  };
  SCREENS['x-read'] = function () {
    var ex = state.exchange;
    return '<h1>Your notes and replies</h1><p>Read these together, or each to yourselves. Then you are ready to start sitting one.</p>' +
      ['a', 'b'].map(function (p) {
        var o = other(p);
        return '<div class="panel"><h3>' + esc(nm(p)) + '’s note</h3><blockquote class="said said-' + p + '">' + esc(ex.notes[p] || '(No note.)') + '</blockquote>' +
          '<h4>' + esc(nm(o)) + '’s reply</h4><blockquote class="said said-' + o + '">' + esc(ex.replies[o] || '(No reply.)') + '</blockquote></div>';
      }).join('') + actions(null, 'j-agree', 'Start sitting one');
  };

  // ---------- sitting one ----------
  SCREENS['j-agree'] = function () {
    return '<p class="counter">Sitting one</p><h1>Before you start</h1><p>Read these out loud together.</p>' +
      '<ol class="rules">' + EB.AGREEMENTS.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>' +
      '<p class="small">The <b>Time-out</b> and <b>Repair</b> buttons stay at the top of the screen from now on.</p>' +
      checkbox(esc(nm('a')) + ' agrees', 'conv.agree.a') + checkbox(esc(nm('b')) + ' agrees', 'conv.agree.b') +
      actions(null, 'agreeNext:1');
  };

  function cardRow(c) {
    var ra = rating('a', c.id), rb = rating('b', c.id);
    function side(p, r) {
      var na = r.pass || r.need == null ? null : r.need;
      return '<div class="trk"><span class="tn who-txt-' + p + '">' + esc(nm(p)) + '</span>' + dots(na, p) + '<span class="fl">' + (r.pass ? 'Passed' : r.flex ? EB.FLEX_SHORT[r.flex] : '') + '</span></div>';
    }
    var notes = ['a', 'b'].map(function (p) {
      var r = rating(p, c.id);
      return state.prep[p].share.notes && r.note ? '<div class="said said-' + p + ' small"><b>' + esc(nm(p)) + ':</b> ' + esc(r.note) + '</div>' : '';
    }).join('');
    return '<div class="crow"><p class="ctext">' + esc(c.text) + (c.pole ? ' <span class="pole">' + EB.POLE[c.pole] + '</span>' : '') + '</p>' + side('a', ra) + side('b', rb) + notes + '</div>';
  }
  function needOf(p, id) { var r = rating(p, id); return r.pass || r.need == null ? null : r.need; }
  SCREENS['j-reveal'] = function () {
    var view = state.conv.view, cs = cards(), body;
    if (view === 'gap') {
      var withGap = cs.filter(function (c) { return needOf('a', c.id) != null && needOf('b', c.id) != null; })
        .sort(function (x, y) { return Math.abs(needOf('a', y.id) - needOf('b', y.id)) - Math.abs(needOf('a', x.id) - needOf('b', x.id)); });
      body = '<p class="notice">Gaps are topics to explore, not problems.</p>' + withGap.map(cardRow).join('');
    } else if (view === 'give') {
      var give = cs.filter(function (c) {
        function has(p) { var r = rating(p, c.id), q = rating(other(p), c.id); return !r.pass && r.flex === 'core' && r.need >= 3 && !q.pass && (q.flex === 'very' || (q.need != null && q.need <= 1)); }
        return has('a') || has('b');
      });
      body = '<p class="notice">Cards where one of you marked it core and needs it, and the other is very flexible about it or barely needs it. These are often the easiest places to start.</p>' +
        (give.length ? give.map(cardRow).join('') : '<p class="muted">No cards like that this time.</p>');
    } else {
      body = EB.DOMAINS.map(function (d) {
        var list = cs.filter(function (c) { return c.domain === d.id; });
        return list.length ? '<h2>' + esc(d.name) + '</h2>' + list.map(cardRow).join('') : '';
      }).join('');
    }
    return '<p class="counter">Sitting one · about 10 minutes</p><h1>Your cards, side by side</h1>' +
      '<p>Look first. Ask curious questions only: no answers or arguments yet.</p>' +
      '<div class="prompt"><p class="small">Curious questions</p>' + EB.CURIOUS.map(function (q) { return '<p class="q sm">' + esc(q) + '</p>'; }).join('') + '</div>' +
      contextPanel(false) +
      '<div class="tabs" role="tablist">' + [['area', 'By area'], ['gap', 'Biggest gaps first'], ['give', 'Where one of you has give']].map(function (v) {
        return '<button class="tab' + (view === v[0] ? ' on' : '') + '" data-act="setv" data-arg="conv.view|' + v[0] + '">' + v[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="small muted legend">Dots run from 0 (not needed) to 4 (really need).</p>' + body +
      actions('j-agree', 'j-order');
  };

  function firstSuggestion() {
    var pa = state.prep.a.first || 'either', pb = state.prep.b.first || 'either', ra = state.prep.a.readNotes === 'yes', rb = state.prep.b.readNotes === 'yes';
    if (pa === 'first' && pb !== 'first') return { p: 'a', why: 'Based on what you each chose privately.' };
    if (pb === 'first' && pa !== 'first') return { p: 'b', why: 'Based on what you each chose privately.' };
    if (pa === 'second' && pb === 'either') return { p: 'b', why: 'Based on what you each chose privately.' };
    if (pb === 'second' && pa === 'either') return { p: 'a', why: 'Based on what you each chose privately.' };
    if (pa === 'second' && pb === 'second') {
      if (ra && !rb) return { p: 'a', why: 'You both said second. ' + nm('a') + ' said reading from notes would help, so the app suggests ' + nm('a') + ' starts by reading.' };
      if (rb && !ra) return { p: 'b', why: 'You both said second. ' + nm('b') + ' said reading from notes would help, so the app suggests ' + nm('b') + ' starts by reading.' };
      return { p: 'a', why: 'You both said second, so choose together. Reading from notes is fine.' };
    }
    return { p: 'a', why: 'You both said ' + (pa === 'first' ? 'first' : 'either') + ', so choose together.' };
  }
  SCREENS['j-order'] = function () {
    var s = firstSuggestion(), f = state.conv.first || s.p;
    return '<p class="counter">Sitting one</p><h1>Who speaks first?</h1>' +
      '<p class="big">' + nameTag(f) + ' starts.</p><p class="small muted">' + esc(s.why) + '</p>' +
      '<div class="actions wrap"><button class="btn sm" data-act="setv" data-arg="conv.first|' + other(f) + '">Swap: ' + esc(nm(other(f))) + ' starts</button></div>' +
      '<p>Two rounds of about 12 minutes each. The speaker talks in short chunks. After each chunk, the listener says back what they heard until the speaker says “yes, that’s it”. Only then can the floor pass.</p>' +
      actions('j-reveal', 'startRounds:' + f, 'Start round one');
  };

  function prepNotes(p) {
    var r = state.prep[p];
    var core = r.core.map(function (id) {
      return '<li><b>' + esc(card(id).short) + '</b>' + (r.fear[id] ? '<br><span class="small">Afraid of: ' + esc(r.fear[id]) + '</span>' : '') + (r.hope[id] ? '<br><span class="small">Hope: ' + esc(r.hope[id]) + '</span>' : '') + '</li>';
    }).join('');
    var refl = EB.REFLECT.filter(function (q) { return (r.reflect[q.id] || {}).text; }).map(function (q) {
      return '<li><span class="small muted">' + esc(q.q) + '</span><br>' + esc(r.reflect[q.id].text) + '</li>';
    }).join('');
    return '<details class="notes"><summary>' + esc(nm(p)) + '’s preparation <small>(shows on screen when open)</small></summary>' +
      '<h4>Core</h4>' + (core ? '<ul class="plain">' + core + '</ul>' : '<p class="small muted">None chosen.</p>') +
      '<h4>Flexible</h4><p class="small">' + (r.flexible.length ? r.flexible.map(function (id) { return esc(card(id).short); }).join(', ') : 'None chosen.') + '</p>' +
      (refl ? '<h4>Writing</h4><ul class="plain">' + refl + '</ul>' : '') + '</details>';
  }
  SCREENS['j-round'] = function () {
    var cur = state.conv.cur, rd = state.conv.rounds[cur.round], sp = rd.speaker, li = other(sp), ci = rd.chunks.length - 1, ch = rd.chunks[ci];
    var phase = cur.phase, last = cur.round === 1;
    var controls;
    if (phase === 'speak') controls = '<p class="small">' + esc(nm(sp)) + ' speaks for two or three minutes, then pauses.</p><button class="btn primary big" data-act="chunkDone">Pause: over to ' + esc(nm(li)) + ' to reflect</button>';
    else if (phase === 'reflect') controls = '<p class="small">' + esc(nm(li)) + ' says back what they heard. ' + esc(nm(sp)) + ', did they get it?</p>' +
      '<div class="actions wrap"><button class="btn" data-act="notQuite">Not quite</button><button class="btn primary" data-act="gotIt">Yes, that’s it</button></div>';
    else controls = '<p class="ok">' + esc(nm(sp)) + ' feels heard on that chunk.</p><div class="actions wrap"><button class="btn" data-act="anotherChunk">Another chunk</button>' +
      '<button class="btn primary" data-act="passFloor">' + (last ? 'Finish round two' : 'Pass the floor to ' + esc(nm(li))) + '</button></div>';
    var sharedRefl = state.prep[sp].share.reflect && phase === 'confirmed' ? '<p class="small muted">' + esc(nm(sp)) + ' chose to share their writing; it is in their preparation notes below.</p>' : '';
    return '<p class="counter">Sitting one · round ' + (cur.round + 1) + ' of 2 · chunk ' + (ci + 1) + '</p>' +
      '<div class="floor floor-' + sp + '">Floor: ' + esc(nm(sp)) + '</div>' +
      '<div class="clockbar">' + (ui.showTimer ? '<span id="chunkClock" class="clock">0:00</span> <button class="link small" data-act="timerReset">Reset</button> ' : '') +
      '<button class="link small" data-act="toggleTimer">' + (ui.showTimer ? 'Hide timer' : 'Show a timer') + '</button></div>' +
      '<div class="roles"><section class="role role-speak"><h3>' + esc(nm(sp)) + ', speaking</h3><p class="small">' + esc(EB.SPEAKER_GUIDE) + '</p>' +
      '<ul class="stems">' + EB.SPEAKER.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="role role-listen"><h3>' + esc(nm(li)) + ', listening</h3><p class="small">' + esc(EB.LISTENER_GUIDE) + '</p>' +
      '<ul class="stems">' + EB.LISTENER.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></section></div>' +
      '<div class="panel now">' + controls + '</div>' + sharedRefl +
      field('What I heard <small>(optional, ' + esc(nm(li)) + ' can jot it down)</small>', 'conv.rounds.' + cur.round + '.chunks.' + ci + '.summary', { rows: 2, max: 400 }) +
      prepNotes(sp) +
      '<div class="actions"><button class="btn ghost" data-act="go" data-arg="j-pause">Pause for today</button></div>';
  };

  SCREENS['j-pattern'] = function () {
    var p = 'conv.pattern.';
    return '<p class="counter">Sitting one · about 5 minutes</p><h1>Name the loop together</h1>' +
      '<p>Describe your pattern as if you were narrators watching it. Neither of you is the cause; the loop is the thing you are both up against.</p>' +
      field('When…', p + 'trigger', { ph: 'e.g. plans for the weekend are still open on Friday', max: 200 }) +
      field('one of us tends to…', p + 'x', { ph: 'e.g. ask for a plan, more than once', max: 200 }) +
      field('and the other tends to…', p + 'y', { ph: 'e.g. go quiet or change the subject', max: 200 }) +
      field('Then…', p + 'then', { ph: 'e.g. both of us feel unheard', max: 200 }) +
      field('What we’d both like instead is…', p + 'instead', { ph: 'e.g. a ten-minute plan on Thursday, with one open slot', max: 200 }) +
      '<div class="panel"><p class="small muted">Read it back</p><p id="patternPreview">' + patternText() + '</p></div>' +
      '<h2>What else is going on right now?</h2><p class="small">Outside pressures make everything harder. Tick what applies.</p>' +
      EB.STRESSORS.map(function (s, i) { return checkbox(esc(s), 'conv.stressors.s' + i); }).join('') +
      field('Something else', 'conv.stressOther', { max: 120 }) +
      actions(null, 'j-break');
  };
  function patternText() {
    var p = state.conv.pattern, b = function (v, ph) { return v ? esc(v) : '<span class="muted">[' + ph + ']</span>'; };
    return 'When ' + b(p.trigger, '…') + ', one of us tends to ' + b(p.x, '…') + ', and the other tends to ' + b(p.y, '…') + '. Then ' + b(p.then, '…') +
      '. What we’d both like instead is ' + b(p.instead, '…') + '.';
  }

  SCREENS['j-break'] = function () {
    if (!ui.breakStart) ui.breakStart = Date.now();
    return '<p class="counter">Sitting one</p><h1>Take five minutes</h1><p>Stretch, get some water, step outside. Not a time to rehearse what you’ll say next.</p>' +
      '<p class="clock big" id="breakClock">5:00</p>' + actions(null, 'j-map', 'Back to it: the map');
  };

  // ---------- map ----------
  function mapModel() {
    var A = state.prep.a, B = state.prep.b, both = [], items = [];
    cards().forEach(function (c) {
      var ra = rating('a', c.id), rb = rating('b', c.id);
      var bothCore = !ra.pass && !rb.pass && ra.need >= 3 && rb.need >= 3 && ra.flex === 'core' && rb.flex === 'core';
      if (bothCore || (A.core.indexOf(c.id) >= 0 && B.core.indexOf(c.id) >= 0)) both.push(c.id);
    });
    ['a', 'b'].forEach(function (p) {
      var S = state.prep[p];
      S.core.forEach(function (id) { if (both.indexOf(id) < 0) items.push({ key: p + ':' + id, id: id, zone: p }); });
      S.flexible.forEach(function (id) { if (both.indexOf(id) < 0) items.push({ key: p + ':' + id, id: id, zone: p }); });
    });
    both.forEach(function (id) { items.push({ key: 'both:' + id, id: id, zone: 'both' }); });
    state.map.added.forEach(function (x) { items.push({ key: 'add:' + x, id: x, zone: 'both' }); });
    var zones = { a: [], both: [], b: [] }, seen = {};
    items.forEach(function (it) {
      var zn = state.map.moves[it.key] || it.zone;
      if (zn === 'none' || seen[zn + it.id]) return;
      seen[zn + it.id] = 1;
      var kind = zn === 'both' ? 'core' : (rating(zn, it.id).flex === 'core' || state.prep[zn].core.indexOf(it.id) >= 0 ? 'core' : 'flex');
      zones[zn].push({ key: it.key, id: it.id, kind: kind });
    });
    ['a', 'b'].forEach(function (p) { zones[p].sort(function (x, y) { return (x.kind === 'core' ? 0 : 1) - (y.kind === 'core' ? 0 : 1); }); });
    return zones;
  }
  function vennHtml(interactive) {
    var Z = mapModel();
    function chipsFor(zn) {
      if (!Z[zn].length) return '<p class="small muted empty">Nothing here yet</p>';
      return Z[zn].map(function (it) {
        var sel = ui.mapSel === it.key;
        var inner = esc(card(it.id).short) + (it.kind === 'flex' ? '<small>flexible</small>' : '');
        return interactive ? '<button class="vitem ' + it.kind + ' z-' + zn + (sel ? ' sel' : '') + '" data-act="mapSel" data-arg="' + it.key + '">' + inner + '</button>'
          : '<span class="vitem ' + it.kind + ' z-' + zn + '">' + inner + '</span>';
      }).join('');
    }
    return '<div class="venn"><div class="vcol"><p class="vhead who-txt-a">' + esc(nm('a')) + '</p>' + chipsFor('a') + '</div>' +
      '<div class="vcol mid"><p class="vhead">Both</p>' + chipsFor('both') + '</div>' +
      '<div class="vcol"><p class="vhead who-txt-b">' + esc(nm('b')) + '</p>' + chipsFor('b') + '</div></div>';
  }
  var MAP_CAPTION = 'Positions reflect today’s ratings. The size of the overlap is not a compatibility measure. Items outside the overlap are normal: that is where experiments help.';
  SCREENS['j-map'] = function () {
    ui.breakStart = null;
    var sel = ui.mapSel, bar = '';
    if (sel) {
      var id = sel.split(':')[1];
      bar = '<div class="panel movebar"><p class="small">Move <b>' + esc(card(id).short) + '</b> to:</p><div class="actions wrap">' +
        ['a', 'both', 'b'].map(function (zn) { return '<button class="btn sm" data-act="mapMove" data-arg="' + zn + '">' + (zn === 'both' ? 'Both' : esc(nm(zn))) + '</button>'; }).join('') +
        '<button class="btn sm ghost" data-act="mapMove" data-arg="none">Take off the map</button><button class="btn sm ghost" data-act="mapSel" data-arg="">Cancel</button></div></div>';
    }
    var addable = cards().filter(function (c) { return state.map.added.indexOf(c.id) < 0; });
    return '<p class="counter">Sitting one · about 15 minutes</p><h1>Your map of core and flexible</h1>' +
      '<p>Each circle holds one person’s core needs (solid) and the places they have give (dashed). The middle holds what you both need and both hold as core.</p>' +
      vennHtml(true) + '<p class="small muted caption">' + MAP_CAPTION + '</p>' + bar +
      '<p class="small">Tap an item to move it, or take it off the map. You can also add a card.</p>' +
      '<div class="addrow"><select id="mapAdd">' + addable.map(function (c) { return '<option value="' + c.id + '">' + esc(c.short) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm" data-act="mapAdd">Add to the middle</button></div>' +
      '<h3>Look for</h3><ul class="plain small"><li>Something core for one of you that sits in the other’s flexible area: that is an easy offer.</li>' +
      '<li>Something in the middle: protect it together.</li><li>Core for each of you, on opposite sides: a candidate for a small experiment, not a verdict.</li></ul>' +
      actions(null, 'j-pause');
  };

  SCREENS['j-pause'] = function () {
    if (!state.conv.sitting2) state.conv.sitting2 = addDays(today(), 3);
    return '<p class="counter">End of sitting one</p><h1>Stop here, or carry on?</h1>' +
      '<p>If either of you is tired, stop here. Sitting two works best within a week.</p>' +
      field('Sitting two on', 'conv.sitting2', { type: 'date' }) +
      '<p class="small"><a id="gcal2" href="' + esc(gcal('Enough of Both: sitting two', state.conv.sitting2)) + '" target="_blank" rel="noopener">Add to Google Calendar</a> <span class="muted">or put the date in any calendar.</span></p>' +
      '<div class="actions wrap"><button class="btn" data-act="util" data-arg="save">Save to a file</button></div>' +
      actions('j-map', 'j-recap', 'Start sitting two now');
  };
  function gcal(title, date) {
    if (!date) return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title);
    var d = date.replace(/-/g, ''), d2 = addDays(date, 1).replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + d + '/' + d2 +
      '&details=' + encodeURIComponent('Open Enough of Both and your saved file.');
  }

  // ---------- sitting two ----------
  SCREENS['j-recap'] = function () {
    return '<p class="counter">Sitting two · about 5 minutes</p><h1>Where you got to</h1>' +
      '<p>Re-read your map and the loop you named. Agree the same ground rules as last time: one speaker at a time, pass allowed, time-out allowed.</p>' +
      vennHtml(false) + '<p class="small muted caption">' + MAP_CAPTION + '</p>' +
      '<div class="panel"><p class="small muted">The loop you named</p><p>' + patternText() + '</p></div>' +
      field('Anything to add since last time?', 'conv.recapNote', { rows: 2, max: 400 }) +
      actions(null, 'j-offers');
  };

  SCREENS['j-offers'] = function () {
    var t = ui.offTab || 'a', O = state.offers[t], o = other(t), base = 'offers.' + t + '.';
    var hasOffer = O.offers.some(function (x) { return x && x.trim(); });
    return '<p class="counter">Sitting two · about 10 minutes</p><h1>Offers first, then asks</h1>' +
      '<p>Each of you writes what you could offer before what you would like to ask. Asks are requests, not rules: “Would you be open to…?”</p>' +
      '<div class="tabs">' + ['a', 'b'].map(function (p) { return '<button class="tab' + (t === p ? ' on' : '') + '" data-act="offTab" data-arg="' + p + '">' + esc(nm(p)) + '</button>'; }).join('') + '</div>' +
      '<h2>' + esc(nm(t)) + ' offers ' + esc(nm(o)) + '</h2>' +
      [0, 1, 2].map(function (i) { return field('Offer ' + (i + 1), base + 'offers.' + i, { max: 200, ph: i === 0 ? 'e.g. a written plan for the move, with dates' : '' }); }).join('') +
      '<h2>' + esc(nm(t)) + ' asks</h2>' + (hasOffer ? '' : '<p class="small muted">Write at least one offer first.</p>') +
      [0, 1, 2].map(function (i) { return askField(t, i, !hasOffer); }).join('') +
      '<h2>Supporting ' + esc(nm(o)) + '’s side</h2><p class="small">Answer the ones that fit.</p>' +
      EB.SUPPORT.map(function (s) { return field(esc(s.q), base + 'support.' + s.id, { max: 240, hint: s.hint ? '(' + esc(s.hint) + ')' : '' }); }).join('') +
      '<div class="actions">' + (t === 'a' ? '<button class="btn primary" data-act="offTab" data-arg="b">Now ' + esc(nm('b')) + '</button>' :
        '<button class="btn" data-act="offTab" data-arg="a">Back to ' + esc(nm('a')) + '</button><button class="btn primary" data-act="go" data-arg="j-exp">Design experiments</button>') + '</div>';
  };

  function askField(t, i, disabled) {
    var path = 'offers.' + t + '.asks.' + i, v = getPath(state, path) || '';
    return '<label class="field"><span>Ask ' + (i + 1) + '</span><span class="prefixed"><span class="pre">Would you be open to</span>' +
      '<input id="f-' + path.replace(/\./g, '-') + '" data-bind="' + path + '" data-check="1" maxlength="200" placeholder="…?" value="' + esc(v) + '"' + (disabled ? ' disabled' : '') + ' autocomplete="off"></span></label>' + chk(path, v);
  }
  function askText(x) {
    var s = String(x || '').trim().replace(/^would you be open to\s*/i, '').replace(/\?+$/, '').trim();
    return s ? 'Would you be open to ' + s + '?' : '';
  }
  function asksOf(O) { return O.asks.map(askText).filter(Boolean); }

  // ---------- experiments ----------
  function tpl(id) { return EB.TEMPLATES.filter(function (t) { return t.id === id; })[0]; }
  function fill(str, e, html) {
    var T = tpl(e.template);
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      var f = T.fields.filter(function (x) { return x.k === k; })[0], v = (e.fields || {})[k];
      if (f && f.type === 'person') v = v ? nm(v) : '';
      if (f && f.type === 'date') v = v ? fmtDate(v) : '';
      if (v && String(v).trim()) return html ? esc(v) : v;
      var ph = '[' + (f ? (f.bl || f.label.toLowerCase()) : k) + ']';
      return html ? '<span class="blank">' + esc(ph) + '</span>' : ph;
    });
  }
  function expPreview(e) {
    var T = tpl(e.template), g = function (p, k) { return e[k] && e[k][p] ? esc(e[k][p]) : '<span class="blank">[not filled in]</span>'; };
    return '<p><b>' + esc(e.title || T.name) + '.</b> ' + fill(T.text, e, true) + ' ' + fill(T.ifThen, e, true) + '</p>' +
      '<p class="small">' + ['a', 'b'].map(function (p) { return nameTag(p) + ' gives: ' + g(p, 'gives') + '; gets: ' + g(p, 'gets') + '.'; }).join('<br>') + '</p>' +
      '<p class="small">From ' + (e.start ? esc(fmtDate(e.start)) : '<span class="blank">[start]</span>') + '. Review on <b>' + (e.review ? esc(fmtDate(e.review)) : '<span class="blank">[review date]</span>') + '</b>.' +
      (e.signals ? ' We’ll know it’s working if ' + esc(e.signals) + '.' : '') + '</p>';
  }
  SCREENS['j-exp'] = function () {
    var ex = state.experiments, chooser = '';
    if (ui.choosing) {
      chooser = '<h2>Choose a template</h2><div class="tplgrid">' + EB.TEMPLATES.map(function (t) {
        return '<button class="poolcard" data-act="newExp" data-arg="' + t.id + '"><b>' + esc(t.name) + '</b><span>' + esc(t.blurb) + '</span></button>';
      }).join('') + '</div><button class="link" data-act="chooseExp" data-arg="0">Cancel</button>';
    }
    return '<p class="counter">Sitting two · 15 to 20 minutes</p><h1>Small experiments</h1>' +
      '<p>One to three small, time-limited things to try, framed as “how do we each get enough of both?”. Each has an if–then line and a review date.</p>' +
      '<p class="small muted">Keep it to the next three months. This round is not for deciding where to live long-term, or when to have children.</p>' +
      (ex.length ? ex.map(function (e, i) {
        return '<div class="panel exp">' + expPreview(e) + '<div class="actions wrap"><button class="btn sm" data-act="editExp" data-arg="' + i + '">Edit</button>' +
          '<button class="btn sm ghost" data-act="delExp" data-arg="' + i + '">' + (ui.delArm === i ? 'Tap again to remove' : 'Remove') + '</button></div></div>';
      }).join('') : '<p class="muted">No experiments yet.</p>') +
      (ex.length < EB.EXP_MAX && !ui.choosing ? '<div class="actions wrap"><button class="btn" data-act="chooseExp" data-arg="1">Add an experiment</button></div>' : '') + chooser +
      actions('j-offers', 'j-close', 'Close the sitting');
  };
  SCREENS['j-exp-edit'] = function () {
    var i = ui.expIdx, e = state.experiments[i];
    if (!e) { return '<p>That experiment is gone.</p>' + actions(null, 'j-exp'); }
    var T = tpl(e.template), b = 'experiments.' + i + '.';
    var fields = T.fields.map(function (f) {
      var path = b + 'fields.' + f.k;
      if (f.type === 'person') {
        var v = getPath(state, path) || '';
        return '<label class="field"><span>' + esc(f.label) + '</span><select data-bind="' + path + '"><option value="">Choose</option>' +
          ['a', 'b'].map(function (p) { return '<option value="' + p + '"' + (v === p ? ' selected' : '') + '>' + esc(nm(p)) + '</option>'; }).join('') + '</select></label>';
      }
      return field(esc(f.label), path, { type: f.type === 'date' ? 'date' : null, ph: f.ph, max: f.long ? 400 : 120, rows: f.long ? 3 : 0, check: true });
    }).join('');
    return '<p class="counter">Experiment ' + (i + 1) + ' · ' + esc(T.name) + '</p><h1>Fill it in together</h1>' +
      field('A short name', b + 'title', { max: 60, ph: 'e.g. ' + T.name }) + fields +
      '<h2>What each of you gives and gets</h2>' +
      ['a', 'b'].map(function (p) { return field(esc(nm(p)) + ' gives', b + 'gives.' + p, { max: 200, check: true }) + field(esc(nm(p)) + ' gets', b + 'gets.' + p, { max: 200 }); }).join('') +
      '<h2>Dates</h2>' + field('Start', b + 'start', { type: 'date' }) + field('Review on', b + 'review', { type: 'date', hint: '(default ' + state.opts.reviewDays + ' days after the start)' }) +
      field('We’ll know it’s working if…', b + 'signals', { max: 200, ph: 'e.g. Friday nights feel easy, and neither of us is chasing plans' }) +
      '<h2>Read it back</h2><div class="panel exp" id="expPreview">' + expPreview(e) + '</div>' +
      actions(null, 'j-exp', 'Done');
  };

  SCREENS['j-close'] = function () {
    return '<p class="counter">Sitting two · 5 to 10 minutes</p><h1>Close</h1>' +
      '<p>Say one thing you appreciate about how the other person handled this. Write it down if you’d like to keep it.</p>' +
      ['a', 'b'].map(function (p) { return field(esc(nm(p)) + ' appreciated', 'close.appr.' + p, { rows: 2, max: 280 }); }).join('') +
      '<p>Next, each of you answers one private question: how understood did you feel? Then you’ll see your plan and report.</p>' +
      actions('j-exp', 'closeNext:1');
  };
  SCREENS['u-rate'] = function () {
    var t = state.turn, u = state.close.understood[t];
    return '<h1>How understood did you feel today?</h1><p class="small">Only you see this, unless you choose to share it.</p>' +
      '<div class="seg">' + EB.UNDERSTOOD.map(function (l, n) { return '<button class="btn sm' + (u.value === n ? ' on' : '') + '" data-act="setv" data-arg="close.understood.' + t + '.value|' + n + '">' + n + '<small>' + l + '</small></button>'; }).join('') + '</div>' +
      checkbox('Share my answer with ' + esc(nm(other(t))) + ' in the report', 'close.understood.' + t + '.shared') +
      '<p class="small muted">If you felt less understood than you’d like, that is worth knowing, not a failure. You can raise it at the review.</p>' +
      actions(null, 'rateDone:1', 'Done');
  };

  // ---------- summary and report ----------
  function reviewDate() {
    var ds = state.experiments.filter(function (e) { return e.review && e.status !== 'dropped'; }).map(function (e) { return e.review; }).sort();
    return ds[0] || null;
  }
  SCREENS.summary = function () {
    var inc = 'close.include.', rd = reviewDate();
    return '<h1>Your plan and report</h1>' +
      (rd ? '<div class="panel"><p class="small muted">Next review</p><p class="big">' + esc(fmtDate(rd)) + '</p>' +
        '<p class="small"><a href="' + esc(gcal('Enough of Both: review our experiments', rd)) + '" target="_blank" rel="noopener">Add to Google Calendar</a> <span class="muted">or put it in any calendar.</span></p></div>' : '') +
      '<h2>What goes in the report</h2><p class="small">Tick only what you both agree to include. If you want to take it to a psychologist, the PDF report is the version to take. Sharing it is the owner’s call.</p>' +
      checkbox('Our experiments and review date', inc + 'exp') + checkbox('Our map of core and flexible', inc + 'map') +
      checkbox('The loop we named, and what else is going on', inc + 'pattern') + checkbox('Offers, asks and support', inc + 'offers') +
      checkbox('How we each rated the cards', inc + 'cards') + checkbox('Card notes we chose to share', inc + 'notes') +
      checkbox('Our written notes and replies', inc + 'exchange') + checkbox('What we appreciated', inc + 'appr') +
      checkbox('How understood we felt <small>(only answers each person chose to share)</small>', inc + 'understood') + checkbox('Reviews so far', inc + 'reviews') +
      (state.context ? checkbox('Values Deck context', inc + 'context') : '') +
      '<h2>PDF report</h2><p class="small">Laid out on A4 pages for reading, printing or sharing.</p>' +
      '<div class="actions wrap"><button class="btn primary" data-act="savePdf"' + (ui.pdfBusy ? ' disabled' : '') + '>' + (ui.pdfBusy ? 'Making the PDF…' : 'Save the PDF report') + '</button></div>' +
      (ui.pdfMsg ? '<p class="small error">' + esc(ui.pdfMsg) + '</p>' : '') +
      '<h2>Text summary</h2><pre class="md" id="summaryText">' + esc(summaryMd()) + '</pre>' +
      '<div class="actions wrap"><button class="btn" data-act="copySummary">Copy the summary</button></div>' +
      '<h2>Keep the whole conversation</h2><p class="small">Save it as a .json file. On the review date, open the file and choose Start a review.</p>' +
      '<div class="actions wrap"><button class="btn" data-act="util" data-arg="save">Save to a file</button>' +
      (state.experiments.length ? '<button class="btn" data-act="startReview">Start a review</button>' : '') + '</div>' +
      '<div class="notice">When you are done, erase everything from this browser. Files you saved are yours to keep or delete.</div>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="j-exp">Back to experiments</button><button class="btn danger" data-act="' + (ui.eraseArm ? 'erase' : 'armErase') + '">' + (ui.eraseArm ? 'Tap again to erase' : 'Erase everything') + '</button></div>';
  };

  function summaryMd() {
    var L = [], inc = state.close.include, date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    L.push('# Enough of both: ' + nm('a') + ' and ' + nm('b'), '', date, '', '_A conversation guide, not therapy or an assessment. No scores._', '');
    var rd = reviewDate(); if (rd) L.push('**Next review: ' + fmtDate(rd) + '**', '');
    if (inc.exp && state.experiments.length) {
      L.push('## Our experiments', '');
      state.experiments.forEach(function (e) {
        var T = tpl(e.template);
        L.push('### ' + (e.title || T.name) + (e.status && e.status !== 'active' ? ' (' + e.status + ')' : ''), '', fill(T.text, e, false) + ' ' + fill(T.ifThen, e, false), '');
        ['a', 'b'].forEach(function (p) { L.push('- ' + nm(p) + ' gives: ' + (e.gives[p] || '-') + '; gets: ' + (e.gets[p] || '-')); });
        L.push('- From ' + (fmtDate(e.start) || '-') + ', review on ' + (fmtDate(e.review) || '-'));
        if (e.signals) L.push('- We’ll know it’s working if ' + e.signals);
        L.push('');
      });
    }
    if (inc.map) {
      var Z = mapModel(), lst = function (zn, kind) { return Z[zn].filter(function (i) { return !kind || i.kind === kind; }).map(function (i) { return card(i.id).short; }).join(', ') || 'none'; };
      L.push('## Our map', '', '- Both: ' + lst('both'));
      ['a', 'b'].forEach(function (p) { L.push('- ' + nm(p) + ', core: ' + lst(p, 'core') + '; flexible: ' + lst(p, 'flex')); });
      L.push('');
    }
    if (inc.pattern) {
      var pt = state.conv.pattern;
      if (pt.trigger || pt.x || pt.y) L.push('## The loop we named', '', patternText().replace(/<[^>]+>/g, ''), '');
      var st = EB.STRESSORS.filter(function (s, i) { return state.conv.stressors['s' + i]; }).concat(state.conv.stressOther ? [state.conv.stressOther] : []);
      if (st.length) L.push('Also going on: ' + st.join('; ') + '.', '');
    }
    if (inc.offers) {
      L.push('## Offers and asks', '');
      ['a', 'b'].forEach(function (p) {
        var O = state.offers[p], f = realText;
        L.push('- ' + nm(p) + ' offers: ' + (f(O.offers).join('; ') || '-'));
        L.push('- ' + nm(p) + ' asks: ' + (asksOf(O).join('; ') || '-'));
        EB.SUPPORT.forEach(function (s) { if (O.support[s.id]) L.push('- ' + nm(p) + ': ' + s.q.replace('…', ' ') + O.support[s.id]); });
      });
      L.push('');
    }
    if (inc.appr && (state.close.appr.a || state.close.appr.b)) {
      L.push('## What we appreciated', '');
      ['a', 'b'].forEach(function (p) { if (state.close.appr[p]) L.push('- ' + nm(p) + ': ' + state.close.appr[p]); });
      L.push('');
    }
    if (inc.reviews && state.reviews.length) {
      L.push('## Reviews', '');
      state.reviews.forEach(function (r) {
        L.push('### Review, ' + fmtDate(r.date), '');
        EB.REVIEW_Q.forEach(function (q) { if (r.answers[q.k]) L.push('- ' + q.q + ' ' + r.answers[q.k]); });
        state.experiments.forEach(function (e, i) { var d = r.decisions[e.id]; if (d) L.push('- ' + (e.title || tpl(e.template).name) + ': ' + d + (r.tweaks[e.id] ? ' (' + r.tweaks[e.id] + ')' : '')); });
        L.push('');
      });
    }
    return L.join('\n');
  }

  function realText(xs) { return xs.filter(function (x) { return x && x.trim(); }); }
  function reportModel() {
    var inc = state.close.include, m = { names: { a: nm('a'), b: nm('b') }, include: inc, date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) };
    m.reviewDate = reviewDate() ? fmtDate(reviewDate()) : null;
    m.experiments = state.experiments.map(function (e) {
      var T = tpl(e.template);
      return { title: e.title || T.name, kind: T.name, text: fill(T.text, e, false), ifThen: fill(T.ifThen, e, false), gives: e.gives, gets: e.gets,
        start: fmtDate(e.start), review: fmtDate(e.review), signals: e.signals || '', status: e.status || 'active' };
    });
    var Z = mapModel(), lab = function (it) { return { text: card(it.id).short, kind: it.kind }; };
    m.map = { a: Z.a.map(lab), both: Z.both.map(lab), b: Z.b.map(lab), caption: MAP_CAPTION };
    m.pattern = patternText().replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    m.patternFilled = !!(state.conv.pattern.trigger || state.conv.pattern.x || state.conv.pattern.y);
    m.stressors = EB.STRESSORS.filter(function (s, i) { return state.conv.stressors['s' + i]; }).concat(state.conv.stressOther ? [state.conv.stressOther] : []);
    m.offers = {};
    ['a', 'b'].forEach(function (p) {
      var O = state.offers[p], f = realText;
      m.offers[p] = { offers: f(O.offers), asks: asksOf(O), support: EB.SUPPORT.filter(function (s) { return O.support[s.id]; }).map(function (s) { return { q: s.q, a: O.support[s.id] }; }) };
    });
    m.domains = EB.DOMAINS.map(function (d) {
      return { name: d.name, cards: cards().filter(function (c) { return c.domain === d.id; }).map(function (c) {
        var side = function (p) { var r = rating(p, c.id); return { need: r.pass || r.need == null ? null : r.need, flex: r.pass ? 'Passed' : r.flex ? EB.FLEX_SHORT[r.flex] : '', note: state.prep[p].share.notes ? (r.note || '') : '' }; };
        return { text: c.text, pole: c.pole ? EB.POLE[c.pole] : '', a: side('a'), b: side('b') };
      }) };
    }).filter(function (d) { return d.cards.length; });
    m.exchange = { notes: state.exchange.notes, replies: state.exchange.replies, used: state.opts.exchange };
    m.appr = state.close.appr;
    m.understood = {};
    ['a', 'b'].forEach(function (p) { var u = state.close.understood[p]; m.understood[p] = u.shared && u.value != null ? EB.UNDERSTOOD[u.value] : null; });
    m.reviews = state.reviews.map(function (r) {
      return { date: fmtDate(r.date), answers: EB.REVIEW_Q.filter(function (q) { return r.answers[q.k]; }).map(function (q) { return { q: q.q, a: r.answers[q.k] }; }),
        decisions: state.experiments.filter(function (e) { return r.decisions[e.id]; }).map(function (e) { return { title: e.title || tpl(e.template).name, d: r.decisions[e.id], note: r.tweaks[e.id] || '' }; }),
        help: r.help || '' };
    });
    if (state.context) {
      var c = state.context, qa = ctxFor('a'), qb = ctxFor('b'), pos = c.pos || {};
      m.context = { source: c.source || '', core: c.core || [], lean: { a: leanText(c.lean[qa]), b: leanText(c.lean[qb]) },
        top: { a: (c.top || {})[qa] || [], b: (c.top || {})[qb] || [] },
        areas: EB.VD_AREAS.map(function (d) { return { name: d[1], a: c.areas[qa][d[0]], b: c.areas[qb][d[0]], pa: (pos[qa] || {})[d[0]] || '', pb: (pos[qb] || {})[d[0]] || '' }; }) };
    }
    m.help = EB.HELP; m.methods = EB.METHODS; m.sources = EB.SOURCES;
    return m;
  }
  function whenJsPDF() {
    return new Promise(function (res, rej) {
      var n = 0;
      (function check() {
        if (window.jspdf && window.jspdf.jsPDF) return res(window.jspdf.jsPDF);
        if (++n > 100) return rej(new Error('NO_PDF'));
        setTimeout(check, 100);
      })();
    });
  }

  // ---------- review ----------
  SCREENS.review = function () {
    var i = state.reviews.length - 1, r = state.reviews[i], b = 'reviews.' + i + '.';
    if (!r) return '<p>No review started.</p>' + actions(null, 'summary');
    return '<p class="counter">Review · 20 to 30 minutes</p><h1>How did it go?</h1><p>Take the questions in turn. No blame: you are looking at the experiment, not at each other.</p>' +
      EB.REVIEW_Q.map(function (q) { return field(esc(q.q), b + 'answers.' + q.k, { rows: 2, max: 600, hint: q.hint ? '(' + esc(q.hint) + ')' : '' }); }).join('') +
      '<h2>Keep, tweak or drop?</h2>' + state.experiments.map(function (e) {
        var d = r.decisions[e.id];
        return '<div class="panel exp">' + expPreview(e) + '<div class="seg three">' + ['keep', 'tweak', 'drop'].map(function (k) {
          return '<button class="btn sm' + (d === k ? ' on' : '') + '" data-act="setv" data-arg="' + b + 'decisions.' + e.id + '|' + k + '">' + k.charAt(0).toUpperCase() + k.slice(1) + '</button>';
        }).join('') + '</div>' + (d === 'tweak' ? field('What changes?', b + 'tweaks.' + e.id, { max: 200 }) : '') + '</div>';
      }).join('') +
      '<h2>Does anything here need outside help?</h2><div class="seg three">' + [['no', 'No'], ['unsure', 'Not sure'], ['yes', 'Yes']].map(function (o) {
        return '<button class="btn sm' + (r.help === o[0] ? ' on' : '') + '" data-act="setv" data-arg="' + b + 'help|' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>' + (r.help === 'yes' || r.help === 'unsure' ? '<p class="small"><button class="link" data-act="util" data-arg="help">Who to talk to</button></p>' : '') +
      actions(null, 'finishReview:1', 'Finish the review');
  };

  // ---------- utilities: time-out, repair, save, about, help ----------
  SCREENS.timeout = function () {
    var to = state.timeout;
    if (!to) return actions(null, 'welcome');
    if (to.phase === 'choose') {
      return '<h1>Time-out</h1><p>Who is calling it? <small class="muted">(optional)</small></p><div class="seg three">' +
        ['a', 'b'].map(function (p) { return '<button class="btn sm' + (to.by === p ? ' on' : '') + '" data-act="toBy" data-arg="' + p + '">' + esc(nm(p)) + '</button>'; }).join('') + '</div>' +
        '<p>How long? <small class="muted">At least 20 minutes helps your body settle.</small></p><div class="seg three">' +
        [20, 30, 45, 60].map(function (n) { return '<button class="btn sm' + (to.minutes === n ? ' on' : '') + '" data-act="toMin" data-arg="' + n + '">' + n + ' min</button>'; }).join('') + '</div>' +
        '<div class="actions"><button class="btn" data-act="toCancel">Cancel</button><button class="btn primary" data-act="toStart">Start the break</button></div>';
    }
    if (to.phase === 'break') {
      return '<div class="handover"><p class="q big">“I need a break. I’m not leaving the conversation. Back at ' + esc(fmtTime(to.returnAt)) + '.”</p>' +
        '<p class="clock big" id="toClock"></p><p>Do something calming that isn’t rehearsing your argument. 20 minutes minimum.</p>' +
        '<button class="btn primary big" data-act="toBack">We’re back</button></div>';
    }
    return '<h1>Before carrying on</h1><p>Each of you: one thing I appreciate about you right now is…</p><p class="small muted">Say it out loud. Writing it is optional.</p>' +
      ['a', 'b'].map(function (p) { return field(esc(nm(p)), 'timeout.appr.' + p, { max: 200 }); }).join('') +
      '<div class="actions"><button class="btn primary" data-act="toDone">Carry on</button></div>';
  };
  SCREENS.repair = function () {
    return '<h1>Repair</h1><p>Tap a phrase to show it large, then say it, or turn the screen round.</p>' +
      (ui.repairShow != null ? '<div class="prompt"><p class="q big">' + esc(EB.REPAIR[ui.repairShow]) + '</p></div>' : '') +
      '<div class="choice">' + EB.REPAIR.map(function (r, i) { return '<button class="btn' + (ui.repairShow === i ? ' on' : '') + '" data-act="repairShow" data-arg="' + i + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
      '<div class="actions"><button class="btn primary" data-act="utilBack">Back to the conversation</button></div>';
  };
  SCREENS.save = function () {
    var fb = ui.saveFallback ? '<p class="small">Saving files is not available here. Copy this text into a private note instead; you can paste it back in on the first screen.</p>' +
      '<label class="field"><span>Saved text</span><textarea id="saveText" rows="6" readonly spellcheck="false">' + esc(sessionJson()) + '</textarea></label>' +
      '<div class="actions wrap"><button class="btn" data-act="copySave">Copy the text</button></div>' : '';
    return '<h1>Save to a file</h1><p>This saves everything so far, for both of you, as a .json file. To carry on, open this page and choose <b>Open a saved file</b>.</p>' +
      '<div class="notice">The file holds both people’s answers, including private writing and notes. Keep it where only the two of you can open it.</div>' +
      '<div class="actions wrap"><button class="btn primary" data-act="saveJson">Save the .json file</button></div>' + fb +
      '<div class="actions"><button class="btn" data-act="utilBack">Back</button></div>';
  };
  SCREENS.help = function () {
    return '<h1>Getting help</h1><p>This app is a structured conversation aid. It is not therapy and not an assessment. Stop, and talk to a qualified couples counsellor, if:</p>' +
      '<ul class="plain">' + EB.HELP.when.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
      '<h2>In Australia</h2><div class="services">' + EB.HELP.services.map(function (s) {
        return '<div class="svc"><b>' + esc(s.name) + '</b><span class="small muted">' + esc(s.what) + '</span><span class="contact">' + esc(s.contact) + '</span></div>';
      }).join('') + '</div>' +
      '<p class="small muted">If one of you sees a psychologist, you may want to bring the PDF report. Whether to share it is that person’s call.</p>' +
      '<div class="actions"><button class="btn primary" data-act="utilBack">Back</button></div>';
  };
  SCREENS.about = function () {
    return '<h1>About and evidence</h1>' +
      '<h2>What this is</h2><p>A structured conversation about one difference: how much each of you leans towards security (plans, savings, safety, routine) and towards novelty (open time, experiences, adventure, change). ' +
      'It treats the difference as something to manage with dialogue and small experiments, not a problem to solve once.</p>' +
      '<h2>Why no score</h2><p>Value differences predict relationship quality only weakly (Leikas et al. 2018). Conflict predicted lower satisfaction only for people who did not feel understood by their partner (Gordon and Chen 2016). ' +
      'So the app puts the listener’s job at the centre, and never scores, ranks, or says who is right.</p>' +
      '<h2>What it does not do</h2><ul class="plain"><li>No compatibility number, no “who is more flexible” score, no ranking of needs between you.</li>' +
      '<li>No AI and no network calls with your answers. It does not suggest who should concede.</li><li>It does not show private notes unless you choose to share them.</li>' +
      '<li>No reminders or nagging. It does not diagnose patterns or predict the relationship’s future.</li></ul>' +
      '<h2>What each part draws on</h2><div class="tablewrap"><table class="mini methods"><thead><tr><th>Part</th><th>Evidence</th><th>Strength</th></tr></thead><tbody>' +
      EB.METHODS.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h2>Limits</h2><p>Most of this evidence comes from married, distressed, or US and European couples. The combined protocol in this app has not been tested. Effects for a happy couple early on are likely to be smaller, ' +
      'and too much structure can make a normal difference feel bigger than it is, so skip whatever does not help.</p>' +
      '<h2>Sources</h2><ol class="sources">' + EB.SOURCES.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<div class="actions"><button class="btn primary" data-act="utilBack">Back</button></div>';
  };

  // ---------- flow helpers ----------
  function handover(to, purpose) { state.handover = { to: to, purpose: purpose }; state.turn = null; go('handover'); }
  function doneFor(purpose, p) {
    if (purpose === 'prep') return state.prep[p].locked;
    if (purpose === 'note') return state.exchange.note[p];
    if (purpose === 'reply') return state.exchange.reply[p];
    if (purpose === 'rate') return state.close.understood[p].done;
    return true;
  }
  function afterPrivate(purpose) {
    var t = state.turn, o = other(t);
    if (!doneFor(purpose, o)) return handover(o, purpose);
    state.turn = null; state.handover = null;
    if (purpose === 'prep') return state.opts.exchange ? handover('a', 'note') : go('j-agree');
    if (purpose === 'note') return go('x-wait');
    if (purpose === 'reply') return go('x-read');
    if (purpose === 'rate') return go('summary');
  }
  function openUtil(name) {
    if (state.screen === name) return;
    if (['save', 'about', 'help', 'repair'].indexOf(state.screen) < 0) ui.prev = state.screen;
    ui.saveFallback = false; ui.repairShow = null;
    state.screen = name; render(); window.scrollTo(0, 0);
  }

  // ---------- actions ----------
  var ACT = {
    go: function (s) { go(s); },
    util: function (name) { openUtil(name); },
    about: function () { openUtil('about'); },
    utilBack: function () { state.screen = ui.prev && SCREENS[ui.prev] ? ui.prev : 'welcome'; render(); window.scrollTo(0, 0); },
    armErase: function () { ui.eraseArm = true; render(); setTimeout(function () { ui.eraseArm = false; render(); }, 5000); },
    erase: function () { eraseAll(); },
    start: function () {
      state = fresh(); ui = { keep: {} }; state.mode = 'shared'; state.id = uid();
      if (EB.PRELOAD) importValuesDeck(EB.PRELOAD, true);
      go('setup');
    },
    resume: function () {
      var s = ui.resumeTo || 'welcome';
      if (PRIVATE.indexOf(s) >= 0 || s === 'pair') s = state.handover ? 'handover' : 'welcome';
      if (s === 'timeout' && !state.timeout) s = 'welcome';
      if (!SCREENS[s] || s === 'resume') s = 'welcome';
      go(s);
    },
    setupNext: function () {
      if (!state.names.a.trim() || !state.names.b.trim()) return toast('Add both first names.');
      if (state.names.a.trim().toLowerCase() === state.names.b.trim().toLowerCase()) return toast('Use two different names or initials.');
      go('custom');
    },
    ctxSwap: function () { state.context.swapped = !state.context.swapped; state.context.manualSwap = true; save(); render(); },
    ctxBuiltIn: function () { importValuesDeck(EB.PRELOAD); },
    ctxRemove: function () { state.context = null; save(); render(); },
    vdPaste: function () {
      var t = (document.getElementById('vdText') || {}).value || '';
      if (!t.trim()) return toast('Paste the text first.');
      var obj; try { obj = parseText(t); } catch (e) { return toast('That text is not a Values Deck file. Paste all of it.'); }
      importValuesDeck(obj);
    },
    addCustom: function () {
      var f = ui.cf;
      if (!f.text.trim()) return toast('Write the situation first.');
      if (state.custom.length >= EB.CUSTOM_MAX) return toast('That is the most cards you can add.');
      state.custom.push({ id: 'C' + uid().slice(0, 5), owner: f.owner, text: f.text.trim(), pole: f.pole || null });
      ui.cf = { owner: f.owner, text: '', pole: '' }; save(); render();
    },
    delCustom: function (id) { state.custom = state.custom.filter(function (c) { return c.id !== id; }); save(); render(); },
    customNext: function () { handover('a', 'prep'); },
    beginPrivate: function () {
      var h = state.handover || { to: 'a', purpose: 'prep' };
      state.turn = h.to;
      if (h.purpose === 'prep') { var r = state.prep[h.to]; if (r.locked) return afterPrivate('prep'); return go(r.stage || 'p-intro'); }
      go({ note: 'x-note', reply: 'x-reply', rate: 'u-rate' }[h.purpose]);
    },
    rate: function (arg) {
      var r = P(), c = cards()[Math.min(r.idx, cards().length - 1)], kv = arg.split(':'), a = r.ratings[c.id] || (r.ratings[c.id] = {});
      if (kv[0] === 'need') { a.need = +kv[1]; a.pass = false; }
      else if (kv[0] === 'flex') { a.flex = kv[1]; a.pass = false; }
      else if (kv[0] === 'pass') { a.pass = !a.pass; if (a.pass) return ACT.cardNav('1'); }
      save(); render();
    },
    cardNav: function (dir) {
      var r = P(), cs = cards(), i = Math.min(r.idx, cs.length - 1), a = r.ratings[cs[i].id] || {};
      dir = +dir;
      if (dir > 0 && !a.pass && (a.need == null || !a.flex)) return toast('Choose how much you need it and how flexible you feel, or pass.');
      var j = i + dir;
      if (j < 0) return go('p-intro');
      if (j >= cs.length) { r.idx = cs.length - 1; return go('p-reflect'); }
      r.idx = j; save(); render(); window.scrollTo(0, 0);
    },
    refNav: function (dir) {
      var r = P(), i = Math.min(r.rIdx, EB.REFLECT.length - 1), j = i + (+dir);
      if (j < 0) return go('p-cards');
      if (j >= EB.REFLECT.length) { r.rIdx = EB.REFLECT.length - 1; return go('p-pick'); }
      r.rIdx = j; save(); render(); window.scrollTo(0, 0);
    },
    refMark: function (kind) {
      var r = P(), q = EB.REFLECT[Math.min(r.rIdx, EB.REFLECT.length - 1)], a = r.reflect[q.id] || (r.reflect[q.id] = {});
      a.pass = kind === 'pass'; a.notYet = kind === 'notYet';
      ACT.refNav('1');
    },
    refJump: function (id) { var r = P(); r.rIdx = EB.REFLECT.map(function (q) { return q.id; }).indexOf(id); go('p-reflect'); },
    pick: function (arg) {
      var kv = arg.split(':'), r = P(), list = kv[0] === 'core' ? r.core : r.flexible, i = list.indexOf(kv[1]);
      if (i >= 0) list.splice(i, 1);
      else if (list.length >= 3) return toast('Up to three. Tap one to remove it first.');
      else list.push(kv[1]);
      save(); render();
    },
    toggleAll: function (kind) { ui['all_' + kind] = !ui['all_' + kind]; render(); },
    setv: function (arg) {
      var k = arg.split('|'), v = k[1];
      if (/^\d+$/.test(v) && /\.value$/.test(k[0])) v = +v;
      setPath(state, k[0], v); save(); render();
    },
    lock: function () {
      var r = P(); r.locked = true; r.lockedAt = new Date().toISOString(); r.stage = null;
      cards().forEach(function (c) { if (!r.ratings[c.id] || (r.ratings[c.id].need == null && !r.ratings[c.id].pass)) r.ratings[c.id] = Object.assign(r.ratings[c.id] || {}, { pass: true }); });
      afterPrivate('prep');
    },
    noteDone: function () { state.exchange.note[state.turn] = true; afterPrivate('note'); },
    startReplies: function () { handover('a', 'reply'); },
    stem: function (i) {
      var t = state.turn, path = 'exchange.replies.' + t, cur = state.exchange.replies[t] || '';
      state.exchange.replies[t] = (cur ? cur.replace(/\s*$/, '') + '\n' : '') + REPLY_STEMS[+i].replace('…', ' ');
      save(); render();
      var el = document.querySelector('[data-bind="' + path + '"]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    },
    replyDone: function () { state.exchange.reply[state.turn] = true; afterPrivate('reply'); },
    agreeNext: function () { if (!state.conv.agree.a || !state.conv.agree.b) return toast('Both of you need to agree first.'); go('j-reveal'); },
    startRounds: function (f) {
      state.conv.first = f;
      if (!state.conv.rounds.length) state.conv.rounds = [{ speaker: f, chunks: [{ summary: '', confirmed: false, retries: 0 }] }, { speaker: other(f), chunks: [] }];
      if (!state.conv.cur) state.conv.cur = { round: 0, phase: 'speak' };
      ui.chunkStart = Date.now(); go('j-round');
    },
    chunkDone: function () { state.conv.cur.phase = 'reflect'; save(); render(); },
    notQuite: function () {
      var c = state.conv.cur, ch = state.conv.rounds[c.round].chunks.slice(-1)[0]; ch.retries = (ch.retries || 0) + 1;
      save(); render(); toast('Speaker: say what was missed. Listener: try again.');
    },
    gotIt: function () { var c = state.conv.cur, ch = state.conv.rounds[c.round].chunks.slice(-1)[0]; ch.confirmed = true; c.phase = 'confirmed'; save(); render(); },
    anotherChunk: function () { var c = state.conv.cur; state.conv.rounds[c.round].chunks.push({ summary: '', confirmed: false, retries: 0 }); c.phase = 'speak'; ui.chunkStart = Date.now(); save(); render(); },
    passFloor: function () {
      var c = state.conv.cur;
      if (c.round === 0) {
        c.round = 1; c.phase = 'speak';
        if (!state.conv.rounds[1].chunks.length) state.conv.rounds[1].chunks.push({ summary: '', confirmed: false, retries: 0 });
        ui.chunkStart = Date.now(); save(); render(); window.scrollTo(0, 0); toast('Floor: ' + nm(state.conv.rounds[1].speaker));
      } else go('j-pattern');
    },
    toggleTimer: function () { ui.showTimer = !ui.showTimer; if (!ui.chunkStart) ui.chunkStart = Date.now(); render(); },
    timerReset: function () { ui.chunkStart = Date.now(); tick(); },
    mapSel: function (key) { ui.mapSel = key || null; render(); },
    mapMove: function (zn) { if (ui.mapSel) { state.map.moves[ui.mapSel] = zn; ui.mapSel = null; save(); render(); } },
    mapAdd: function () {
      var id = (document.getElementById('mapAdd') || {}).value; if (!id) return;
      if (state.map.added.indexOf(id) < 0) state.map.added.push(id);
      delete state.map.moves['add:' + id];
      ui.mapSel = 'add:' + id; save(); render();
    },
    offTab: function (p) { ui.offTab = p; render(); window.scrollTo(0, 0); },
    chooseExp: function (on) { ui.choosing = on === '1'; render(); },
    newExp: function (tid) {
      if (state.experiments.length >= EB.EXP_MAX) return toast('Three at most. Small and few works best.');
      var T = tpl(tid), f = {};
      T.fields.forEach(function (x) { f[x.k] = x.def || ''; });
      var st = today();
      state.experiments.push({ id: 'E' + uid().slice(0, 5), template: tid, title: T.name, fields: f, gives: { a: '', b: '' }, gets: { a: '', b: '' },
        start: st, review: addDays(st, +state.opts.reviewDays || 21), reviewSet: false, signals: '', status: 'active' });
      ui.choosing = false; ui.expIdx = state.experiments.length - 1; go('j-exp-edit');
    },
    editExp: function (i) { ui.expIdx = +i; go('j-exp-edit'); },
    delExp: function (i) {
      i = +i;
      if (ui.delArm !== i) { ui.delArm = i; render(); return; }
      state.experiments.splice(i, 1); ui.delArm = null; save(); render();
    },
    closeNext: function () { handover('a', 'rate'); },
    rateDone: function () { state.close.understood[state.turn].done = true; afterPrivate('rate'); },
    startReview: function () { state.reviews.push({ date: today(), answers: {}, decisions: {}, tweaks: {}, help: '' }); go('review'); },
    finishReview: function () {
      var r = state.reviews[state.reviews.length - 1];
      state.experiments.forEach(function (e) { var d = r.decisions[e.id]; if (d) e.status = { keep: 'kept', tweak: 'tweaked', drop: 'dropped' }[d]; });
      go('summary'); toast('Review saved. Save to a file to keep it.');
    },
    timeoutOpen: function () {
      if (state.screen === 'timeout') return;
      state.timeout = { prev: state.screen, phase: 'choose', by: null, minutes: 20, appr: { a: '', b: '' } };
      go('timeout');
    },
    toBy: function (p) { state.timeout.by = state.timeout.by === p ? null : p; render(); },
    toMin: function (n) { state.timeout.minutes = +n; render(); },
    toCancel: function () { var p = state.timeout.prev; state.timeout = null; go(p); },
    toStart: function () { var t = state.timeout; t.at = Date.now(); t.returnAt = t.at + t.minutes * 60000; t.phase = 'break'; save(); render(); },
    toBack: function () {
      var t = state.timeout, mins = Math.round((Date.now() - t.at) / 60000);
      if (mins < 20 && !ui.toWarned) { ui.toWarned = true; return toast('It has been ' + mins + ' minutes. The guide suggests at least 20. Tap again to come back anyway.'); }
      ui.toWarned = false; t.phase = 'return'; save(); render();
    },
    toDone: function () {
      var t = state.timeout;
      state.conv.timeouts.push({ by: t.by, at: new Date(t.at).toISOString(), returnAt: new Date(t.returnAt).toISOString(), back: new Date().toISOString() });
      var p = t.prev; state.timeout = null; go(p);
    },
    repairOpen: function () { openUtil('repair'); },
    repairShow: function (i) { ui.repairShow = +i; render(); },
    reword: function (path) {
      var el = document.querySelector('[data-bind="' + path + '"]'); if (!el) return;
      var m = RULE_RE.exec(el.value); el.focus();
      if (m) el.setSelectionRange(m.index, m.index + m[0].length);
    },
    keepWording: function (path) { ui.keep[path] = true; var w = document.querySelector('[data-chk="' + path + '"]'); if (w) w.hidden = true; },
    saveJson: function () {
      saveFile('enough-of-both-' + slug(nm('a')) + '-' + slug(nm('b')) + '-' + stamp() + '.json', sessionJson(), function () { ui.saveFallback = true; render(); });
    },
    copySave: function () { copy(sessionJson(), 'saveText'); },
    copySummary: function () { copy(summaryMd(), 'summaryText'); },
    loadPaste: function () {
      var t = (document.getElementById('loadText') || {}).value || '';
      if (!t.trim()) return toast('Paste the saved text first.');
      var obj; try { obj = parseText(t); } catch (e) { return toast('That text is not a save. Paste all of it.'); }
      loadSession(obj);
    },
    pairOpen: function () { ui.eraseArm = false; state.screen = 'pair'; render(); window.scrollTo(0, 0); },
    pairBack: function () { go(state.handover ? 'handover' : 'welcome'); },
    pairWho: function (p) { if (!state.prep[p].locked) { state.handover = { to: p, purpose: 'prep' }; save(); render(); } },
    pairCopy: function () {
      var d = document.querySelector('details.paste'); if (d) d.open = true;
      copy(seal(halfJson(lockedOne())), 'pairText');
    },
    pairSave: function () {
      var p = lockedOne();
      saveFile('enough-of-both-preparation-' + slug(nm(p)) + '-' + today() + '.txt', seal(halfJson(p)), function () { toast('Saving files is not available here. Use Copy as text.'); });
    },
    pairPaste: function () {
      var t = (document.getElementById('pairIn') || {}).value || '';
      if (!t.trim()) return toast('Paste the text first.');
      var obj; try { obj = parseText(t); } catch (e) { return toast('That text could not be read. Copy all of it and paste again.'); }
      if (!obj || obj.app !== 'enough-of-both' || obj.kind !== 'half') return toast('That is not an Enough of Both preparation.');
      importHalf(obj);
    },
    savePdf: function () {
      if (ui.pdfBusy) return;
      ui.pdfBusy = true; ui.pdfMsg = ''; render();
      whenJsPDF().then(function (J) {
        var blob = EB.buildReport(J, reportModel());
        ui.pdfBusy = false; render();
        return saveFile('enough-of-both-' + slug(nm('a')) + '-' + slug(nm('b')) + '-' + today() + '.pdf', blob, function () {
          ui.pdfMsg = 'Saving files is not available in this view. Open this page in a web browser on a computer or phone to save the PDF.'; render();
        });
      }).catch(function (e) {
        ui.pdfBusy = false;
        ui.pdfMsg = e && e.message === 'NO_PDF' ? 'The PDF tool did not load. Check your internet connection, then reload the page.' : 'The PDF could not be made (' + (e && e.message || e) + ').';
        render();
      });
    }
  };

  // ---------- clocks ----------
  function mmss(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + z(s % 60); }
  function tick() {
    var c = document.getElementById('chunkClock'); if (c && ui.chunkStart) c.textContent = mmss(Date.now() - ui.chunkStart);
    var b = document.getElementById('breakClock'); if (b && ui.breakStart) b.textContent = mmss(5 * 60000 - (Date.now() - ui.breakStart));
    var t = document.getElementById('toClock');
    if (t && state.timeout && state.timeout.returnAt) {
      var left = state.timeout.returnAt - Date.now();
      t.textContent = left > 0 ? mmss(left) + ' to go' : 'Time to come back';
    }
  }
  setInterval(tick, 1000);

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') return;
    e.preventDefault();
    var fn = ACT[el.dataset.act];
    if (fn) fn(el.dataset.arg, el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.file) {
      var kind = el.dataset.file;
      readFile(el, kind === 'vd' ? importValuesDeck : loadSession);
      el.value = ''; return;
    }
    bind(el);
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') afterBind(el);
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.type === 'checkbox' || el.tagName === 'SELECT') return;
    bind(el); afterBind(el);
  });
  function bind(el) {
    var path = el.dataset.bind;
    if (!path) return;
    var val = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.num) val = +val;
    if (path.indexOf('_cf.') === 0) { ui.cf[path.slice(4)] = val; return; }
    setPath(state, path, val);
    if ((path === 'names.a' || path === 'names.b') && state.context) {
      matchContext(state.context);
      var cm = document.getElementById('ctxMap'); if (cm) cm.innerHTML = ctxMapHtml();
    }
    // An experiment's review date follows its start date until someone sets it.
    var m = /^experiments\.(\d+)\.(start|review)$/.exec(path);
    if (m) {
      var ex = state.experiments[+m[1]];
      if (m[2] === 'review') ex.reviewSet = true;
      else if (!ex.reviewSet && val) {
        ex.review = addDays(val, +state.opts.reviewDays || 21);
        var rv = document.querySelector('[data-bind="experiments.' + m[1] + '.review"]'); if (rv) rv.value = ex.review;
      }
    }
    save();
  }
  function afterBind(el) {
    var path = el.dataset.bind;
    if (!path) return;
    if (el.dataset.check) { var w = document.querySelector('[data-chk="' + path + '"]'); if (w) w.hidden = !(RULE_RE.test(el.value) && !ui.keep[path]); }
    if (el.dataset.wc) { var wc = document.getElementById('wc'); if (wc) wc.textContent = el.value.trim().split(/\s+/).filter(Boolean).length + ' words. No minimum.'; }
    if (path.indexOf('conv.pattern.') === 0) { var pp = document.getElementById('patternPreview'); if (pp) pp.innerHTML = patternText(); }
    if (path.indexOf('experiments.') === 0) { var ep = document.getElementById('expPreview'); if (ep) ep.innerHTML = expPreview(state.experiments[ui.expIdx]); }
    if (path === 'conv.sitting2') { var g = document.getElementById('gcal2'); if (g) g.href = gcal('Enough of Both: sitting two', state.conv.sitting2); }
    if (/^offers\.[ab]\.offers\./.test(path)) {
      var t = path.split('.')[1], has = state.offers[t].offers.some(function (x) { return x && x.trim(); });
      [0, 1, 2].forEach(function (i) { var a = document.querySelector('[data-bind="offers.' + t + '.asks.' + i + '"]'); if (a) a.disabled = !has; });
    }
  }

  // ---------- boot ----------
  function boot(hotData) {
    if (hotData && hotData.state && hotData.state.v === 1 && hotData.state.app === 'enough-of-both') {
      state = normalise(hotData.state);
      if (!SCREENS[state.screen]) state.screen = 'welcome';
      render(); return;
    }
    var saved = loadSaved();
    if (saved && saved.app === 'enough-of-both' && saved.v === 1 && saved.mode) {
      state = normalise(saved);
      ui.resumeTo = saved.screen; state.screen = 'resume';
    }
    render();
  }
  var hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(function () { return { state: state }; }); } catch (e) { /* optional */ }
  if (hot && hot.ready) hot.ready(boot); else boot(hot && hot.data);
})();
