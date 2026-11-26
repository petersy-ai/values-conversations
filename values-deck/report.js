/* PDF report for the Values Deck.
 *
 * Draws an A4 report with jsPDF (vector text and charts). It takes a plain
 * data model built by app.js (reportModel) and returns a Blob. Only the
 * sections both people ticked are in the model's `include` flags.
 *
 * The built-in PDF fonts cover Western European letters only, so text is
 * cleaned to that range: emoji are dropped and other letters become "?".
 */
(function (root) {
  var VD = root.VD = root.VD || {};
  var C = {
    ink: [43, 36, 32], muted: [117, 104, 94], line: [230, 220, 207], paper: [255, 253, 249], white: [255, 255, 255],
    a: [181, 83, 47], aSoft: [246, 227, 218], b: [44, 122, 123], bSoft: [220, 239, 238],
    sage: [111, 143, 95], sageSoft: [230, 238, 223], gold: [184, 138, 30], goldSoft: [251, 241, 214]
  };
  var PT = 0.3528; // millimetres per point

  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’‚′]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .replace(/•/g, '-')
      .replace(/[\uD800-\uDFFF︎️​-‍]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
      .trim();
  }

  function build(JsPDF, m) {
    var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var PW = 210, PH = 297, M = 18, W = PW - 2 * M, TOP = 18, BOTTOM = PH - 20;
    var y = TOP;
    var who = { a: C.a, b: C.b }, other = { a: 'b', b: 'a' };
    var N = { a: clean(m.names.a), b: clean(m.names.b) };

    doc.setProperties({ title: 'Values conversation: ' + N.a + ' and ' + N.b, subject: 'Values Deck report', creator: 'Values Deck' });

    // ---------- primitives ----------
    function fill(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function stroke(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function font(fam, style, size, c) { doc.setFont(fam, style); doc.setFontSize(size); var k = c || C.ink; doc.setTextColor(k[0], k[1], k[2]); }
    function lh(size) { return size * PT * 1.42; }
    function base(size) { return size * PT * 1.05; }
    function need(h) { if (y + h > BOTTOM) { doc.addPage(); y = TOP; return true; } return false; }
    function dash(on) { doc.setLineDashPattern(on ? [1.1, 0.8] : [], 0); }

    // Greedy word wrap with a different width for the first line.
    function wrapWords(text, w1, w) {
      var words = clean(text).split(' ').filter(Boolean), out = [], cur = '', lim = w1;
      words.forEach(function (wd) {
        var test = cur ? cur + ' ' + wd : wd;
        if (!cur || doc.getTextWidth(test) <= lim) cur = test;
        else { out.push(cur); cur = wd; lim = w; }
      });
      if (cur) out.push(cur);
      return out;
    }

    function section(title, intro) {
      need(26);
      y += 5;
      font('times', 'bold', 16); doc.text(clean(title), M, y + base(16));
      y += 8;
      stroke(C.line); doc.setLineWidth(0.3); doc.line(M, y, M + W, y);
      y += 4;
      if (intro) para(intro, { size: 9.5, color: C.muted });
    }
    function sub(title, c) {
      need(14);
      y += 1.5;
      font('helvetica', 'bold', 10.5, c); doc.text(clean(title), M, y + base(10.5));
      y += 6;
    }
    function label(text) {
      need(10);
      font('helvetica', 'bold', 7.5, C.muted); doc.text(clean(text).toUpperCase(), M, y + base(7.5));
      y += 4.2;
    }
    function para(text, o) {
      o = o || {};
      var size = o.size || 10, ind = o.indent || 0;
      font(o.font || 'helvetica', o.style || 'normal', size, o.color);
      var ls = wrapWords(text, W - ind, W - ind), h = lh(size);
      ls.forEach(function (ln) { need(h); doc.text(ln, M + ind, y + base(size)); y += h; });
      y += o.after == null ? 1.6 : o.after;
    }
    // A person's words, with a bar in their colour and their name in bold.
    function said(p, text, o) {
      o = o || {};
      var size = o.size || 9.5, ind = (o.indent || 0), x = M + ind + 3.6, h = lh(size);
      font('helvetica', 'bold', size);
      var name = N[p] + ': ', nw = doc.getTextWidth(name);
      font('helvetica', o.style || 'normal', size);
      var ls = wrapWords(text, W - ind - 3.6 - nw, W - ind - 3.6);
      ls.forEach(function (ln, i) {
        need(h);
        fill(who[p]); doc.rect(M + ind, y + 0.4, 0.9, h, 'F');
        if (i === 0) {
          font('helvetica', 'bold', size, who[p]); doc.text(name, x, y + base(size));
          font('helvetica', o.style || 'normal', size); doc.text(ln, x + nw, y + base(size));
        } else doc.text(ln, x, y + base(size));
        y += h;
      });
      y += 1.4;
    }
    function bullet(text, o) {
      o = o || {};
      var size = o.size || 9.5, h = lh(size);
      font('helvetica', 'normal', size, o.color);
      var ls = wrapWords(text, W - 5, W - 5);
      ls.forEach(function (ln, i) {
        need(h);
        if (i === 0) { fill(o.dot || C.muted); doc.circle(M + 1.3, y + h / 2, 0.7, 'F'); }
        doc.text(ln, M + 5, y + base(size));
        y += h;
      });
      y += 0.6;
    }

    // ---------- chips ----------
    function chipLayout(items, width, size) {
      font('helvetica', 'normal', size);
      var h = size * PT + 3.2, gap = 1.8, x = 0, row = 0, pos = [];
      items.forEach(function (it) {
        var w = doc.getTextWidth(clean(it.text)) + 5 + (it.dots || []).length * 2.4;
        if (x > 0 && x + w > width) { row++; x = 0; }
        pos.push({ x: x, row: row, w: w });
        x += w + gap;
      });
      return { pos: pos, h: h, gap: gap, size: size, height: items.length ? (row + 1) * h + row * gap : 0 };
    }
    function chipDraw(items, L, x0, y0) {
      items.forEach(function (it, i) {
        var p = L.pos[i], x = x0 + p.x, yy = y0 + p.row * (L.h + L.gap);
        fill(it.fill || C.white); stroke(it.stroke || C.line); doc.setLineWidth(0.3);
        dash(!!it.dash);
        doc.roundedRect(x, yy, p.w, L.h, L.h / 2, L.h / 2, 'FD');
        dash(false);
        var tx = x + 2.5;
        (it.dots || []).forEach(function (d) { fill(d); doc.circle(tx + 0.9, yy + L.h / 2, 0.95, 'F'); tx += 2.4; });
        font('helvetica', 'normal', L.size); doc.text(clean(it.text), tx, yy + L.h / 2 + L.size * PT * 0.36);
      });
    }
    function chips(items, o) {
      o = o || {};
      if (!items.length) { para(o.none || 'None', { size: 9, color: C.muted }); return; }
      var L = chipLayout(items, W, o.size || 9);
      need(L.height + 2);
      chipDraw(items, L, M, y);
      y += L.height + 3;
    }
    function keyDots(x, yy, size) {
      ['a', 'b'].forEach(function (p) {
        fill(who[p]); doc.circle(x + 1.2, yy - size * PT * 0.33, 1.2, 'F');
        font('helvetica', 'bold', size, who[p]); doc.text(N[p], x + 3.6, yy);
        x += 3.6 + doc.getTextWidth(N[p]) + 6;
      });
      return x;
    }

    // ---------- header ----------
    font('times', 'bold', 24); doc.text('Values conversation', M, y + base(24));
    y += 11;
    font('helvetica', 'normal', 11, C.muted); doc.text(N.a + ' and ' + N.b + ' \u00b7 ' + clean(m.date), M, y + base(11));
    y += 7;
    var kx = keyDots(M, y + 3, 9);
    font('helvetica', 'normal', 9, C.muted); doc.text('Colours used for each person throughout', kx, y + 3);
    y += 7;
    (function notice() {
      var nt = 'A self-guided values conversation using value cards from the Personal Values Card Sort (Miller et al. 2001) and life-area cards. ' +
        'It is not a clinical or validated assessment, and it gives no compatibility score. ' +
        'This report holds only the sections both of us agreed to include.';
      font('helvetica', 'normal', 9.5);
      var ls = wrapWords(nt, W - 9, W - 9), nh = ls.length * lh(9.5) + 5;
      fill(C.goldSoft); doc.rect(M, y, W, nh, 'F');
      fill(C.gold); doc.rect(M, y, 1.2, nh, 'F');
      font('helvetica', 'normal', 9.5, C.ink);
      ls.forEach(function (ln, i) { doc.text(ln, M + 5, y + 2.5 + base(9.5) + i * lh(9.5)); });
      y += nh + 2;
    })();

    var inc = m.include || {};

    // ---------- where our values sit ----------
    function ringsBlock() {
      section('Where our values sit', 'Each value either of us rated Very important, placed by how the other person rated it. A dot shows whose Very important pile the value is in; values in a top ' + m.topN + ' count as Very important.');
      var R = m.rings, P = 4, IN = 5, LAB = 6;
      function items(list) { return list.map(function (v) { return { text: v.name, dots: v.who.map(function (p) { return who[p]; }) }; }); }
      var iO = items(R.outer), iM = items(R.middle), iI = items(R.inner);
      var LO = chipLayout(iO, W - 2 * P, 9), LM = chipLayout(iM, W - 2 * IN - 2 * P, 9), LI = chipLayout(iI, W - 4 * IN - 2 * P, 9);
      function bodyH(L, list) { return list.length ? L.height : 4.5; }
      var hI = P + LAB + bodyH(LI, iI) + P;
      var hM = P + LAB + bodyH(LM, iM) + 3 + hI + IN;
      var hO = P + LAB + bodyH(LO, iO) + 3 + hM + IN;
      need(hO + 4);
      function box(x, yy, w, h, f, s, isDash, text, L, list) {
        fill(f); stroke(s); doc.setLineWidth(0.4); dash(isDash);
        doc.roundedRect(x, yy, w, h, 4, 4, 'FD'); dash(false);
        font('helvetica', 'bold', 7.5, C.muted); doc.text(text.toUpperCase(), x + P, yy + P + 2.6);
        var by = yy + P + LAB;
        if (list.length) chipDraw(list, L, x + P, by);
        else { font('helvetica', 'normal', 9, C.muted); doc.text('None', x + P, by + 3.2); }
        return by + bodyH(L, list) + 3;
      }
      var y1 = box(M, y, W, hO, C.goldSoft, C.gold, true, 'Explore: Very important to one, less important to the other', LO, iO);
      var y2 = box(M + IN, y1, W - 2 * IN, hM, C.paper, C.line, false, 'Near: Very important to one, important to the other', LM, iM);
      box(M + 2 * IN, y2, W - 4 * IN, hI, C.sageSoft, C.sage, false, 'Shared core: Very important to both', LI, iI);
      y += hO + 3;
    }

    // ---------- top values ----------
    function topsBlock() {
      section('Our top ' + m.topN + ' values', 'Each of us ranked our most important values, most important first. Shaded values are in both lists.');
      var colW = (W - 8) / 2, rowH = 6.4, n = Math.max(m.tops.a.length, m.tops.b.length, 1);
      need(8 + n * rowH + 2);
      ['a', 'b'].forEach(function (p, ci) {
        var x = M + ci * (colW + 8), yy = y;
        fill(who[p]); doc.rect(x, yy, colW, 0.9, 'F');
        font('helvetica', 'bold', 10.5, who[p]); doc.text(N[p], x, yy + 6);
        yy += 8.5;
        if (!m.tops[p].length) { font('helvetica', 'normal', 9.5, C.muted); doc.text('No values ranked', x, yy + 4.2); }
        m.tops[p].forEach(function (v, i) {
          if (v.shared) { fill(C.sageSoft); doc.roundedRect(x, yy, colW, rowH - 0.9, 1.4, 1.4, 'F'); }
          font('times', 'bold', 11, C.muted); doc.text(String(i + 1), x + 2, yy + 4.2);
          font('helvetica', v.shared ? 'bold' : 'normal', 10); doc.text(clean(v.name), x + 8, yy + 4.2);
          yy += rowH;
        });
      });
      y += 8.5 + n * rowH + 2;
    }

    // ---------- shared values ----------
    function sharedBlock() {
      section('Values we share', 'Values in both of our top ' + m.topN + (inc.words ? ', with what each looks like for us in an ordinary week.' : '.'));
      if (!m.shared.length) { para('No exact overlap in our top ' + m.topN + ' values.', { size: 9.5, color: C.muted }); return; }
      m.shared.forEach(function (v) {
        need(14);
        font('helvetica', 'bold', 10.5); var nm = clean(v.name); doc.text(nm, M, y + base(10.5));
        var nw = doc.getTextWidth(nm) + 2.5;
        font('helvetica', 'normal', 9.5, C.muted);
        var def = clean(v.def);
        if (def && nw + doc.getTextWidth(def) <= W) { doc.text(def, M + nw, y + base(10.5)); y += 6.2; }
        else { y += 5.6; if (def) para(def, { size: 9.5, color: C.muted, after: 0.6 }); }
        if (inc.words) {
          var any = false;
          ['a', 'b'].forEach(function (p) {
            var w = v.words[p];
            if (w && w.tue) { any = true; said(p, w.tue + (w.origin ? ' (from: ' + w.origin + ')' : '')); }
          });
          if (!any) para('No description written.', { size: 9, color: C.muted });
        }
        y += 1.5;
      });
    }

    // ---------- distinct ----------
    function distinctBlock() {
      section('What matters more to each of us', 'Values in one person\'s top ' + m.topN + ' that the other did not rate Very important, with how the other person rated them.');
      ['a', 'b'].forEach(function (p) {
        sub('Matters more to ' + N[p], who[p]);
        if (!m.distinct[p].length) { para('Nothing here: ' + N[other[p]] + ' rated all of these Very important.', { size: 9.5, color: C.muted }); return; }
        m.distinct[p].forEach(function (v) { bullet(v.name + ' (' + N[other[p]] + ': ' + v.other + ')', { dot: who[p] }); });
        y += 1;
      });
    }

    // ---------- values circle ----------
    function circleBlock() {
      section('The values circle', 'Schwartz\'s theory arranges values in a circle of four broad groups; neighbouring groups sit easily together and opposite ones pull against each other. Each shape shows where one person leans, relative to their own average.');
      var R = 30;
      need(2 * R + 24);
      var cx = M + W / 2, cy = y + 8 + R, lo = -1.5, hi = 1.5;
      var ang = { OC: -90, SE: 0, CO: 90, ST: 180 }, order = ['OC', 'SE', 'CO', 'ST'];
      function pt(k, v) {
        var r = R * (Math.max(lo, Math.min(hi, v == null ? 0 : v)) - lo) / (hi - lo), a = ang[k] * Math.PI / 180;
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      }
      stroke(C.line); doc.setLineWidth(0.35); doc.circle(cx, cy, R, 'S');
      order.forEach(function (k) { var e = pt(k, hi); doc.line(cx, cy, e[0], e[1]); });
      stroke(C.muted); doc.setLineWidth(0.3); dash(true); doc.circle(cx, cy, R / 2, 'S'); dash(false);
      font('helvetica', 'bold', 8.5, C.muted);
      doc.text(clean(m.circle.labels.OC), cx, cy - R - 2.5, { align: 'center' });
      doc.text(clean(m.circle.labels.CO), cx, cy + R + 5, { align: 'center' });
      doc.text(clean(m.circle.labels.SE), cx + R + 2.5, cy + 1.2);
      doc.text(clean(m.circle.labels.ST), cx - R - 2.5, cy + 1.2, { align: 'right' });
      function poly(vals, col) {
        var ps = order.map(function (k) { return pt(k, vals[k]); }), d = [];
        for (var i = 1; i < ps.length; i++) d.push([ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]]);
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.16 }));
        fill(col); doc.lines(d, ps[0][0], ps[0][1], [1, 1], 'F', true);
        doc.restoreGraphicsState();
        stroke(col); doc.setLineWidth(0.7); doc.lines(d, ps[0][0], ps[0][1], [1, 1], 'S', true);
        ps.forEach(function (q) { fill(col); doc.circle(q[0], q[1], 0.8, 'F'); });
      }
      poly(m.circle.a, C.a); poly(m.circle.b, C.b);
      y = cy + R + 10;
      // legend
      font('helvetica', 'normal', 8.5, C.muted);
      var leg = 'dashed ring = each person\'s own average';
      var lw = 3.6 + doc.getTextWidth(N.a) + 6 + 3.6 + doc.getTextWidth(N.b) + 6 + doc.getTextWidth(leg);
      var lx = keyDots(M + (W - lw) / 2, y, 8.5);
      font('helvetica', 'normal', 8.5, C.muted); doc.text(leg, lx, y);
      y += 6;
      // group descriptions in two columns
      var colW = (W - 8) / 2;
      for (var r = 0; r < m.circle.groups.length; r += 2) {
        var hs = [0, 0];
        [r, r + 1].forEach(function (gi, ci) {
          var g = m.circle.groups[gi]; if (!g) return;
          font('helvetica', 'normal', 9); hs[ci] = 4.6 + wrapWords(g.desc, colW, colW).length * lh(9);
        });
        need(Math.max(hs[0], hs[1]) + 1);
        [r, r + 1].forEach(function (gi, ci) {
          var g = m.circle.groups[gi]; if (!g) return;
          var x = M + ci * (colW + 8);
          font('helvetica', 'bold', 9.5); doc.text(clean(g.name), x, y + base(9.5));
          font('helvetica', 'normal', 9, C.muted);
          wrapWords(g.desc, colW, colW).forEach(function (ln, i) { doc.text(ln, x, y + 4.6 + base(9) + i * lh(9)); });
        });
        y += Math.max(hs[0], hs[1]) + 2;
      }
      para('These cards are not a validated Schwartz measure. The shape is a talking point only.', { size: 8.5, color: C.muted, style: 'italic' });
    }

    // ---------- life areas ----------
    var DGROUPS = [
      { key: 'aligned', title: 'Lined up', hint: '' },
      { key: 'different', title: 'Different, with some give', hint: 'Different positions, or importance two or more points apart, and neither of us is firm on both.' },
      { key: 'explore', title: 'Keep exploring', hint: 'Both of us rate these 3 or more, our positions differ, and at least one of us feels firm.' },
      { key: 'low', title: 'Low importance for both', hint: '' },
      { key: 'passed', title: 'Passed for now', hint: '' }
    ];
    function detail(v) {
      if (v.pass) return 'Passed for now';
      if (v.imp == null) return 'Not answered';
      var parts = [v.impLabel + ' (' + v.imp + ')'];
      if (v.pos) parts.push(v.pos);
      if (v.flex) parts.push(v.flex.toLowerCase());
      return parts.join(' \u00b7 ') + (v.note ? ' \u00b7 "' + v.note + '"' : '');
    }
    function domainRow(row) {
      var plotW = 50, gapW = 8, leftW = W - plotW - gapW, plotX = M + leftW + gapW, size = 9;
      font('helvetica', 'bold', size); var nwA = doc.getTextWidth(N.a + ': '), nwB = doc.getTextWidth(N.b + ': ');
      font('helvetica', 'normal', size);
      var la = wrapWords(detail(row.a), leftW - 3.6 - nwA, leftW - 3.6), lb = wrapWords(detail(row.b), leftW - 3.6 - nwB, leftW - 3.6);
      var textH = 6 + (la.length + lb.length) * lh(size) + 1.5;
      var h = Math.max(textH, 17);
      need(h + 2);
      var top = y;
      font('helvetica', 'bold', 10); doc.text(clean(row.name), M, y + base(10));
      if (row.flagged.length) {
        var tag = row.flagged.map(function (p) { return N[p]; }).join(' and ') + ' flagged this', nx = M + doc.getTextWidth(clean(row.name)) + 3;
        font('helvetica', 'bold', 7); var tw = doc.getTextWidth(tag) + 4;
        fill(C.goldSoft); doc.roundedRect(nx, y + 0.4, tw, 4.2, 2.1, 2.1, 'F');
        font('helvetica', 'bold', 7, C.ink); doc.text(tag, nx + 2, y + 3.4);
      }
      var yy = y + 6;
      [['a', la], ['b', lb]].forEach(function (pair) {
        var p = pair[0], nw = p === 'a' ? nwA : nwB;
        pair[1].forEach(function (ln, i) {
          fill(who[p]); doc.rect(M, yy + 0.4, 0.9, lh(size), 'F');
          if (i === 0) { font('helvetica', 'bold', size, who[p]); doc.text(N[p] + ':', M + 3.6, yy + base(size)); font('helvetica', 'normal', size); doc.text(ln, M + 3.6 + nw, yy + base(size)); }
          else { font('helvetica', 'normal', size); doc.text(ln, M + 3.6, yy + base(size)); }
          yy += lh(size);
        });
      });
      // importance dot plot: one track per person, 0 to 4
      ['a', 'b'].forEach(function (p, ti) {
        var ty = top + 4 + ti * 5;
        stroke(C.line); doc.setLineWidth(0.5); doc.line(plotX, ty, plotX + plotW, ty);
        for (var k = 0; k <= 4; k++) { doc.setLineWidth(0.3); doc.line(plotX + k * plotW / 4, ty - 0.9, plotX + k * plotW / 4, ty + 0.9); }
        var v = row[p];
        if (!v.pass && v.imp != null) { fill(who[p]); doc.circle(plotX + v.imp * plotW / 4, ty, 1.5, 'F'); }
      });
      font('helvetica', 'normal', 7, C.muted);
      for (var k = 0; k <= 4; k++) doc.text(String(k), plotX + k * plotW / 4, top + 4 + 5 + 4.6, { align: 'center' });
      y = top + h;
      stroke(C.line); doc.setLineWidth(0.2); doc.line(M, y, M + W, y);
      y += 2.5;
    }
    function domainsBlock(onlyExplore) {
      section(onlyExplore ? 'Life areas to keep exploring' : 'Life areas',
        'Each of us rated how important each area is, from 0 (not important) to 4 (essential), where we stand, and how flexible we feel (firm, some room, or open). ' +
        'The dots on the right show importance for each of us.');
      var any = false;
      DGROUPS.forEach(function (g) {
        if (onlyExplore && g.key !== 'explore') return;
        var rows = m.domains.filter(function (r) { return r.group === g.key; });
        if (!rows.length) return;
        any = true;
        need(34);
        sub(g.title);
        if (g.hint) para(g.hint, { size: 8.5, color: C.muted, after: 1 });
        rows.forEach(domainRow);
        y += 1;
      });
      if (!any) para(onlyExplore ? 'No life areas in this group.' : 'No life areas answered.', { size: 9.5, color: C.muted });
    }

    // ---------- predictions ----------
    function predictBlock() {
      section('How well we predicted each other', 'Before the reveal, each of us guessed five of the other\'s top ' + m.topN + ' values and how important a few life areas are to them.');
      ['a', 'b'].forEach(function (x) {
        var pr = m.predict[x], yk = other[x];
        sub(N[x] + '\'s guesses about ' + N[yk], who[x]);
        para(pr.hits.length + ' of ' + pr.n + ' guesses were in ' + N[yk] + '\'s top ' + m.topN + (pr.conf ? '. Confidence before the reveal: ' + pr.conf + ' out of 5.' : '.'), { size: 9.5 });
        label('Knew it'); chips(pr.hits.map(function (n) { return { text: n, fill: C.sageSoft, stroke: C.sage }; }));
        label('Surprises: in ' + N[yk] + '\'s top ' + m.topN + ', not guessed'); chips(pr.surprises.map(function (n) { return { text: n, fill: C.goldSoft, stroke: C.gold }; }));
        label('Projections: guessed for ' + N[yk] + ', but in ' + N[x] + '\'s own top ' + m.topN + ' instead'); chips(pr.projections.map(function (n) { return { text: n, dash: true }; }));
        if (pr.domains.length) {
          label('Life areas');
          pr.domains.forEach(function (d) { bullet(d.name + ': guessed ' + d.guess + ', actual ' + (d.actual == null ? 'passed' : d.actual), { size: 9 }); });
        }
        y += 1.5;
      });
      para('Projection, seeing your own values in your partner, is the most common pattern in research on how partners perceive each other (Kenny and Acitelli 2001). It is a normal bias, not a failing.', { size: 8.5, color: C.muted, style: 'italic' });
    }

    // ---------- close ----------
    function revisitBlock() {
      section('To come back to');
      if (!m.revisit.length) { para('Nothing chosen.', { size: 9.5, color: C.muted }); return; }
      m.revisit.forEach(function (r) { bullet(r.label + ': ' + r.when.toLowerCase()); });
    }
    function apprBlock() {
      section('What we appreciated hearing');
      ['a', 'b'].forEach(function (p) { if (m.appr[p]) said(p, m.appr[p], { size: 10 }); });
    }
    function feelBlock() {
      section('How the conversation felt');
      para(m.feel, { size: 10 });
    }

    function aboutBlock() {
      section('About this report');
      var topN = m.topN;
      [
        'Value cards. Each of us privately sorted value cards into Very important, Important and Less important right now, then ranked a top ' + topN + '. The cards use the wording of the Personal Values Card Sort (Miller, C\'de Baca, Matthews and Wilbourne 2001), which is in the public domain.',
        'Where our values sit. Shared core: both rated it Very important. Near: Very important to one, Important to the other. Explore: Very important to one, Less important right now to the other. A value in a top ' + topN + ' counts as Very important.',
        'The values circle. Each card is mapped to one of the four higher-order groups in Schwartz\'s refined theory of basic values (Schwartz et al. 2012). Each person\'s score for a group is their mean card score in that group, centred on their own mean across all cards. The mapping is the app\'s own; the cards are not a validated Schwartz measure.',
        'Life areas. Each of us rated importance (0 to 4), chose a position, and said how flexible we feel. Keep exploring means both rated it 3 or more, positions differ, and at least one of us is firm. The areas follow the content of premarital inventories (PREPARE/ENRICH, FOCCUS, RELATE); no items from those instruments are used.',
        'Predictions. Hits are guesses in the other person\'s top ' + topN + '. Surprises are values in the other person\'s top ' + topN + ' that were not guessed. Projections are wrong guesses that are in the guesser\'s own top ' + topN + '.',
        'No compatibility score. Measured values similarity has small and inconsistent links with relationship satisfaction (Luo and Klohnen 2005; Gaunt 2006; Leikas et al. 2018). Perceived similarity and feeling understood matter more (Montoya et al. 2008; Murray et al. 2002), and relationship processes predict relationship quality far better than profile matches (Joel et al. 2020).'
      ].forEach(function (t) {
        // Bold lead-in ("Value cards."), then the rest on the same line.
        var cut = t.indexOf('. '), lead = t.slice(0, cut + 1), rest = t.slice(cut + 2), size = 9, h = lh(size);
        font('helvetica', 'bold', size); var lw = doc.getTextWidth(lead + ' ');
        font('helvetica', 'normal', size);
        wrapWords(rest, W - lw, W).forEach(function (ln, i) {
          need(h);
          if (i === 0) { font('helvetica', 'bold', size); doc.text(lead, M, y + base(size)); font('helvetica', 'normal', size); doc.text(ln, M + lw, y + base(size)); }
          else doc.text(ln, M, y + base(size));
          y += h;
        });
        y += 1.8;
      });
      if (m.sources && m.sources.length) {
        label('Sources');
        m.sources.forEach(function (s) { para(s, { size: 7.8, color: C.muted, after: 0.6 }); });
      }
    }

    // ---------- assemble ----------
    if (m.ready) {
      if (inc.rings) ringsBlock();
      if (inc.top) topsBlock();
      if (inc.shared) sharedBlock();
      if (inc.distinct) distinctBlock();
      if (inc.circle) circleBlock();
      if (inc.domains) domainsBlock(false);
      else if (inc.explore) domainsBlock(true);
      if (inc.predict) predictBlock();
    }
    if (inc.revisit) revisitBlock();
    if (inc.appr && (m.appr.a || m.appr.b)) apprBlock();
    if (inc.feel && m.feel) feelBlock();
    aboutBlock();

    // footer on every page
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      stroke(C.line); doc.setLineWidth(0.2); doc.line(M, PH - 14, M + W, PH - 14);
      font('helvetica', 'normal', 7.5, C.muted);
      doc.text('Values conversation \u00b7 ' + N.a + ' and ' + N.b + ' \u00b7 ' + clean(m.date) + ' \u00b7 not a clinical assessment', M, PH - 10);
      doc.text('Page ' + i + ' of ' + n, M + W, PH - 10, { align: 'right' });
    }
    return doc.output('blob');
  }

  VD.buildReport = build;
  VD.cleanPdfText = clean;
})(typeof window !== 'undefined' ? window : globalThis);
