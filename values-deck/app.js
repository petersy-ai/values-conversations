/* Values Deck: a guided values conversation for two people.
 * One shared device passed back and forth, or one device each for the private
 * part: a locked set of answers travels as a file or text the couple sends
 * themselves. No backend, no analytics. */
(function () {
  'use strict';
  var S = VD.score;
  var KEY = 'values-deck-v1';
  var VIP_CAP = 12, TOP_N = S.TOP_N, PREDICT_N = 5, PREDICT_DOMAINS = 3;
  var $app = document.getElementById('app');

  // ---------- state ----------
  function blankResp() {
    return { order: [], piles: {}, protected: [], tieBreaks: [], top: [], words: {}, domains: {},
      predict: { top: [], domains: {}, conf: null }, locked: false, lockedAt: null, sortIdx: 0, domIdx: 0, stage: null };
  }
  function fresh() {
    return { v: 1, screen: 'welcome', mode: null, id: null, names: { a: '', b: '' }, me: null,
      opts: { intimacy: false, save: true }, domainsOff: [], rules: { a: false, b: false }, custom: [],
      resp: { a: blankResp(), b: blankResp() }, turn: null, trim: null, reveal: { round: 0, prompt: 0 },
      showNums: false, createdAt: new Date().toISOString(),
      close: { appr: { a: '', b: '' }, feel: '', revisit: {},
        include: { rings: true, top: true, shared: true, words: true, distinct: false, circle: true, domains: true, explore: true,
          predict: false, revisit: true, appr: false, feel: true } } };
  }
  var state = fresh();
  var ui = {};              // transient UI state

  function save() {
    try {
      if (state.opts.save && state.mode) localStorage.setItem(KEY, JSON.stringify(state));
      else localStorage.removeItem(KEY);
    } catch (e) { /* storage unavailable: carry on in memory */ }
  }
  function loadSaved() {
    try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function eraseAll() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state = fresh(); ui = {};
    go('welcome');
    toast('Everything has been erased from this device.');
  }
  // Fill in anything an older saved session lacks, and keep it on one device.
  function normalise(st) {
    var f = fresh(), out = Object.assign(f, st);
    out.mode = 'shared';
    out.close = Object.assign(fresh().close, st.close || {});
    out.close.include = Object.assign(fresh().close.include, (st.close && st.close.include) || {});
    out.resp = { a: Object.assign(blankResp(), (st.resp || {}).a || {}), b: Object.assign(blankResp(), (st.resp || {}).b || {}) };
    return out;
  }

  // ---------- files ----------
  // Saving a file goes through the artifact's `downloads` capability; it can be
  // absent (null), so every save has a fallback.
  var dlPromise = null;
  function getDownloads() {
    if (!dlPromise) {
      dlPromise = (window.claude && typeof window.claude.use === 'function')
        ? Promise.resolve(window.claude.use('downloads')).catch(function () { return null; })
        : Promise.resolve(null);
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
  function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person'; }
  function stamp(withTime) {
    var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + (withTime ? '-' + z(d.getHours()) + z(d.getMinutes()) : '');
  }
  function sessionJson() {
    var snap = JSON.parse(JSON.stringify(state));
    if (snap.screen === 'pair') snap.screen = snap.turn ? 'handover' : 'welcome';
    if (snap.screen === 'save' || snap.screen === 'about' || snap.screen === 'resume') {
      var back = ui.prev && ui.prev !== 'save' && ui.prev !== 'about' && ui.prev !== 'pair' ? ui.prev : ui.resumeTo;
      snap.screen = back && SCREENS[back] ? back : 'welcome';
    }
    return JSON.stringify({ app: 'values-deck', kind: 'session', version: 1, savedAt: new Date().toISOString(), state: snap }, null, 1);
  }
  function loadSession(obj) {
    if (obj && obj.app === 'values-deck' && obj.kind === 'half') return importHalf(obj);
    if (!obj || obj.app !== 'values-deck' || obj.kind !== 'session' || !obj.state || obj.state.v !== 1 || !obj.state.resp) {
      return toast('That is not a Values Deck save file.');
    }
    state = normalise(obj.state); ui = {};
    var s = state.screen;
    if (s === 'pair') s = 'handover';
    if (!SCREENS[s] || s === 'welcome' || s === 'resume' || s === 'save' || s === 'about') s = 'setup';
    ui.resumeTo = s; state.screen = 'resume';
    save(); render(); window.scrollTo(0, 0);
    toast('Saved session opened.');
  }
  function readFile(input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var obj; try { obj = parseText(rd.result); } catch (e) { return toast('That file could not be read as a Values Deck file.'); }
      loadSession(obj);
    };
    rd.readAsText(f);
  }
  function loadControls() {
    return '<div class="actions wrap"><label class="btn filebtn">Open a saved file<input type="file" id="loadFile" accept=".json,application/json,text/plain" data-file="session" hidden></label></div>' +
      '<details class="paste"><summary>Or paste the saved text</summary>' +
      '<textarea id="loadText" rows="4" spellcheck="false" autocomplete="off" placeholder="{&quot;app&quot;: &quot;values-deck&quot;, ...}"></textarea>' +
      '<button class="btn" data-act="loadPaste">Open</button></details>';
  }

  // ---------- two devices ----------
  // Each person can do the private part on their own device. A locked set of
  // answers (one person's "half") is sent as a file or as text, and the other
  // device adds it beside its own. Nothing is sent by the app itself.
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function unb64(str) { return decodeURIComponent(escape(atob(str.replace(/\s+/g, '')))); }
  function parseText(t) {
    t = String(t || '').trim();
    return JSON.parse(t.charAt(0) === '{' ? t : unb64(t));
  }
  function lockedOne() {
    var la = state.resp.a.locked, lb = state.resp.b.locked;
    return la && !lb ? 'a' : lb && !la ? 'b' : null;
  }
  function halfJson(p) {
    return JSON.stringify({ app: 'values-deck', kind: 'half', version: 1, savedAt: new Date().toISOString(), id: state.id,
      person: p, name: nm(p), intimacy: !!state.opts.intimacy, domainsOff: state.domainsOff, custom: state.custom, resp: state.resp[p] });
  }
  function importHalf(obj) {
    if (!obj || obj.version !== 1 || !obj.resp || !obj.resp.locked) return toast('Those answers are not locked yet. Lock them on the other device, then send them again.');
    var mine = lockedOne();
    if (both()) return toast('This device already has both sets of answers.');
    if (!state.mode || !mine) return toast('Lock your own answers on this device first, then add your partner\'s.');
    if (obj.resp.lockedAt && obj.resp.lockedAt === state.resp[mine].lockedAt) return toast('Those are the answers from this device. Add your partner\'s instead.');
    var slot = other(mine), r = Object.assign(blankResp(), obj.resp);
    r.predict = Object.assign(blankResp().predict, obj.resp.predict || {});
    r.stage = null;
    // Custom cards made on the other device join this deck.
    (Array.isArray(obj.custom) ? obj.custom : []).forEach(function (c) {
      if (!c || !/^c[a-z0-9]{1,12}$/.test(c.id) || state.custom.some(function (x) { return x.id === c.id; })) return;
      state.custom.push({ id: c.id, owner: c.owner === obj.person ? slot : mine, name: String(c.name || '').slice(0, 24),
        def: String(c.def || '').slice(0, 80), ho: VD.HO[c.ho] ? c.ho : null });
    });
    var ids = cards().map(function (c) { return c.id; });
    var known = function (list) { return (Array.isArray(list) ? list : []).filter(function (id) { return ids.indexOf(id) >= 0; }); };
    r.top = known(r.top); r.predict.top = known(r.predict.top);
    // A card one of you never saw counts as passed.
    ids.forEach(function (id) {
      if (r.piles[id] == null) r.piles[id] = 'pass';
      if (state.resp[mine].piles[id] == null) state.resp[mine].piles[id] = 'pass';
    });
    // Compare only the life areas you both had switched on.
    if (obj.intimacy === false) state.opts.intimacy = false;
    var off = state.domainsOff.slice();
    (Array.isArray(obj.domainsOff) ? obj.domainsOff : []).forEach(function (id) { if (domain(id) && state.domainsOff.indexOf(id) < 0) state.domainsOff.push(id); });
    if (!domains().length) state.domainsOff = off;
    var name = String(obj.name || '').trim().slice(0, 20);
    if (name && name.toLowerCase() !== nm(mine).trim().toLowerCase()) state.names[slot] = name;
    state.resp[slot] = r; state.rules = { a: true, b: true }; state.turn = null; ui = {};
    go('reveal-intro');
    toast(nm(slot) + '\'s answers added.');
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
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function cards() {
    return VD.VALUES.concat(state.custom.map(function (c) {
      return { id: c.id, name: c.name, def: c.def, ho: c.ho || null, schwartz: 'custom', custom: true, owner: c.owner };
    }));
  }
  function card(id) { return cards().filter(function (c) { return c.id === id; })[0] || { id: id, name: id, def: '' }; }
  function domains() {
    return VD.DOMAINS.filter(function (d) {
      return (!d.optional || state.opts.intimacy) && state.domainsOff.indexOf(d.id) < 0;
    });
  }
  function domain(id) { return VD.DOMAINS.filter(function (d) { return d.id === id; })[0]; }
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function R() { return state.resp[state.turn]; }
  function pileCount(r, p) { return Object.keys(r.piles).filter(function (k) { return r.piles[k] === p; }).length; }
  function inPile(r, p) { return cards().filter(function (c) { return r.piles[c.id] === p; }).map(function (c) { return c.id; }); }
  function rankPool(r) {
    var pool = inPile(r, 'very');
    if (pool.length < TOP_N) pool = pool.concat(inPile(r, 'imp'));
    return pool;
  }
  function rankNeed(r) { return Math.min(TOP_N, rankPool(r).length); }
  function both() { return state.resp.a.locked && state.resp.b.locked; }

  var toastTimer, $toast = document.getElementById('toast');
  function toast(msg) {
    $toast.textContent = msg; $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.classList.remove('show'); }, 2800);
  }
  function go(screen) {
    if (screen.indexOf('p-') === 0 && state.turn) state.resp[state.turn].stage = screen;
    state.screen = screen; save(); render(); window.scrollTo(0, 0);
  }
  function chip(id, extra, cls) {
    var c = card(id);
    return '<span class="chip ' + (cls || '') + '" title="' + esc(c.def) + '">' + esc(c.name) + (extra || '') + '</span>';
  }
  function chips(ids, fn, cls) {
    if (!ids.length) return '<p class="muted small">None</p>';
    return '<div class="chips">' + ids.map(function (id) { return chip(id, fn ? fn(id) : '', cls); }).join('') + '</div>';
  }
  // Copy must be called inside the click handler. If the clipboard is refused,
  // select the summary text so it can be copied by hand.
  function copy(text, elId) {
    var fallback = function () { selectEl(elId); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, fallback);
        return;
      } catch (e) { /* fall through */ }
    }
    fallback();
  }
  function selectEl(id) {
    var el = document.getElementById(id);
    if (!el) return toast('Copy did not work here. Select the text and copy it.');
    if (el.select) { el.focus(); el.select(); }
    else { var rg = document.createRange(); rg.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); }
    toast('Text selected. Use your device\'s Copy to copy it.');
  }

  // ---------- layout ----------
  var PRIVATE_STEPS = [['p-sort', 'Sort'], ['p-rank', 'Rank'], ['p-words', 'Your words'], ['p-domains', 'Life areas'], ['p-predict', 'Predict'], ['p-lock', 'Lock']];
  function stepper(cur) {
    var map = { 'p-review': 'p-sort', 'p-trim': 'p-sort' };
    cur = map[cur] || cur;
    var idx = PRIVATE_STEPS.map(function (s) { return s[0]; }).indexOf(cur);
    return '<ol class="stepper">' + PRIVATE_STEPS.map(function (s, i) {
      return '<li class="' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '">' + s[1] + '</li>';
    }).join('') + '</ol>';
  }
  function header() {
    var who = '';
    if (state.screen.indexOf('p-') === 0 && state.turn) who = '<span class="who who-' + state.turn + '">' + esc(nm(state.turn)) + ', private</span>';
    return '<header class="top"><button class="brand" data-act="about" aria-label="About">Values Deck</button>' + who + '</header>';
  }
  function footer() {
    var erase = state.mode ? (ui.eraseArm
      ? '<button class="link danger" data-act="erase">Tap again to erase everything</button>'
      : '<button class="link" data-act="armErase">Erase everything</button>') : '';
    var saveLink = state.mode && state.screen !== 'save' ? '<button class="link" data-act="saveScreen">Save to a file</button>' : '';
    return '<footer class="foot"><button class="link" data-act="about">About and evidence</button>' + saveLink + erase + '</footer>';
  }
  function render() {
    var fn = SCREENS[state.screen] || SCREENS.welcome;
    var body = fn();
    $app.innerHTML = header() + '<main class="screen screen-' + state.screen + '">' + body + '</main>' + footer();
  }

  // ---------- screens ----------
  var SCREENS = {};

  SCREENS.welcome = function () {
    return '<h1>A values conversation for two</h1>' +
      '<p class="lede">Each of you sorts a deck of value cards in private. Then you compare them together, with prompts that keep it a conversation rather than a test.</p>' +
      '<div class="notice">This is a conversation tool. It is not a test or a clinical assessment, and it gives no compatibility score.</div>' +
      '<ol class="how"><li><b>Private sort</b>, 20 to 30 minutes each: value cards, your top 7, life areas, and a guess at your partner\'s top values.</li>' +
      '<li><b>Reveal together</b>, 30 to 40 minutes: what you share, what surprised you, and where you differ.</li>' +
      '<li><b>Close</b>: what you appreciated hearing, what to come back to, and an optional joint summary.</li></ol>' +
      '<h2>One device, or one each</h2>' +
      '<p>On one phone, tablet or laptop, you pass it back and forth: one of you answers in private while the other looks away, then you swap. For the reveal, sit side by side where you can both see the screen.</p>' +
      '<p>To do the private part at the same time, each of you opens this page on your own device and chooses Start. After the set-up, choose <b>Use two devices</b>.</p>' +
      '<p class="small muted">The app sends your answers nowhere. They stay in this browser, and are kept between visits only if you leave Save progress on. You can also save them to a file.</p>' +
      '<div class="choice"><button class="btn big primary" data-act="start">Start<span>Set up together: names and options, about 5 minutes</span></button></div>' +
      '<h2>Carry on from a saved file</h2><p class="small">If you saved your progress to a .json file, open it here to pick up where you left off.</p>' + loadControls();
  };

  SCREENS.resume = function () {
    var started = new Date(state.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    return '<h1>Welcome back</h1><p>You have a session in progress for ' + esc(nm('a')) + ' and ' + esc(nm('b')) +
      ', started ' + esc(started) + '.</p>' +
      '<div class="actions"><button class="btn primary" data-act="resume">Carry on</button>' +
      '<button class="btn" data-act="armErase">Start over</button></div>' +
      (ui.eraseArm ? '<p><button class="btn danger" data-act="erase">Erase the saved session and start over</button></p>' : '') +
      '<h2>Open a different saved file</h2>' + loadControls();
  };

  SCREENS.setup = function () {
    return '<h1>Set up</h1>' +
      '<label class="field"><span>First person <small>(answers first)</small></span><input id="nameA" data-bind="names.a" value="' + esc(state.names.a) + '" maxlength="20" autocomplete="off"></label>' +
      '<label class="field"><span>Second person</span><input id="nameB" data-bind="names.b" value="' + esc(state.names.b) + '" maxlength="20" autocomplete="off"></label>' +
      '<fieldset class="field"><legend>Options</legend>' +
      '<label class="check"><input type="checkbox" data-bind="opts.intimacy"' + (state.opts.intimacy ? ' checked' : '') + '> Include the affection and intimacy card <small>(off by default; you can each still pass on it)</small></label>' +
      '<label class="check"><input type="checkbox" data-bind="opts.save"' + (state.opts.save ? ' checked' : '') + '> Save progress on this device <small>(so you can stop and resume; erase at the end)</small></label>' +
      '</fieldset>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="welcome">Back</button><button class="btn primary" data-act="setupNext">Continue</button></div>';
  };

  SCREENS.rules = function () {
    return '<h1>Ground rules</h1><p>Read these out loud together.</p><ol class="rules">' +
      VD.RULES.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
      '<label class="check"><input type="checkbox" data-bind="rules.a"' + (state.rules.a ? ' checked' : '') + '> ' + esc(nm('a')) + ' agrees</label>' +
      '<label class="check"><input type="checkbox" data-bind="rules.b"' + (state.rules.b ? ' checked' : '') + '> ' + esc(nm('b')) + ' agrees</label>' +
      '<p class="small muted">If either of you gets upset at any point, stop and go to the Close step. The results are not a decision about the relationship.</p>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="setup">Back</button><button class="btn primary" data-act="rulesNext">Continue</button></div>';
  };

  SCREENS.custom = function () {
    var f = ui.cf || (ui.cf = { owner: 'a', name: '', def: 'to ', ho: '' });
    var list = state.custom.length ? '<ul class="customs">' + state.custom.map(function (c) {
      return '<li><b>' + esc(c.name) + '</b> <span class="muted">' + esc(c.def) + '</span> <small>(' + esc(nm(c.owner)) + ')</small> ' +
        '<button class="link" data-act="delCustom" data-arg="' + c.id + '">Remove</button></li>';
    }).join('') + '</ul>' : '';
    var hoOpts = '<option value="">No group / not sure</option>' + VD.HO_ORDER.map(function (k) {
      return '<option value="' + k + '"' + (f.ho === k ? ' selected' : '') + '>' + VD.HO[k].name + '</option>';
    }).join('');
    return '<h1>Make it yours</h1>' +
      '<h2>Your own value cards <small class="muted">(optional)</small></h2>' +
      '<p class="small">The deck has ' + VD.VALUES.length + ' value cards. Each of you can add up to 3 of your own. Added cards go into both decks so you can compare them.</p>' +
      list +
      '<div class="panel"><label class="field"><span>Whose card?</span><select data-bind="_cf.owner">' +
      ['a', 'b'].map(function (p) { return '<option value="' + p + '"' + (f.owner === p ? ' selected' : '') + '>' + esc(nm(p)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>Value name</span><input data-bind="_cf.name" value="' + esc(f.name) + '" maxlength="24" placeholder="e.g. Play"></label>' +
      '<label class="field"><span>What it means</span><input data-bind="_cf.def" value="' + esc(f.def) + '" maxlength="80"></label>' +
      '<label class="field"><span>Closest group <small>(used only for the circle view)</small></span><select data-bind="_cf.ho">' + hoOpts + '</select></label>' +
      '<button class="btn" data-act="addCustom">Add card</button></div>' +
      '<h2>Life areas</h2><p class="small">Untick any you would both rather leave for another time.</p>' +
      VD.DOMAINS.filter(function (d) { return !d.optional || state.opts.intimacy; }).map(function (d) {
        return '<label class="check"><input type="checkbox" data-act="toggleDomain" data-arg="' + d.id + '"' + (state.domainsOff.indexOf(d.id) < 0 ? ' checked' : '') + '> ' + esc(d.name) + '</label>';
      }).join('') +
      '<div class="actions"><button class="btn" data-act="go" data-arg="rules">Back</button><button class="btn primary" data-act="customNext">Continue</button></div>';
  };

  SCREENS.save = function () {
    var fb = ui.saveFallback
      ? '<p class="small">Saving files is not available here. Copy this text into a private note instead; you can paste it back in on the first screen to carry on.</p>' +
        '<label class="field"><span>Saved text</span><textarea id="saveText" rows="6" readonly spellcheck="false">' + esc(sessionJson()) + '</textarea></label>' +
        '<div class="actions wrap"><button class="btn" data-act="copySave">Copy the text</button></div>' : '';
    return '<h1>Save to a file</h1>' +
      '<p>This saves everything so far, for both of you, as a .json file. To carry on later, open this page and choose <b>Open a saved file</b>.</p>' +
      '<div class="notice">The file holds both people\'s answers, including private answers not yet revealed. Keep it where only the two of you can open it.</div>' +
      '<div class="actions wrap"><button class="btn primary" data-act="saveJson">Save the .json file</button></div>' + fb +
      '<div class="actions"><button class="btn" data-act="saveBack">Back</button></div>';
  };

  SCREENS.handover = function () {
    var t = state.turn;
    return '<div class="handover"><p class="muted">Private turn</p><h1>Pass the device to ' + esc(nm(t)) + '</h1>' +
      '<p>' + esc(nm(other(t))) + ', step away or look elsewhere until ' + esc(nm(t)) + ' has locked their answers.</p>' +
      '<button class="btn primary big" data-act="startPrivate" data-arg="' + t + '">I\'m ' + esc(nm(t)) + ' and ready</button>' +
      (lockedOne()
        ? '<p>Is ' + esc(nm(t)) + ' answering on another device?</p><button class="btn" data-act="pairOpen">Send or add answers</button>'
        : '<p class="small muted">One device each for this part? <button class="link" data-act="pairOpen">Use two devices</button></p>') +
      '<p class="small muted">Stopping here for today? <button class="link" data-act="saveScreen">Save to a file</button> first.</p></div>';
  };

  SCREENS.pair = function () {
    var mine = lockedOne(), o = mine && other(mine), h = '<h1>Two devices</h1>';
    if (both()) return h + '<p>This device already has both sets of answers.</p><div class="actions"><button class="btn primary" data-act="pairBack">Back</button></div>';
    if (!mine) {
      return h + '<p>Each of you can do the private part on your own device, at the same time. Afterwards one device brings both sets of answers together for the reveal.</p>' +
        '<ol class="how"><li>On each device, open this page, choose Start and set up with the same two names.</li>' +
        '<li>Below, choose who is answering on this device. Do your private part and lock it.</li>' +
        '<li>When your answers are locked, come back to this screen to send them to your partner, or to add theirs.</li></ol>' +
        '<h2>Who is answering on this device?</h2><div class="actions wrap">' + ['a', 'b'].map(function (p) {
          return '<button class="btn' + (state.turn === p ? ' on' : '') + '" data-act="pairWho" data-arg="' + p + '">' + esc(nm(p)) + '</button>';
        }).join('') + '</div>' +
        '<p class="small muted">The other person\'s answers on this device stay empty until you add them. If you each add custom cards or switch off different life areas, the reveal uses all the custom cards and only the life areas you both kept.</p>' +
        '<div class="actions"><button class="btn primary" data-act="pairBack">Continue</button></div>';
    }
    return h + '<p>' + esc(nm(mine)) + '\'s answers are locked on this device. One device needs both sets: either send ' + esc(nm(mine)) + '\'s answers to ' + esc(nm(o)) + ', or add ' + esc(nm(o)) + '\'s here. Only one of you needs to send.</p>' +
      '<h2>Send ' + esc(nm(mine)) + '\'s answers</h2>' +
      '<p class="small">This holds ' + esc(nm(mine)) + '\'s private answers and nothing else. Send it to ' + esc(nm(o)) + ' yourself, for example in a message. The app sends nothing.</p>' +
      '<div class="actions wrap"><button class="btn primary" data-act="pairCopy">Copy as text</button><button class="btn" data-act="pairSave">Save as a file</button></div>' +
      '<details class="paste"><summary>Show the text</summary><textarea id="pairText" rows="5" readonly spellcheck="false">' + esc(b64(halfJson(mine))) + '</textarea></details>' +
      '<h2>Add ' + esc(nm(o)) + '\'s answers</h2>' +
      '<p class="small">Paste the text ' + esc(nm(o)) + ' sent you, or open their file. The reveal starts straight away, so do this when you are together.</p>' +
      '<textarea id="pairIn" rows="4" spellcheck="false" autocomplete="off" placeholder="Paste the text here"></textarea>' +
      '<div class="actions wrap"><button class="btn primary" data-act="pairPaste">Add the pasted answers</button>' +
      '<label class="btn filebtn">Open their file<input type="file" accept=".json,application/json,text/plain" data-file="half" hidden></label></div>' +
      '<div class="actions"><button class="btn" data-act="pairBack">Back</button></div>';
  };

  SCREENS['p-intro'] = function () {
    return '<h1>' + esc(nm(state.turn)) + ', this part is private</h1>' +
      '<p>Answer for yourself, as you are now, rather than as you think you should be. There are no right answers, and you can pass on anything.</p>' +
      '<ol class="how"><li><b>Sort</b> ' + cards().length + ' value cards into three piles.</li><li><b>Rank</b> your top ' + TOP_N + '.</li>' +
      '<li><b>Your words</b>: what your top 3 look like in an ordinary week.</li><li><b>Life areas</b>: how important each is, where you stand, and how flexible you feel.</li>' +
      '<li><b>Predict</b> ' + esc(nm(other(state.turn))) + '\'s top values.</li><li><b>Lock</b> your answers so nothing changes after the reveal.</li></ol>' +
      '<div class="actions"><button class="btn primary" data-act="beginSort">Start sorting</button></div>';
  };

  SCREENS['p-sort'] = function () {
    var r = R(), id = r.order[r.sortIdx], c = card(id), vip = pileCount(r, 'very');
    var owner = c.custom ? '<p class="small muted">Added by ' + esc(nm(c.owner)) + '</p>' : '';
    return stepper('p-sort') +
      '<p class="counter">Card ' + (r.sortIdx + 1) + ' of ' + r.order.length + ' · Very important: <b class="' + (vip > VIP_CAP ? 'over' : '') + '">' + vip + '</b> (aim for ' + VIP_CAP + ' or fewer)</p>' +
      '<div class="vcard"><h2>' + esc(c.name) + '</h2><p>' + esc(c.def) + '</p>' + owner + '</div>' +
      '<div class="piles"><button class="btn pile very" data-act="pile" data-arg="very">Very important</button>' +
      '<button class="btn pile imp" data-act="pile" data-arg="imp">Important</button>' +
      '<button class="btn pile less" data-act="pile" data-arg="less">Less important right now</button></div>' +
      '<div class="actions spread"><button class="btn ghost" data-act="sortBack"' + (r.sortIdx ? '' : ' disabled') + '>Back</button>' +
      '<button class="btn ghost" data-act="pile" data-arg="pass">Pass</button></div>';
  };

  SCREENS['p-review'] = function () {
    var r = R();
    function col(p, label) {
      var ids = inPile(r, p);
      return '<section class="pilecol ' + p + '"><h3>' + label + ' <span class="muted">(' + ids.length + ')</span></h3><div class="chips">' +
        ids.map(function (id) { return '<button class="chip tap" data-act="cycle" data-arg="' + id + '">' + esc(card(id).name) + '</button>'; }).join('') + '</div></section>';
    }
    return stepper('p-review') + '<h1>Check your piles</h1><p class="small">Tap a card to move it to the next pile.</p>' +
      col('very', 'Very important') + col('imp', 'Important') + col('less', 'Less important right now') + col('pass', 'Passed') +
      '<div class="actions"><button class="btn primary" data-act="reviewNext">Continue</button></div>';
  };

  SCREENS['p-trim'] = function () {
    var r = R(), tr = state.trim, vip = pileCount(r, 'very');
    return stepper('p-trim') + '<h1>Narrow it down</h1>' +
      '<p>You have <b>' + vip + '</b> cards in Very important. To keep the top of your deck meaningful, trim it to ' + VIP_CAP + '. From these ' + tr.set.length + ', which ' + (maxWorst() > 1 ? 'are' : 'is') + ' <b>least</b> important to you' + (maxWorst() > 1 ? ' (pick up to ' + maxWorst() + ')' : '') + '? Optionally, which is <b>most</b>?</p>' +
      '<div class="bw">' + tr.set.map(function (id) {
        var c = card(id);
        return '<div class="bwrow"><div><b>' + esc(c.name) + '</b><br><span class="small muted">' + esc(c.def) + '</span></div>' +
          '<div class="bwbtns"><button class="btn sm' + (tr.best === id ? ' on' : '') + '" data-act="trimPick" data-arg="best:' + id + '">Most</button>' +
          '<button class="btn sm' + (tr.worst.indexOf(id) >= 0 ? ' on warn' : '') + '" data-act="trimPick" data-arg="worst:' + id + '">Least</button></div></div>';
      }).join('') + '</div>' +
      '<p class="small muted">Cards marked Least move to Important. Nothing is lost.</p>' +
      '<div class="actions"><button class="btn" data-act="trimSkip">Keep all ' + vip + '</button><button class="btn primary" data-act="trimNext">Next</button></div>';
  };

  SCREENS['p-rank'] = function () {
    var r = R(), pool = rankPool(r), need = rankNeed(r);
    r.top = r.top.filter(function (id) { return pool.indexOf(id) >= 0; });
    var picked = r.top.map(function (id, i) {
      return '<li><span class="num">' + (i + 1) + '</span><span class="nm">' + esc(card(id).name) + '</span>' +
        '<button class="btn sm" data-act="rankMove" data-arg="up:' + id + '"' + (i ? '' : ' disabled') + ' aria-label="Move up">↑</button>' +
        '<button class="btn sm" data-act="rankMove" data-arg="down:' + id + '"' + (i < r.top.length - 1 ? '' : ' disabled') + ' aria-label="Move down">↓</button>' +
        '<button class="btn sm" data-act="rankMove" data-arg="out:' + id + '" aria-label="Remove">×</button></li>';
    }).join('');
    var rest = pool.filter(function (id) { return r.top.indexOf(id) < 0; });
    if (!need) return stepper('p-rank') + '<h1>Your top values</h1><p>You did not put any cards in Very important or Important, so there is nothing to rank. That is fine.</p>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="p-review">Back to piles</button><button class="btn primary" data-act="rankNext">Continue</button></div>';
    return stepper('p-rank') + '<h1>Your top ' + need + '</h1>' +
      '<p class="small">Tap the value that matters most to you first, then the next, until you have ' + need + '. Use the arrows to adjust.</p>' +
      '<ol class="ranked">' + picked + '</ol>' +
      (r.top.length < need ? '<div class="pool">' + rest.map(function (id) {
        var c = card(id);
        return '<button class="poolcard" data-act="rankPick" data-arg="' + id + '"><b>' + esc(c.name) + '</b><span>' + esc(c.def) + '</span></button>';
      }).join('') + '</div>' : '<p class="ok">All ' + need + ' ranked.</p>') +
      '<div class="actions"><button class="btn" data-act="go" data-arg="p-review">Back to piles</button><button class="btn primary" data-act="rankNext">Continue</button></div>';
  };

  SCREENS['p-words'] = function () {
    var r = R(), t = state.turn, top3 = r.top.slice(0, 3);
    if (!top3.length) return stepper('p-words') + '<p>No ranked values, so nothing to describe.</p><div class="actions"><button class="btn primary" data-act="go" data-arg="p-domains">Continue</button></div>';
    return stepper('p-words') + '<h1>In your own words</h1><p class="small">Words like "Family" or "Freedom" can mean very different things to two people. Say what yours look like in practice. Short is fine.</p>' +
      top3.map(function (id, i) {
        var w = r.words[id] || {};
        return '<div class="panel"><h3>' + (i + 1) + '. ' + esc(card(id).name) + '</h3>' +
          '<label class="field"><span>On an ordinary Tuesday, this looks like…</span><textarea data-bind="resp.' + t + '.words.' + id + '.tue" maxlength="140" rows="2">' + esc(w.tue || '') + '</textarea></label>' +
          '<label class="field"><span>Where this comes from for me <small>(optional: family, culture, an experience)</small></span><input data-bind="resp.' + t + '.words.' + id + '.origin" maxlength="140" value="' + esc(w.origin || '') + '"></label></div>';
      }).join('') +
      '<div class="actions"><button class="btn" data-act="go" data-arg="p-rank">Back</button><button class="btn primary" data-act="go" data-arg="p-domains">Continue</button></div>';
  };

  SCREENS['p-domains'] = function () {
    var r = R(), t = state.turn, ds = domains(), i = Math.min(r.domIdx, ds.length - 1), d = ds[i];
    var a = r.domains[d.id] || {};
    var path = 'resp.' + t + '.domains.' + d.id;
    var dis = a.pass ? ' disabled' : '';
    return stepper('p-domains') + '<p class="counter">Life area ' + (i + 1) + ' of ' + ds.length + '</p>' +
      '<div class="vcard dcard' + (a.pass ? ' passed' : '') + '"><h2>' + esc(d.name) + '</h2><p>' + esc(d.prompt) + '</p></div>' +
      '<h3>How important is this to you?</h3><div class="seg">' + VD.IMPORTANCE.map(function (lab, n) {
        return '<button class="btn sm' + (a.imp === n ? ' on' : '') + '" data-act="dSet" data-arg="imp:' + n + '"' + dis + '>' + n + '<small>' + lab + '</small></button>';
      }).join('') + '</div>' +
      '<h3>Where do you stand? <small class="muted">(optional)</small></h3><div class="chips">' + d.options.map(function (o, n) {
        return '<button class="chip tap' + (a.pos === n ? ' on' : '') + '" data-act="dSet" data-arg="pos:' + n + '"' + dis + '>' + esc(o) + '</button>';
      }).join('') + '</div>' +
      '<label class="field"><span>Anything to add? <small>(optional)</small></span><input data-bind="' + path + '.note" maxlength="120" value="' + esc(a.note || '') + '"' + dis + '></label>' +
      '<h3>How flexible do you feel about it?</h3><div class="seg three">' + Object.keys(VD.FLEX).map(function (k) {
        return '<button class="btn sm' + (a.flex === k ? ' on' : '') + '" data-act="dSet" data-arg="flex:' + k + '"' + dis + '>' + VD.FLEX[k] + '</button>';
      }).join('') + '</div>' +
      '<label class="check"><input type="checkbox" data-bind="' + path + '.talk"' + (a.talk ? ' checked' : '') + dis + '> I would like us to talk about this one</label>' +
      '<div class="actions spread"><button class="btn" data-act="domNav" data-arg="-1">Back</button>' +
      '<button class="btn ghost" data-act="dSet" data-arg="pass:1">' + (a.pass ? 'Un-pass' : 'Pass for now') + '</button>' +
      '<button class="btn primary" data-act="domNav" data-arg="1">Next</button></div>';
  };

  SCREENS['p-predict'] = function () {
    var r = R(), o = nm(other(state.turn)), p = r.predict;
    var nd = Object.keys(p.domains).length;
    return stepper('p-predict') + '<h1>How well do you know ' + esc(o) + '?</h1>' +
      '<p class="small">Pick the ' + PREDICT_N + ' values you think are in ' + esc(o) + '\'s top ' + TOP_N + '. Guessing is the point: comparing guesses with answers is one of the most useful parts of the reveal.</p>' +
      '<p class="counter">' + p.top.length + ' of ' + PREDICT_N + ' picked</p><div class="chips">' + cards().map(function (c) {
        return '<button class="chip tap' + (p.top.indexOf(c.id) >= 0 ? ' on' : '') + '" data-act="predPick" data-arg="' + c.id + '" title="' + esc(c.def) + '">' + esc(c.name) + '</button>';
      }).join('') + '</div>' +
      '<h2>Life areas</h2><p class="small">Choose up to ' + PREDICT_DOMAINS + ' areas and guess how important each is to ' + esc(o) + ' (0 = not important, 4 = essential).</p>' +
      domains().map(function (d) {
        var g = p.domains[d.id];
        return '<div class="predrow' + (g != null ? ' on' : '') + '"><span>' + esc(d.name) + '</span><div class="seg mini">' + [0, 1, 2, 3, 4].map(function (n) {
          return '<button class="btn xs' + (g === n ? ' on' : '') + '" data-act="predDom" data-arg="' + d.id + ':' + n + '"' + (g == null && nd >= PREDICT_DOMAINS ? ' disabled' : '') + '>' + n + '</button>';
        }).join('') + '</div></div>';
      }).join('') +
      '<h2>How confident are you?</h2><div class="seg">' + [1, 2, 3, 4, 5].map(function (n) {
        return '<button class="btn sm' + (p.conf === n ? ' on' : '') + '" data-act="predConf" data-arg="' + n + '">' + n + '<small>' + ['Wild guess', '', 'Fairly', '', 'Very'][n - 1] + '</small></button>';
      }).join('') + '</div>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="p-domains">Back</button><button class="btn primary" data-act="predNext">Continue</button></div>';
  };

  SCREENS['p-lock'] = function () {
    var r = R(), nd = domains().filter(function (d) { return r.domains[d.id] && (r.domains[d.id].imp != null || r.domains[d.id].pass); }).length;
    return stepper('p-lock') + '<h1>Lock your answers</h1>' +
      '<p>Your top ' + r.top.length + ':</p><ol class="ranked plain">' + r.top.map(function (id) { return '<li>' + esc(card(id).name) + '</li>'; }).join('') + '</ol>' +
      '<p class="small">' + nd + ' of ' + domains().length + ' life areas answered · ' + r.predict.top.length + ' predictions made.</p>' +
      '<div class="notice">Once locked, your answers cannot be changed. That keeps the reveal honest. You can still pass on anything during the conversation.</div>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="p-predict">Back</button><button class="btn primary" data-act="lock">Lock my answers</button></div>';
  };

  SCREENS['reveal-intro'] = function () {
    return '<h1>Both of you are locked in</h1>' +
      '<p>Sit together where you can both see the screen. Allow 30 to 40 minutes.</p>' +
      '<ul class="tips"><li>Take turns. Each round says who answers first, and it alternates.</li>' +
      '<li>When one of you is sharing, the other listens, then reflects back what they heard before asking a question.</li>' +
      '<li>Differences are expected. Most couples have some that never fully resolve; what matters is how you talk about them.</li>' +
      '<li>Either of you can pass, or stop and go straight to Close.</li></ul>' +
      '<div class="actions"><button class="btn primary big" data-act="round" data-arg="0">Start</button></div>';
  };

  var ROUNDS = [
    { title: 'Warm-up', key: 'warmup' },
    { title: 'What you share', key: 'shared' },
    { title: 'How well do you know each other?', key: 'predict' },
    { title: 'What matters to each of you', key: 'distinct' },
    { title: 'Life areas', key: 'domains' },
    { title: 'The values circle', key: 'circle' }
  ];

  function wordsOf(p, id) {
    var w = state.resp[p].words[id];
    if (!w || (!w.tue && !w.origin)) return '';
    return '<div class="said said-' + p + '"><b>' + esc(nm(p)) + ':</b> ' + esc(w.tue || '') +
      (w.origin ? ' <span class="muted">(from: ' + esc(w.origin) + ')</span>' : '') + '</div>';
  }
  var PILE_LABEL = { very: 'Very important', imp: 'Important', less: 'Less important right now', pass: 'Passed' };

  function roundBody(n) {
    var A = state.resp.a, B = state.resp.b, ids = cards().map(function (c) { return c.id; });
    if (n === 0) {
      return '<p>Start light. Both of you answer each prompt.</p>';
    }
    if (n === 1) {
      var sh = S.sharedTop(A, B);
      var near = S.rings(A, B, ids);
      return (sh.length
        ? '<p>You share <b>' + sh.length + '</b> of your top ' + TOP_N + ' values. For each one, read out what it looks like for you, then ask: do we mean the same thing by this word?</p>' +
          sh.map(function (id) { return '<div class="panel"><h3>' + esc(card(id).name) + '</h3>' + wordsOf('a', id) + wordsOf('b', id) + '</div>'; }).join('')
        : '<p>None of your top ' + TOP_N + ' values overlap exactly. That is common, and on its own says little. Start with the values you both rated Very important:</p>') +
        (near.inner.length ? '<h3>Also Very important to both of you</h3>' + chips(near.inner.filter(function (id) { return sh.indexOf(id) < 0; })) : '');
    }
    if (n === 2) {
      return ['a', 'b'].map(function (x) {
        var y = other(x), p = S.prediction(state.resp[x], state.resp[y]);
        return '<div class="panel"><h3>' + esc(nm(x)) + '\'s guesses about ' + esc(nm(y)) + '</h3>' +
          '<p class="small">' + p.hits.length + ' of ' + p.n + ' guesses were in ' + esc(nm(y)) + '\'s top ' + TOP_N + (p.confidence ? ' · confidence ' + p.confidence + '/5' : '') + '</p>' +
          '<h4>Knew it</h4>' + chips(p.hits, null, 'hit') +
          '<h4>Surprises: in ' + esc(nm(y)) + '\'s top ' + TOP_N + ', not guessed</h4>' + chips(p.surprises, null, 'surprise') +
          '<h4>Projections: guessed for ' + esc(nm(y)) + ', and in ' + esc(nm(x)) + '\'s own top ' + TOP_N + ' instead</h4>' + chips(p.projections, null, 'proj') +
          (p.domains.length ? '<h4>Life areas</h4><ul class="plain">' + p.domains.map(function (d) {
            return '<li>' + esc(domain(d.id).name) + ': guessed ' + d.guess + ', actual ' + (d.actual == null ? 'passed' : d.actual) + '</li>';
          }).join('') + '</ul>' : '') + '</div>';
      }).join('') +
        '<p class="small muted">Projection, seeing your own values in your partner, is the most common pattern in research on how partners perceive each other. It is a normal bias, not a failing.</p>';
    }
    if (n === 3) {
      return '<p>Each of you has values the other placed lower. One person shares; the other listens, reflects back what they heard, then asks one question. Then swap.</p>' +
        ['a', 'b'].map(function (x) {
          var y = other(x), d = S.distinct(state.resp[x], state.resp[y]);
          return '<div class="panel"><h3>Matters more to ' + esc(nm(x)) + '</h3>' + (d.length ? d.map(function (id) {
            var py = S.effPile(state.resp[y], id);
            return '<div class="drow">' + chip(id) + ' <span class="small muted">' + esc(nm(y)) + ': ' + (PILE_LABEL[py] || 'not sorted') + '</span>' + wordsOf(x, id) + '</div>';
          }).join('') : '<p class="small muted">Nothing here: ' + esc(nm(y)) + ' rated all of ' + esc(nm(x)) + '\'s top values Very important.</p>') + '</div>';
        }).join('');
    }
    if (n === 4) {
      var g = S.domainCompare(A, B, domains());
      function side(row, p) {
        var v = row[p], d = domain(row.id);
        return '<div class="side side-' + p + '"><b>' + esc(nm(p)) + '</b>: importance ' + v.imp + (v.pos != null ? ', ' + esc(d.options[v.pos]) : '') +
          (v.flex ? ' · ' + VD.FLEX[v.flex] : '') + (v.note ? '<br><span class="small">"' + esc(v.note) + '"</span>' : '') + '</div>';
      }
      function block(rows, title, hint, cls) {
        if (!rows.length) return '';
        return '<h3>' + title + '</h3>' + (hint ? '<p class="small muted">' + hint + '</p>' : '') + rows.map(function (row) {
          var talk = ['a', 'b'].filter(function (p) { return row[p].talk; }).map(nm);
          return '<div class="panel dom ' + cls + '"><h4>' + esc(domain(row.id).name) + (talk.length ? ' <span class="flag">' + esc(talk.join(' and ')) + ' flagged this</span>' : '') + '</h4>' +
            side(row, 'a') + side(row, 'b') + '</div>';
        }).join('');
      }
      return '<p>Start with what lines up, then move to differences. Nothing needs deciding today.</p>' +
        block(g.aligned, 'Lined up', '', 'aligned') +
        block(g.different, 'Different, with some give', 'Different positions or importance, and neither of you is firm on both.', 'diff') +
        block(g.explore, 'Keep exploring', 'Both of you rate these as very important, your positions differ, and at least one of you feels firm. Ask about the hope underneath each position rather than trying to solve it.', 'explore') +
        (g.low.length ? '<p class="small muted">Low importance for both: ' + g.low.map(function (r) { return esc(domain(r.id).name); }).join(', ') + '.</p>' : '') +
        (g.passed.length ? '<p class="small muted">Passed for now: ' + g.passed.map(function (r) { return esc(domain(r.id).name); }).join(', ') + '.</p>' : '');
    }
    if (n === 5) {
      return '<p>Psychologist Shalom Schwartz found that values across cultures arrange in a circle of four broad groups. Neighbouring groups sit easily together; opposite ones pull against each other. This chart shows where each of you leans, relative to your own average.</p>' +
        radar() +
        '<dl class="holegend">' + VD.HO_ORDER.map(function (k) { return '<dt>' + VD.HO[k].name + '</dt><dd>' + HO_DESC[k] + '</dd>'; }).join('') + '</dl>' +
        '<p class="small muted">These cards are not a validated Schwartz measure. Use the shape as a talking point only.</p>';
    }
    return '';
  }
  var HO_DESC = {
    OC: 'Independence, novelty, creativity, enjoyment.',
    SE: 'Achievement, status, resources, comfort.',
    CO: 'Safety, order, tradition, fitting in with others.',
    ST: 'Care for people close to you, and for people and nature more widely.'
  };

  function radar() {
    var hoA = S.higherOrder(state.resp.a, cards()), hoB = S.higherOrder(state.resp.b, cards());
    var W = 320, C = W / 2, Rr = 110, lo = -1.5, hi = 1.5;
    var ang = { OC: -90, SE: 0, CO: 90, ST: 180 };
    function pt(k, v) {
      var r = Rr * (Math.max(lo, Math.min(hi, v == null ? 0 : v)) - lo) / (hi - lo);
      var a = ang[k] * Math.PI / 180;
      return [C + r * Math.cos(a), C + r * Math.sin(a)];
    }
    function poly(ho, cls) {
      return '<polygon class="' + cls + '" points="' + VD.HO_ORDER.map(function (k) { return pt(k, ho[k]).join(','); }).join(' ') + '"/>';
    }
    var zero = Rr * (0 - lo) / (hi - lo);
    var LAB = { OC: [C, C - Rr - 14, 'middle'], CO: [C, C + Rr + 16, 'middle'], SE: [C + Rr + 8, C, 'start'], ST: [C - Rr - 8, C, 'end'] };
    var axes = VD.HO_ORDER.map(function (k) {
      var e = pt(k, hi), l = LAB[k];
      return '<line x1="' + C + '" y1="' + C + '" x2="' + e[0] + '" y2="' + e[1] + '" class="axis"/>' +
        '<text x="' + l[0] + '" y="' + l[1] + '" text-anchor="' + l[2] + '" dominant-baseline="middle" class="axlab">' + VD.HO[k].short + '</text>';
    }).join('');
    return '<figure class="radar"><svg viewBox="-100 0 520 ' + W + '" role="img" aria-label="Values circle for both of you">' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + Rr + '" class="ring"/>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + zero + '" class="ring zero"/>' + axes +
      poly(hoA, 'pa') + poly(hoB, 'pb') + '</svg>' +
      '<figcaption><span class="key ka"></span>' + esc(nm('a')) + ' <span class="key kb"></span>' + esc(nm('b')) +
      ' <span class="small muted">· dashed ring = each person\'s own average</span></figcaption></figure>';
  }

  SCREENS.reveal = function () {
    var n = state.reveal.round, rd = ROUNDS[n];
    var starter = n % 2 === 0 ? 'a' : 'b';
    var pool = VD.PROMPTS[rd.key].slice();
    if (n === 4 && S.domainCompare(state.resp.a, state.resp.b, domains()).explore.length) pool = pool.concat(VD.PROMPTS.dreams);
    var pi = state.reveal.prompt % pool.length;
    return '<p class="counter">Round ' + (n + 1) + ' of ' + ROUNDS.length + '</p><h1>' + rd.title + '</h1>' + roundBody(n) +
      '<div class="prompt"><p class="small">Prompt ' + (pi + 1) + ' of ' + pool.length + ' · <b>' + esc(nm(starter)) + '</b> answers first, then ' + esc(nm(other(starter))) + '</p>' +
      '<p class="q">' + esc(pool[pi]) + '</p><button class="btn sm" data-act="nextPrompt">Another prompt</button></div>' +
      '<div class="actions spread"><button class="btn" data-act="round" data-arg="' + (n - 1) + '">Back</button>' +
      '<button class="btn ghost" data-act="go" data-arg="close">Pause and close</button>' +
      '<button class="btn primary" data-act="round" data-arg="' + (n + 1) + '">Next</button></div>';
  };

  SCREENS.results = function () {
    var A = state.resp.a, B = state.resp.b, ids = cards().map(function (c) { return c.id; });
    var rg = S.rings(A, B, ids);
    var pA = S.prediction(A, B), pB = S.prediction(B, A);
    var surprise = pA.surprises.concat(pB.surprises);
    var star = function (id) { return surprise.indexOf(id) >= 0 ? ' <span class="star" title="A surprise in the prediction round">★</span>' : ''; };
    var ringChips = function (list) { return list.length ? '<div class="chips">' + list.map(function (id) { return chip(id, star(id)); }).join('') + '</div>' : '<p class="small muted">None</p>'; };
    var target = '<div class="target"><div class="ring-outer"><span class="rlab">Explore: Very important to one, less important to the other</span>' + ringChips(rg.outer) +
      '<div class="ring-middle"><span class="rlab">Near: Very important to one, important to the other</span>' + ringChips(rg.middle) +
      '<div class="ring-inner"><span class="rlab">Shared core: Very important to both</span>' + ringChips(rg.inner) + '</div></div></div></div>' +
      '<p class="small muted">★ = a surprise in the prediction round.</p>';
    var g = S.domainCompare(A, B, domains());
    var dsum = '<ul class="plain">' + [['aligned', 'Lined up'], ['different', 'Different, with some give'], ['explore', 'Keep exploring']].map(function (k) {
      return '<li><b>' + k[1] + ':</b> ' + (g[k[0]].length ? g[k[0]].map(function (r) { return esc(domain(r.id).name); }).join(', ') : 'none') + '</li>';
    }).join('') + '</ul>';
    var nums = '';
    if (state.showNums) {
      var sp = S.spearman(A, B, ids), j = S.jaccardTop(A, B), rb = S.rbo(A.top, B.top);
      nums = '<div class="panel nums"><p class="notice">Descriptive only. No research links these numbers to how relationships turn out, and a values snapshot at this stage has no demonstrated predictive value.</p><ul class="plain">' +
        '<li>Shared top values: ' + S.sharedTop(A, B).length + ' of ' + TOP_N + (j != null ? ' (overlap index ' + j.toFixed(2) + ')' : '') + '</li>' +
        (sp && sp.rho != null ? '<li>Rank agreement across all cards (Spearman ρ): ' + sp.rho.toFixed(2) + ' over ' + sp.n + ' cards</li>' : '') +
        (rb != null ? '<li>Top-weighted list similarity (rank-biased overlap, p = 0.9): ' + rb.toFixed(2) + '</li>' : '') +
        '<li>' + esc(nm('a')) + ' guessed ' + pA.hits.length + ' of ' + pA.n + '; ' + esc(nm('b')) + ' guessed ' + pB.hits.length + ' of ' + pB.n + '</li></ul></div>';
    }
    return '<h1>Where your values sit</h1>' + target +
      '<h2>Life areas</h2>' + dsum +
      '<p><button class="link" data-act="toggleNums">' + (state.showNums ? 'Hide numbers' : 'Show numbers') + '</button></p>' + nums +
      '<div class="actions"><button class="btn" data-act="round" data-arg="' + (ROUNDS.length - 1) + '">Back</button><button class="btn primary" data-act="go" data-arg="close">Close together</button></div>';
  };

  function revisitCandidates() {
    var A = state.resp.a, B = state.resp.b;
    if (!A.locked || !B.locked) return [];
    var g = S.domainCompare(A, B, domains()), out = [];
    g.explore.forEach(function (r) { out.push({ key: r.id, label: domain(r.id).name + ' (keep exploring)' }); });
    domains().forEach(function (d) {
      if (out.some(function (o) { return o.key === d.id; })) return;
      if ((A.domains[d.id] || {}).talk || (B.domains[d.id] || {}).talk) out.push({ key: d.id, label: d.name + ' (flagged to talk about)' });
    });
    S.rings(A, B, cards().map(function (c) { return c.id; })).outer.forEach(function (id) { out.push({ key: id, label: card(id).name + ' (value)' }); });
    return out;
  }
  var WHEN = ['', 'Next week', 'In a month', 'In a few months'];

  SCREENS.close = function () {
    var c = state.close, inc = c.include, ready = both();
    var cands = revisitCandidates();
    function incl(k, label) { return '<label class="check"><input type="checkbox" data-bind="close.include.' + k + '"' + (inc[k] ? ' checked' : '') + '> ' + label + '</label>'; }
    return '<h1>Close</h1><div class="prompt">' + VD.PROMPTS.closing.map(function (q) { return '<p class="q sm">' + esc(q) + '</p>'; }).join('') + '</div>' +
      '<h2>One thing you appreciated hearing</h2>' + ['a', 'b'].map(function (p) {
        return '<label class="field"><span>' + esc(nm(p)) + '</span><textarea data-bind="close.appr.' + p + '" rows="2" maxlength="280">' + esc(c.appr[p]) + '</textarea></label>';
      }).join('') +
      '<h2>How the conversation felt</h2><label class="field"><span>A sentence or two, together</span><textarea data-bind="close.feel" rows="2" maxlength="400">' + esc(c.feel) + '</textarea></label>' +
      (cands.length ? '<h2>Come back to</h2><p class="small">Pick one or two at most.</p>' + cands.map(function (o) {
        return '<label class="field inline"><span>' + esc(o.label) + '</span><select data-bind="close.revisit.' + o.key + '">' + WHEN.map(function (w) {
          return '<option value="' + w + '"' + ((c.revisit[o.key] || '') === w ? ' selected' : '') + '>' + (w || 'Not now') + '</option>';
        }).join('') + '</select></label>';
      }).join('') : '') +
      '<h2>Report and summary</h2><p class="small">Tick only what you both agree to include. The PDF report and the text summary use the same choices. If one of you wants to take it to a psychologist, the PDF report is the version to take. The similarity numbers are never included.</p>' +
      (ready ? incl('rings', 'Where our values sit (chart)') + incl('top', 'Each of our top ' + TOP_N + ', in order') + incl('shared', 'Values we share') +
        incl('words', 'Our own-words descriptions of shared values') + incl('distinct', 'What matters more to each of us (both agree)') +
        incl('circle', 'The values circle (chart)') + incl('domains', 'Life areas: how each of us rated them (chart)') + incl('explore', 'Life areas to keep exploring') +
        incl('predict', 'How well we predicted each other') : '') +
      incl('revisit', 'Topics to come back to') + incl('appr', 'What we appreciated hearing') + incl('feel', 'How the conversation felt') +
      '<div class="actions"><button class="btn" data-act="go" data-arg="' + (ready ? 'results' : 'welcome') + '">Back</button><button class="btn primary" data-act="go" data-arg="summary">Make the report</button></div>';
  };

  function summaryMd() {
    var A = state.resp.a, B = state.resp.b, inc = state.close.include, ready = both(), L = [];
    var date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    L.push('# Values conversation: ' + nm('a') + ' and ' + nm('b'), '', date, '',
      '_A self-guided values conversation using public-domain Personal Values Card Sort cards (Miller et al., 2001) and life-area cards. It is not a clinical assessment and gives no compatibility score._', '');
    function words(p, id) { var w = state.resp[p].words[id]; return w && w.tue ? '  - ' + nm(p) + ': ' + w.tue + (w.origin ? ' (from: ' + w.origin + ')' : '') : null; }
    var names = function (ids) { return ids.length ? ids.map(function (id) { return card(id).name; }).join(', ') : 'none'; };
    if (ready && inc.rings) {
      var rg = S.rings(A, B, cards().map(function (c) { return c.id; }));
      L.push('## Where our values sit', '', '- Shared core (Very important to both): ' + names(rg.inner),
        '- Near (Very important to one, Important to the other): ' + names(rg.middle),
        '- Explore (Very important to one, Less important to the other): ' + names(rg.outer), '');
    }
    if (ready && inc.top) {
      L.push('## Our top ' + TOP_N, '');
      ['a', 'b'].forEach(function (p) { L.push('- ' + nm(p) + ': ' + (state.resp[p].top.length ? state.resp[p].top.map(function (id, i) { return (i + 1) + '. ' + card(id).name; }).join(', ') : 'none')); });
      L.push('');
    }
    if (ready && inc.shared) {
      var sh = S.sharedTop(A, B);
      L.push('## Values we share', '');
      if (!sh.length) L.push('No exact overlap in our top ' + TOP_N + '.');
      sh.forEach(function (id) {
        L.push('- **' + card(id).name + '**: ' + card(id).def);
        if (inc.words) ['a', 'b'].forEach(function (p) { var w = words(p, id); if (w) L.push(w); });
      });
      L.push('');
    }
    if (ready && inc.distinct) {
      L.push('## What matters more to each of us', '');
      ['a', 'b'].forEach(function (p) {
        var d = S.distinct(state.resp[p], state.resp[other(p)]);
        L.push('- ' + nm(p) + ': ' + (d.length ? d.map(function (id) { return card(id).name; }).join(', ') : 'none'));
      });
      L.push('');
    }
    if (ready && inc.domains) {
      var gd = S.domainCompare(A, B, domains()), GL = { aligned: 'Lined up', different: 'Different, with some give', explore: 'Keep exploring', low: 'Low importance for both', passed: 'Passed for now' };
      L.push('## Life areas (importance 0 to 4)', '');
      Object.keys(GL).forEach(function (k) {
        gd[k].forEach(function (r) {
          var d = domain(r.id), side = function (p) { var v = r[p]; return v.pass ? 'passed' : v.imp == null ? 'not answered' : v.imp + (v.pos != null ? ', ' + d.options[v.pos] : '') + (v.flex ? ', ' + VD.FLEX[v.flex].toLowerCase() : ''); };
          L.push('- **' + d.name + '** (' + GL[k].toLowerCase() + '): ' + nm('a') + ' ' + side('a') + '; ' + nm('b') + ' ' + side('b'));
        });
      });
      L.push('');
    }
    if (ready && inc.predict) {
      L.push('## How well we predicted each other', '');
      ['a', 'b'].forEach(function (x) {
        var y = other(x), pr = S.prediction(state.resp[x], state.resp[y]);
        L.push('- ' + nm(x) + ' guessed ' + pr.hits.length + ' of ' + pr.n + ' of ' + nm(y) + '\'s top ' + TOP_N + '. Surprises: ' + names(pr.surprises) + '. Projections: ' + names(pr.projections) + '.');
      });
      L.push('');
    }
    if (ready && inc.explore && !inc.domains) {
      var g = S.domainCompare(A, B, domains());
      L.push('## Life areas to keep exploring', '');
      if (!g.explore.length) L.push('None flagged.');
      g.explore.forEach(function (r) {
        var d = domain(r.id);
        L.push('- **' + d.name + '**');
        ['a', 'b'].forEach(function (p) {
          var v = r[p];
          L.push('  - ' + nm(p) + ': ' + (v.pos != null ? d.options[v.pos] : 'no position given') + (v.flex ? ' (' + VD.FLEX[v.flex].toLowerCase() + ')' : ''));
        });
      });
      L.push('');
    }
    if (inc.revisit) {
      var rv = state.close.revisit, keys = Object.keys(rv).filter(function (k) { return rv[k]; });
      if (keys.length) {
        L.push('## To come back to', '');
        keys.forEach(function (k) { L.push('- ' + (k.charAt(0) === 'd' ? domain(k).name : card(k).name) + ': ' + rv[k].toLowerCase()); });
        L.push('');
      }
    }
    if (inc.appr && (state.close.appr.a || state.close.appr.b)) {
      L.push('## What we appreciated hearing', '');
      ['a', 'b'].forEach(function (p) { if (state.close.appr[p]) L.push('- ' + nm(p) + ': ' + state.close.appr[p]); });
      L.push('');
    }
    if (inc.feel && state.close.feel) L.push('## How it felt', '', state.close.feel, '');
    return L.join('\n');
  }

  function reportModel() {
    var A = state.resp.a, B = state.resp.b, ready = both();
    var m = { names: { a: nm('a'), b: nm('b') }, ready: ready, include: state.close.include, topN: TOP_N,
      date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) };
    var nameOf = function (id) { return card(id).name; };
    if (ready) {
      var ids = cards().map(function (c) { return c.id; }), sh = S.sharedTop(A, B);
      var whoVery = function (id) { return ['a', 'b'].filter(function (p) { return S.effPile(state.resp[p], id) === 'very'; }); };
      var ringList = function (list) { return list.map(function (id) { return { name: nameOf(id), who: whoVery(id) }; }); };
      var rg = S.rings(A, B, ids);
      m.rings = { inner: ringList(rg.inner), middle: ringList(rg.middle), outer: ringList(rg.outer) };
      m.tops = {};
      ['a', 'b'].forEach(function (p) { m.tops[p] = state.resp[p].top.map(function (id) { return { name: nameOf(id), shared: sh.indexOf(id) >= 0 }; }); });
      m.shared = sh.map(function (id) { return { name: nameOf(id), def: card(id).def, words: { a: A.words[id] || null, b: B.words[id] || null } }; });
      m.distinct = {};
      ['a', 'b'].forEach(function (p) {
        var q = state.resp[other(p)];
        m.distinct[p] = S.distinct(state.resp[p], q).map(function (id) { return { name: nameOf(id), other: PILE_LABEL[S.effPile(q, id)] || 'not sorted' }; });
      });
      m.circle = { a: S.higherOrder(A, cards()), b: S.higherOrder(B, cards()), labels: {},
        groups: VD.HO_ORDER.map(function (k) { return { name: VD.HO[k].name, desc: HO_DESC[k] }; }) };
      VD.HO_ORDER.forEach(function (k) { m.circle.labels[k] = VD.HO[k].short; });
      var g = S.domainCompare(A, B, domains());
      var side = function (v, d) {
        return { imp: v.imp == null ? null : v.imp, pass: !!v.pass, impLabel: v.imp != null ? VD.IMPORTANCE[v.imp] : null,
          pos: v.pos != null ? d.options[v.pos] : null, flex: v.flex ? VD.FLEX[v.flex] : null, note: v.note || '' };
      };
      m.domains = [];
      ['aligned', 'different', 'explore', 'low', 'passed'].forEach(function (k) {
        g[k].forEach(function (r) {
          var d = domain(r.id);
          m.domains.push({ name: d.name, group: k, a: side(r.a, d), b: side(r.b, d), flagged: ['a', 'b'].filter(function (p) { return r[p].talk; }) });
        });
      });
      m.predict = {};
      ['a', 'b'].forEach(function (x) {
        var pr = S.prediction(state.resp[x], state.resp[other(x)]);
        m.predict[x] = { n: pr.n, conf: pr.confidence, hits: pr.hits.map(nameOf), surprises: pr.surprises.map(nameOf), projections: pr.projections.map(nameOf),
          domains: pr.domains.map(function (d) { return { name: domain(d.id).name, guess: d.guess, actual: d.actual }; }) };
      });
    }
    var rv = state.close.revisit, labels = {};
    revisitCandidates().forEach(function (o) { labels[o.key] = o.label; });
    m.revisit = Object.keys(rv).filter(function (k) { return rv[k]; }).map(function (k) {
      return { label: labels[k] || (k.charAt(0) === 'd' && domain(k) ? domain(k).name : card(k).name), when: rv[k] };
    });
    m.appr = { a: state.close.appr.a || '', b: state.close.appr.b || '' };
    m.feel = state.close.feel || '';
    m.sources = VD.SOURCES;
    return m;
  }
  // jsPDF loads from cdnjs with `async`; wait briefly for it.
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

  SCREENS.summary = function () {
    var md = summaryMd();
    return '<h1>Your report and summary</h1><p class="small">Check it together before anyone takes it anywhere.</p>' +
      '<h2>PDF report</h2><p class="small">The charts and key results you ticked, laid out on A4 pages for reading, printing or sharing with a psychologist.</p>' +
      '<div class="actions wrap"><button class="btn primary" data-act="savePdf"' + (ui.pdfBusy ? ' disabled' : '') + '>' + (ui.pdfBusy ? 'Making the PDF…' : 'Save the PDF report') + '</button></div>' +
      (ui.pdfMsg ? '<p class="small error">' + esc(ui.pdfMsg) + '</p>' : '') +
      '<h2>Text summary</h2><p class="small muted">The same choices as plain text with simple Markdown headings, to paste into a note or a message.</p>' +
      '<pre class="md" id="summaryText">' + esc(md) + '</pre>' +
      '<div class="actions wrap"><button class="btn" data-act="copySummary">Copy the summary</button></div>' +
      '<h2>Keep the whole session</h2><p class="small">Save everything as a .json file to carry on later, or to look back in a few months.</p>' +
      '<div class="actions wrap"><button class="btn" data-act="saveScreen">Save to a file</button></div>' +
      '<div class="notice">When you are done, erase everything from this browser. Anything you pasted elsewhere is yours to keep or delete.</div>' +
      '<div class="actions"><button class="btn" data-act="go" data-arg="close">Back</button><button class="btn danger" data-act="' + (ui.eraseArm ? 'erase' : 'armErase') + '">' + (ui.eraseArm ? 'Tap again to erase' : 'Erase everything from this browser') + '</button></div>';
  };

  SCREENS.about = function () {
    return '<h1>About and evidence</h1>' +
      '<h2>What this is</h2><p>A structured conversation about values, for two people a few weeks into dating. It is a home exercise, not a clinical or validated assessment, and it does not replace work with a psychologist.</p>' +
      '<h2>Why no compatibility score</h2><p>Couples tend to be similar in values and attitudes, but the link between measured values similarity and relationship satisfaction is small and inconsistent (Luo and Klohnen 2005; Gaunt 2006; Leikas et al. 2018). Once people know each other, <i>perceived</i> similarity and feeling understood matter more than actual similarity (Montoya et al. 2008; Murray et al. 2002). The strongest predictors of relationship quality across 43 studies were relationship processes such as appreciation, commitment and how conflict is handled, not profile matches (Joel et al. 2020). So the app helps you talk and understand each other, and does not score you.</p>' +
      '<h2>How it is built</h2><ul class="plain">' +
      '<li><b>Value cards</b> use the wording of the Personal Values Card Sort (Miller, C\'de Baca, Matthews and Wilbourne, University of New Mexico, 2001), which is in the public domain and may be copied or adapted without permission. The private sort, then top-value ranking, follows its procedure.</li>' +
      '<li><b>The circle view</b> maps each card to Schwartz\'s theory of basic values, which has been replicated across cultures. The mapping is this app\'s own; the cards are not a Schwartz questionnaire.</li>' +
      '<li><b>Life areas</b> cover the content areas used in premarital inventories (PREPARE/ENRICH, FOCCUS, RELATE). No items from those instruments are used.</li>' +
      '<li><b>Private answers first, then comparison</b>, as in those inventories. <b>Predicting each other</b> draws on research on accuracy and bias in partner perception (Kenny and Acitelli 2001). <b>Turn-taking, escalating prompts</b> follow Aron et al. (1997). Questions for firm differences adapt the Gottman Institute\'s "dreams within conflict" idea (practitioner material, not independently tested).</li></ul>' +
      '<h2>Privacy</h2><p>The app has no account and sends your answers nowhere. They stay in this browser, and are kept between visits only if you leave Save progress on. Anyone who later opens this page in the same browser could see a saved session, so erase everything when you are done. Saved .json files and PDF reports are ordinary files on your device: keep or delete them as you would anything private.</p>' +
      '<h2>Sources</h2><ol class="sources">' + VD.SOURCES.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="small muted">Code: MIT licence.</p>' +
      '<div class="actions"><button class="btn primary" data-act="aboutBack">Back</button></div>';
  };

  // ---------- actions ----------
  var ACT = {
    go: function (s) { go(s); },
    about: function () { if (state.screen !== 'about') { if (state.screen !== 'save') ui.prev = state.screen; state.screen = 'about'; render(); window.scrollTo(0, 0); } },
    saveScreen: function () { if (state.screen !== 'save') { if (state.screen !== 'about') ui.prev = state.screen; ui.saveFallback = false; state.screen = 'save'; render(); window.scrollTo(0, 0); } },
    saveBack: function () { state.screen = ui.prev && SCREENS[ui.prev] ? ui.prev : 'welcome'; render(); window.scrollTo(0, 0); },
    saveJson: function () {
      saveFile('values-deck-' + slug(nm('a')) + '-' + slug(nm('b')) + '-' + stamp(true) + '.json', sessionJson(), function () { ui.saveFallback = true; render(); });
    },
    copySave: function () { copy(sessionJson(), 'saveText'); },
    loadPaste: function () {
      var t = (document.getElementById('loadText') || {}).value || '';
      if (!t.trim()) return toast('Paste the saved text first.');
      var obj; try { obj = parseText(t); } catch (e) { return toast('That text is not a Values Deck save. Paste all of it.'); }
      loadSession(obj);
    },
    pairOpen: function () { ui.eraseArm = false; state.screen = 'pair'; render(); window.scrollTo(0, 0); },
    pairBack: function () { go(state.turn ? 'handover' : 'welcome'); },
    pairWho: function (p) { if (!state.resp[p].locked) { state.turn = p; save(); render(); } },
    pairCopy: function () {
      var d = document.querySelector('details.paste'); if (d) d.open = true;
      copy(b64(halfJson(lockedOne())), 'pairText');
    },
    pairSave: function () {
      var p = lockedOne();
      saveFile('values-deck-answers-' + slug(nm(p)) + '-' + stamp(false) + '.json', halfJson(p), function () { toast('Saving files is not available here. Use Copy as text.'); });
    },
    pairPaste: function () {
      var t = (document.getElementById('pairIn') || {}).value || '';
      if (!t.trim()) return toast('Paste the text first.');
      var obj; try { obj = parseText(t); } catch (e) { return toast('That text could not be read. Copy all of it and paste again.'); }
      if (!obj || obj.app !== 'values-deck' || obj.kind !== 'half') return toast('That is not a set of Values Deck answers.');
      importHalf(obj);
    },
    savePdf: function () {
      if (ui.pdfBusy) return;
      ui.pdfBusy = true; ui.pdfMsg = ''; render();
      whenJsPDF().then(function (J) {
        var blob = VD.buildReport(J, reportModel());
        ui.pdfBusy = false; render();
        return saveFile('values-conversation-' + slug(nm('a')) + '-' + slug(nm('b')) + '-' + stamp(false) + '.pdf', blob, function () {
          ui.pdfMsg = 'Saving files is not available in this view. Open this page in a web browser on a computer or phone to save the PDF.'; render();
        });
      }).catch(function (e) {
        ui.pdfBusy = false;
        ui.pdfMsg = e && e.message === 'NO_PDF' ? 'The PDF tool did not load. Check your internet connection, then reload the page.' : 'The PDF could not be made (' + (e && e.message || e) + ').';
        render();
      });
    },
    aboutBack: function () { state.screen = ui.prev || 'welcome'; render(); },
    armErase: function () { ui.eraseArm = true; render(); setTimeout(function () { ui.eraseArm = false; render(); }, 5000); },
    erase: function () { eraseAll(); },
    resume: function () {
      var s = ui.resumeTo || 'welcome';
      if ((s.indexOf('p-') === 0 || s === 'pair') && state.mode === 'shared') s = 'handover';
      if (s === 'about' || s === 'resume' || !SCREENS[s]) s = 'welcome';
      go(s);
    },
    start: function () {
      state = fresh(); ui = {};
      state.mode = 'shared'; state.id = uid(); go('setup');
    },
    setupNext: function () {
      if (!state.names.a.trim() || !state.names.b.trim()) return toast('Add both first names.');
      if (state.names.a.trim().toLowerCase() === state.names.b.trim().toLowerCase()) return toast('Use two different names or initials.');
      go('rules');
    },
    rulesNext: function () { if (!state.rules.a || !state.rules.b) return toast('Both of you need to agree first.'); go('custom'); },
    addCustom: function () {
      var f = ui.cf;
      var mine = state.custom.filter(function (c) { return c.owner === f.owner; }).length;
      if (mine >= 3) return toast(nm(f.owner) + ' already has 3 custom cards.');
      if (!f.name.trim()) return toast('Give the card a name.');
      var def = f.def.trim(); if (def === 'to' || !def) def = '';
      state.custom.push({ id: 'c' + uid().slice(0, 6), owner: f.owner, name: f.name.trim(), def: def, ho: f.ho || null });
      ui.cf = { owner: f.owner, name: '', def: 'to ', ho: '' }; save(); render();
    },
    delCustom: function (id) { state.custom = state.custom.filter(function (c) { return c.id !== id; }); save(); render(); },
    toggleDomain: function (id, el) {
      var i = state.domainsOff.indexOf(id);
      if (el.checked && i >= 0) state.domainsOff.splice(i, 1);
      if (!el.checked && i < 0) state.domainsOff.push(id);
      if (!domains().length) { state.domainsOff.pop(); el.checked = true; toast('Keep at least one life area.'); }
      save();
    },
    customNext: function () { state.turn = 'a'; go('handover'); },
    startPrivate: function (t) {
      var r = state.resp[t];
      if (r.locked) {
        if (both()) { state.turn = null; return go('reveal-intro'); }
        state.turn = other(t); return go('handover');
      }
      state.turn = t;
      go(r.stage || 'p-intro');
    },
    beginSort: function () {
      var r = R();
      var ids = cards().map(function (c) { return c.id; });
      if (!r.order.length) r.order = shuffle(ids);
      else ids.forEach(function (id) { if (r.order.indexOf(id) < 0) r.order.push(id); });
      go(r.sortIdx >= r.order.length ? 'p-review' : 'p-sort');
    },
    pile: function (p) {
      var r = R(); r.piles[r.order[r.sortIdx]] = p; r.sortIdx++;
      if (r.sortIdx >= r.order.length) go('p-review'); else { save(); render(); }
    },
    sortBack: function () { var r = R(); if (r.sortIdx > 0) { r.sortIdx--; save(); render(); } },
    cycle: function (id) {
      var r = R(), seq = ['very', 'imp', 'less'], cur = r.piles[id];
      r.piles[id] = cur === 'pass' ? 'less' : seq[(seq.indexOf(cur) + 1) % 3];
      save(); render();
    },
    reviewNext: function () {
      var r = R();
      if (pileCount(r, 'very') > VIP_CAP) { r.protected = []; newTrimSet(); go('p-trim'); } else go('p-rank');
    },
    trimPick: function (arg) {
      var kv = arg.split(':'), tr = state.trim;
      var wi = tr.worst.indexOf(kv[1]);
      if (kv[0] === 'best') { tr.best = tr.best === kv[1] ? null : kv[1]; if (wi >= 0) tr.worst.splice(wi, 1); }
      else {
        if (wi >= 0) tr.worst.splice(wi, 1);
        else { if (tr.worst.length >= maxWorst()) tr.worst.shift(); tr.worst.push(kv[1]); }
        if (tr.best === kv[1]) tr.best = null;
      }
      render();
    },
    trimNext: function () {
      var r = R(), tr = state.trim;
      if (!tr.worst.length) return toast('Pick the least important one.');
      tr.worst.forEach(function (id) { r.piles[id] = 'imp'; });
      if (tr.best) r.protected.push(tr.best);
      r.tieBreaks.push({ set: tr.set, best: tr.best, worst: tr.worst });
      if (pileCount(r, 'very') <= VIP_CAP) { state.trim = null; go('p-rank'); }
      else { newTrimSet(); save(); render(); }
    },
    trimSkip: function () { state.trim = null; go('p-rank'); },
    rankPick: function (id) {
      var r = R();
      if (r.top.indexOf(id) < 0 && r.top.length < rankNeed(r)) r.top.push(id);
      save(); render();
    },
    rankMove: function (arg) {
      var r = R(), kv = arg.split(':'), i = r.top.indexOf(kv[1]);
      if (i < 0) return;
      if (kv[0] === 'out') r.top.splice(i, 1);
      else {
        var j = kv[0] === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= r.top.length) return;
        var t = r.top[i]; r.top[i] = r.top[j]; r.top[j] = t;
      }
      save(); render();
    },
    rankNext: function () {
      var r = R();
      if (r.top.length < rankNeed(r)) return toast('Rank ' + rankNeed(r) + ' values to continue.');
      go('p-words');
    },
    dSet: function (arg) {
      var r = R(), ds = domains(), d = ds[Math.min(r.domIdx, ds.length - 1)], kv = arg.split(':');
      var a = r.domains[d.id] || (r.domains[d.id] = {});
      if (kv[0] === 'imp') a.imp = +kv[1];
      else if (kv[0] === 'pos') a.pos = a.pos === +kv[1] ? null : +kv[1];
      else if (kv[0] === 'flex') a.flex = a.flex === kv[1] ? null : kv[1];
      else if (kv[0] === 'pass') a.pass = !a.pass;
      save(); render();
    },
    domNav: function (dir) {
      var r = R(), ds = domains(), i = Math.min(r.domIdx, ds.length - 1), a = r.domains[ds[i].id] || {};
      dir = +dir;
      if (dir > 0 && a.imp == null && !a.pass) return toast('Choose how important this is, or pass for now.');
      var j = i + dir;
      if (j < 0) return go('p-words');
      if (j >= ds.length) { r.domIdx = ds.length - 1; return go('p-predict'); }
      r.domIdx = j; save(); render(); window.scrollTo(0, 0);
    },
    predPick: function (id) {
      var p = R().predict, i = p.top.indexOf(id);
      if (i >= 0) p.top.splice(i, 1);
      else if (p.top.length < PREDICT_N) p.top.push(id);
      else return toast('You have picked ' + PREDICT_N + '. Tap one to remove it first.');
      save(); render();
    },
    predDom: function (arg) {
      var p = R().predict, kv = arg.split(':');
      if (p.domains[kv[0]] === +kv[1]) delete p.domains[kv[0]];
      else p.domains[kv[0]] = +kv[1];
      save(); render();
    },
    predConf: function (n) { R().predict.conf = +n; save(); render(); },
    predNext: function () {
      var p = R().predict, need = Math.min(PREDICT_N, cards().length);
      if (p.top.length < need) return toast('Pick ' + need + ' values.');
      if (!p.conf) return toast('Say how confident you are.');
      go('p-lock');
    },
    lock: function () {
      var r = R(); r.locked = true; r.lockedAt = new Date().toISOString(); r.stage = null;
      if (!both()) { state.turn = other(state.turn); go('handover'); }
      else { state.turn = null; go('reveal-intro'); }
    },
    round: function (n) {
      n = +n;
      if (n < 0) return go('reveal-intro');
      if (n >= ROUNDS.length) return go('results');
      state.reveal.round = n; state.reveal.prompt = 0; go('reveal');
    },
    nextPrompt: function () { state.reveal.prompt++; save(); render(); },
    toggleNums: function () { state.showNums = !state.showNums; save(); render(); },
    copySummary: function () { copy(summaryMd(), 'summaryText'); }
  };

  function newTrimSet() {
    var r = R();
    var cand = inPile(r, 'very').filter(function (id) { return r.protected.indexOf(id) < 0; });
    if (cand.length < 2) { r.protected = []; cand = inPile(r, 'very'); }
    state.trim = { set: shuffle(cand).slice(0, 4), best: null, worst: [] };
  }
  // Far over the cap: allow several "least" picks per set so trimming stays quick.
  function maxWorst() {
    var over = pileCount(R(), 'very') - VIP_CAP, n = state.trim ? state.trim.set.length : 4;
    return Math.max(1, Math.min(over >= 8 ? 3 : over >= 4 ? 2 : 1, n - 1, over));
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') return; // handled on change
    e.preventDefault();
    var fn = ACT[el.dataset.act];
    if (fn) fn(el.dataset.arg, el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.act && el.type === 'checkbox') { var fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.arg, el, e); return; }
    if (el.dataset.file) { readFile(el); el.value = ''; return; }
    bind(el);
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.type === 'checkbox' || el.tagName === 'SELECT') return;
    bind(el);
  });
  function bind(el) {
    var path = el.dataset.bind;
    if (!path) return;
    var val = el.type === 'checkbox' ? el.checked : el.value;
    if (path.indexOf('_cf.') === 0) { ui.cf[path.slice(4)] = val; return; }
    setPath(state, path, val);
    save();
  }

  // ---------- boot ----------
  function boot(hotData) {
    if (hotData && hotData.state && hotData.state.v === 1) {
      // The page was republished mid-session: carry on exactly where it was.
      state = normalise(hotData.state);
      if (!SCREENS[state.screen]) state.screen = 'welcome';
      render();
      return;
    }
    var saved = loadSaved();
    if (saved && saved.mode === 'shared' && saved.v === 1) {
      state = normalise(saved);
      ui.resumeTo = saved.screen; state.screen = 'resume';
    }
    render();
  }
  var hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(function () { return { state: state }; }); } catch (e) { /* optional */ }
  if (hot && hot.ready) hot.ready(boot); else boot(hot && hot.data);
})();
