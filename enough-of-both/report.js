/* PDF report for Enough of Both (jsPDF, A4, vector).
 * Takes the plain model from app.js (reportModel) and returns a Blob.
 * Only sections whose `include` flag is ticked are drawn.
 * The built-in PDF fonts cover Western European letters only: emoji are
 * dropped and other letters become "?". */
(function (root) {
  var EB = root.EB = root.EB || {};
  var C = {
    ink: [43, 36, 32], muted: [117, 104, 94], line: [230, 220, 207], paper: [255, 253, 249], white: [255, 255, 255],
    a: [181, 83, 47], aSoft: [246, 227, 218], b: [44, 122, 123], bSoft: [220, 239, 238],
    sage: [111, 143, 95], sageSoft: [230, 238, 223], gold: [184, 138, 30], goldSoft: [251, 241, 214]
  };
  var PT = 0.3528;

  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"')
      .replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/•/g, '-').replace(/€/g, 'EUR')
      .replace(/[\uD800-\uDFFF︎️​-‍]/g, '').replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').trim();
  }

  function build(JsPDF, m) {
    var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var PW = 210, PH = 297, M = 18, W = PW - 2 * M, TOP = 18, BOTTOM = PH - 20, y = TOP;
    var who = { a: C.a, b: C.b }, soft = { a: C.aSoft, b: C.bSoft }, other = { a: 'b', b: 'a' };
    var N = { a: clean(m.names.a), b: clean(m.names.b) }, inc = m.include || {};
    doc.setProperties({ title: 'Enough of both: ' + N.a + ' and ' + N.b, subject: 'Enough of Both report', creator: 'Enough of Both' });

    function fill(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function stroke(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function font(fam, style, size, c) { doc.setFont(fam, style); doc.setFontSize(size); var k = c || C.ink; doc.setTextColor(k[0], k[1], k[2]); }
    function lh(size) { return size * PT * 1.42; }
    function base(size) { return size * PT * 1.05; }
    function need(h) { if (y + h > BOTTOM) { doc.addPage(); y = TOP; return true; } return false; }
    function wrapWords(text, w1, w) {
      var words = clean(text).split(' ').filter(Boolean), out = [], cur = '', lim = w1;
      words.forEach(function (wd) {
        var test = cur ? cur + ' ' + wd : wd;
        if (!cur || doc.getTextWidth(test) <= lim) cur = test; else { out.push(cur); cur = wd; lim = w; }
      });
      if (cur) out.push(cur);
      return out;
    }
    function section(title, intro) {
      need(26); y += 5;
      font('times', 'bold', 16); doc.text(clean(title), M, y + base(16)); y += 8;
      stroke(C.line); doc.setLineWidth(0.3); doc.line(M, y, M + W, y); y += 4;
      if (intro) para(intro, { size: 9.5, color: C.muted });
    }
    function sub(title, c) { need(14); y += 1.5; font('helvetica', 'bold', 10.5, c); doc.text(clean(title), M, y + base(10.5)); y += 6; }
    function label(text) { need(10); font('helvetica', 'bold', 7.5, C.muted); doc.text(clean(text).toUpperCase(), M, y + base(7.5)); y += 4.2; }
    function para(text, o) {
      o = o || {};
      var size = o.size || 10, ind = o.indent || 0;
      font(o.font || 'helvetica', o.style || 'normal', size, o.color);
      var ls = wrapWords(text, W - ind, W - ind), h = lh(size);
      ls.forEach(function (ln) { need(h); doc.text(ln, M + ind, y + base(size)); y += h; });
      y += o.after == null ? 1.6 : o.after;
    }
    function said(p, text, o) {
      o = o || {};
      var size = o.size || 9.5, ind = o.indent || 0, x = M + ind + 3.6, h = lh(size), pre = (o.prefix || N[p] + ':') + ' ';
      font('helvetica', 'bold', size); var nw = doc.getTextWidth(pre);
      font('helvetica', 'normal', size);
      var ls = wrapWords(text, W - ind - 3.6 - nw, W - ind - 3.6);
      if (!ls.length) ls = [''];
      ls.forEach(function (ln, i) {
        need(h);
        fill(who[p]); doc.rect(M + ind, y + 0.4, 0.9, h, 'F');
        if (i === 0) { font('helvetica', 'bold', size, who[p]); doc.text(clean(pre), x, y + base(size)); font('helvetica', 'normal', size, C.ink); doc.text(ln, x + nw, y + base(size)); }
        else { font('helvetica', 'normal', size, C.ink); doc.text(ln, x, y + base(size)); }
        y += h;
      });
      y += 1.4;
    }
    function bullet(text, o) {
      o = o || {};
      var size = o.size || 9.5, h = lh(size), ind = o.indent || 0;
      font('helvetica', o.style || 'normal', size, o.color);
      wrapWords(text, W - 5 - ind, W - 5 - ind).forEach(function (ln, i) {
        need(h);
        if (i === 0) { fill(o.dot || C.muted); doc.circle(M + ind + 1.3, y + h / 2, 0.7, 'F'); }
        doc.text(ln, M + ind + 5, y + base(size)); y += h;
      });
      y += 0.6;
    }
    function keyDots(x, yy, size) {
      ['a', 'b'].forEach(function (p) {
        fill(who[p]); doc.circle(x + 1.2, yy - size * PT * 0.33, 1.2, 'F');
        font('helvetica', 'bold', size, who[p]); doc.text(N[p], x + 3.6, yy);
        x += 3.6 + doc.getTextWidth(N[p]) + 6;
      });
      return x;
    }
    function box(text, f, bar) {
      font('helvetica', 'normal', 9.5);
      var ls = wrapWords(text, W - 9, W - 9), h = ls.length * lh(9.5) + 5;
      need(h + 2);
      fill(f); doc.rect(M, y, W, h, 'F'); fill(bar); doc.rect(M, y, 1.2, h, 'F');
      font('helvetica', 'normal', 9.5, C.ink);
      ls.forEach(function (ln, i) { doc.text(ln, M + 5, y + 2.5 + base(9.5) + i * lh(9.5)); });
      y += h + 2;
    }

    // ---------- header ----------
    font('times', 'bold', 24); doc.text('Enough of both', M, y + base(24)); y += 11;
    font('helvetica', 'normal', 11, C.muted); doc.text(N.a + ' and ' + N.b + ' · ' + clean(m.date), M, y + base(11)); y += 7;
    var kx = keyDots(M, y + 3, 9); font('helvetica', 'normal', 9, C.muted); doc.text('Colours used for each person throughout', kx, y + 3); y += 7;
    box('A structured conversation about security and novelty. It is a conversation guide, not therapy or an assessment, and it gives no scores. ' +
      'This report holds only the sections both of us agreed to include.', C.goldSoft, C.gold);
    if (inc.exp && m.reviewDate) {
      need(14);
      fill(C.sageSoft); doc.roundedRect(M, y, W, 11, 2, 2, 'F');
      font('helvetica', 'bold', 8, C.muted); doc.text('NEXT REVIEW', M + 4, y + 4.4);
      font('helvetica', 'bold', 11.5, C.ink); doc.text(clean(m.reviewDate), M + 4, y + 9);
      y += 14;
    }

    // ---------- experiments ----------
    function experiments() {
      section('Our experiments', 'Small, time-limited things to try, each with an if-then line and a review date. Framed as: how do we each get enough security and enough novelty?');
      if (!m.experiments.length) { para('No experiments agreed.', { size: 9.5, color: C.muted }); return; }
      m.experiments.forEach(function (e, i) {
        need(30);
        font('helvetica', 'bold', 11, C.ink); doc.text(clean((i + 1) + '. ' + e.title), M, y + base(11));
        var tw = doc.getTextWidth(clean((i + 1) + '. ' + e.title));
        font('helvetica', 'normal', 8, C.muted); doc.text(clean(e.kind + (e.status && e.status !== 'active' ? ' · ' + e.status : '')), M + tw + 3, y + base(11));
        y += 6.5;
        para(e.text, { size: 10 });
        para(e.ifThen, { size: 10, style: 'italic' });
        ['a', 'b'].forEach(function (p) {
          if (e.gives[p]) said(p, e.gives[p], { prefix: N[p] + ' gives:' });
          if (e.gets[p]) said(p, e.gets[p], { prefix: N[p] + ' gets:' });
        });
        para('From ' + (e.start || '-') + '. Review on ' + (e.review || '-') + '.', { size: 9.5, style: 'bold' });
        if (e.signals) para('We\'ll know it\'s working if ' + e.signals + '.', { size: 9.5, color: C.muted });
        y += 2;
      });
    }

    // ---------- map ----------
    function mapBlock() {
      section('Our map of core and flexible', 'Each circle holds one person\'s core needs (bold) and the places they have give (italic). The middle holds what we both need and both hold as core.');
      var size = 8.5, colW = 44, colX = { a: M + 12, both: M + 64, b: M + 118 };
      font('helvetica', 'bold', size);
      function layout(zn) {
        var out = [], h = 0;
        m.map[zn].forEach(function (it) {
          font('helvetica', it.kind === 'core' ? 'bold' : 'italic', size);
          var ls = wrapWords(it.text + (it.kind === 'flex' ? ' (flexible)' : ''), colW - 3.5, colW - 3.5);
          out.push({ it: it, lines: ls }); h += ls.length * lh(size) + 1.6;
        });
        return { items: out, h: h || lh(size) + 1.6 };
      }
      var L = { a: layout('a'), both: layout('both'), b: layout('b') };
      var Hc = Math.max(L.a.h, L.both.h, L.b.h) + 7, ry = Math.max(Hc * 0.8, 26), H = 2 * ry;
      need(H + 6);
      var cy = y + ry, rx = 57, cxA = M + 55, cxB = M + 119;
      doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.55 }));
      fill(C.aSoft); doc.ellipse(cxA, cy, rx, ry, 'F'); fill(C.bSoft); doc.ellipse(cxB, cy, rx, ry, 'F');
      doc.restoreGraphicsState();
      doc.setLineWidth(0.5); stroke(C.a); doc.ellipse(cxA, cy, rx, ry, 'S'); stroke(C.b); doc.ellipse(cxB, cy, rx, ry, 'S');
      var top = cy - Hc / 2;
      [['a', N.a, C.a], ['both', 'Both', C.sage], ['b', N.b, C.b]].forEach(function (z) {
        var zn = z[0], x = colX[zn], yy = top;
        font('helvetica', 'bold', 9, z[2]); doc.text(clean(z[1]), x, yy + base(9)); yy += 6;
        if (!m.map[zn].length) { font('helvetica', 'italic', size, C.muted); doc.text('Nothing here', x, yy + base(size)); return; }
        L[zn].items.forEach(function (r) {
          var core = r.it.kind === 'core', col = zn === 'both' ? C.sage : who[zn];
          if (core) { fill(col); doc.circle(x + 1, yy + lh(size) / 2, 0.9, 'F'); }
          else { stroke(col); doc.setLineWidth(0.3); doc.circle(x + 1, yy + lh(size) / 2, 0.9, 'S'); }
          font('helvetica', core ? 'bold' : 'italic', size, core ? C.ink : C.muted);
          r.lines.forEach(function (ln, i) { doc.text(ln, x + 3.5, yy + base(size) + i * lh(size)); });
          yy += r.lines.length * lh(size) + 1.6;
        });
      });
      y += H + 3;
      para(m.map.caption, { size: 8.5, color: C.muted, style: 'italic' });
    }

    // ---------- pattern ----------
    function patternBlock() {
      section('The loop we named');
      if (m.patternFilled) box(m.pattern, C.paper, C.muted); else para('Not written down.', { size: 9.5, color: C.muted });
      if (m.stressors.length) { label('Also going on'); m.stressors.forEach(function (s) { bullet(s); }); }
    }

    // ---------- offers ----------
    function offersBlock() {
      section('Offers, asks and support', 'Each of us wrote offers before asks. Asks are requests, not rules.');
      ['a', 'b'].forEach(function (p) {
        var O = m.offers[p];
        sub(N[p], who[p]);
        label('Offers'); if (O.offers.length) O.offers.forEach(function (x) { bullet(x, { dot: who[p] }); }); else para('None written.', { size: 9, color: C.muted });
        label('Asks'); if (O.asks.length) O.asks.forEach(function (x) { bullet(x, { dot: who[p] }); }); else para('None written.', { size: 9, color: C.muted });
        if (O.support.length) { label('Supporting ' + N[other[p]] + '\'s side'); O.support.forEach(function (s) { para(s.q.replace('…', ' ') + s.a, { size: 9.5 }); }); }
        y += 1;
      });
    }

    // ---------- cards ----------
    function cardsBlock() {
      section('How we each rated the cards', 'Need runs from 0 (not needed) to 4 (really need). Flexibility is core, some give, or very flexible. Each card leans towards security or novelty; most people need some of both.');
      var plotX = M + W - 62, plotW = 26, size = 8.8;
      m.domains.forEach(function (d) {
        sub(d.name);
        d.cards.forEach(function (c) {
          font('helvetica', 'normal', size);
          var ls = wrapWords(c.text + (c.pole ? ' (' + c.pole + ')' : ''), W - 68, W - 68);
          var notes = inc.notes ? ['a', 'b'].filter(function (p) { return c[p].note; }) : [];
          var h = Math.max(ls.length * lh(size), 9.5) + 1.5;
          need(h + notes.length * 6);
          var top = y;
          font('helvetica', 'normal', size, C.ink);
          ls.forEach(function (ln, i) { doc.text(ln, M, top + base(size) + i * lh(size)); });
          ['a', 'b'].forEach(function (p, ti) {
            var ty = top + 2.6 + ti * 4.6, v = c[p];
            for (var k = 0; k <= 4; k++) { fill(C.line); doc.circle(plotX + k * plotW / 4, ty, 0.75, 'F'); }
            if (v.need != null) { fill(who[p]); doc.circle(plotX + v.need * plotW / 4, ty, 1.45, 'F'); }
            font('helvetica', 'normal', 7.5, v.need == null ? C.muted : C.ink); doc.text(clean(v.flex || (v.need == null ? 'Passed' : '')), plotX + plotW + 4, ty + 1);
          });
          y = top + h;
          notes.forEach(function (p) { said(p, c[p].note, { size: 8.5 }); });
          stroke(C.line); doc.setLineWidth(0.15); doc.line(M, y - 0.6, M + W, y - 0.6);
          y += 0.8;
        });
      });
    }

    function exchangeBlock() {
      section('Our written notes and replies');
      ['a', 'b'].forEach(function (p) {
        sub(N[p] + '\'s note', who[p]);
        para(m.exchange.notes[p] || 'No note.', { size: 9.5 });
        label(N[other[p]] + '\'s reply');
        if (m.exchange.replies[other[p]]) said(other[p], m.exchange.replies[other[p]]); else para('No reply.', { size: 9, color: C.muted });
      });
    }

    function reviewsBlock() {
      section('Reviews');
      m.reviews.forEach(function (r) {
        sub('Review, ' + r.date);
        r.answers.forEach(function (a) { label(a.q); para(a.a, { size: 9.5 }); });
        if (r.decisions.length) { label('Keep, tweak or drop'); r.decisions.forEach(function (d) { bullet(d.title + ': ' + d.d + (d.note ? ' (' + d.note + ')' : '')); }); }
        if (r.help) para('Does anything need outside help? ' + ({ no: 'No', unsure: 'Not sure', yes: 'Yes' }[r.help] || r.help) + '.', { size: 9.5 });
      });
    }

    function contextBlock() {
      section('Context from the Values Deck', 'From our earlier Values Deck conversation' + (m.context.source ? ' (' + m.context.source + ')' : '') + '. Context only: these are not measures of this difference.');
      if (m.context.core.length) para('Shared core (Very important to both): ' + m.context.core.join(', ') + '.', { size: 9.5 });
      ['a', 'b'].forEach(function (p) { said(p, m.context.lean[p] + (m.context.top[p].length ? ' Top 7: ' + m.context.top[p].join(', ') + '.' : '')); });
      label('Life areas, importance 0 to 4');
      m.context.areas.forEach(function (a) {
        var side = function (n, v, ps) { return n + ' ' + (v == null ? '-' : v) + (ps ? ' (' + ps + ')' : ''); };
        bullet(a.name + ': ' + side(N.a, a.a, a.pa) + '; ' + side(N.b, a.b, a.pb), { size: 9 });
      });
    }

    function aboutBlock() {
      section('About this report');
      para('Enough of Both is a structured conversation aid. It is not therapy and not an assessment. It treats a difference in how much each of us leans towards security and towards novelty as something to keep talking about, with curiosity and small experiments, rather than a problem to settle once. Most of the evidence behind it comes from married, distressed, or US and European couples, and the combined protocol has not been tested.', { size: 9 });
      label('What each part draws on');
      m.methods.forEach(function (r) {
        font('helvetica', 'bold', 8.5); var lead = clean(r[0]) + '. ', lw = doc.getTextWidth(lead);
        font('helvetica', 'normal', 8.5);
        var ls = wrapWords(r[1] + ' Strength: ' + r[2].toLowerCase() + '.', W - lw, W);
        ls.forEach(function (ln, i) {
          need(lh(8.5));
          if (i === 0) { font('helvetica', 'bold', 8.5, C.ink); doc.text(lead, M, y + base(8.5)); font('helvetica', 'normal', 8.5); doc.text(ln, M + lw, y + base(8.5)); }
          else doc.text(ln, M, y + base(8.5));
          y += lh(8.5);
        });
        y += 1.2;
      });
      label('When to get help');
      m.help.when.forEach(function (w) { bullet(w, { size: 8.8 }); });
      m.help.services.forEach(function (s) { bullet(s.name + ' (' + s.what.toLowerCase() + '): ' + s.contact, { size: 8.8 }); });
      label('Sources');
      m.sources.forEach(function (s) { para(s, { size: 7.6, color: C.muted, after: 0.5 }); });
    }

    // ---------- assemble ----------
    if (inc.exp) experiments();
    if (inc.map) mapBlock();
    if (inc.pattern) patternBlock();
    if (inc.offers) offersBlock();
    if (inc.cards) cardsBlock();
    if (inc.exchange && m.exchange.used) exchangeBlock();
    if (inc.appr && (m.appr.a || m.appr.b)) { section('What we appreciated'); ['a', 'b'].forEach(function (p) { if (m.appr[p]) said(p, m.appr[p], { size: 10 }); }); }
    if (inc.understood && (m.understood.a || m.understood.b)) {
      section('How understood we felt', 'Each answered privately; only answers that person chose to share appear here.');
      ['a', 'b'].forEach(function (p) { if (m.understood[p]) said(p, m.understood[p]); });
    }
    if (inc.reviews && m.reviews.length) reviewsBlock();
    if (inc.context && m.context) contextBlock();
    aboutBlock();

    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      stroke(C.line); doc.setLineWidth(0.2); doc.line(M, PH - 14, M + W, PH - 14);
      font('helvetica', 'normal', 7.5, C.muted);
      doc.text('Enough of both · ' + N.a + ' and ' + N.b + ' · ' + clean(m.date) + ' · a conversation guide, not an assessment', M, PH - 10);
      doc.text('Page ' + i + ' of ' + n, M + W, PH - 10, { align: 'right' });
    }
    return doc.output('blob');
  }

  EB.buildReport = build;
})(typeof window !== 'undefined' ? window : globalThis);
