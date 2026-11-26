/* Scoring for the reveal. Pure functions; no DOM.
 *
 * Deliberately NOT computed: an overall compatibility percentage, "match"
 * labels, or any prediction of how the relationship will turn out. Research
 * does not link a values-overlap number at this stage to outcomes
 * (Montoya et al. 2008; Joel et al. 2020).
 */
(function (root) {
  var VD = root.VD = root.VD || {};
  var PILE_SCORE = { very: 2, imp: 1, less: 0 };
  var TOP_N = 7;

  function cardScore(resp, id) {
    var p = resp.piles[id];
    if (p == null || p === 'pass') return null;
    var s = PILE_SCORE[p];
    var r = resp.top.indexOf(id);
    if (r >= 0) s += (TOP_N + 1 - (r + 1)) * 0.25; // rank 1 = +1.75, rank 7 = +0.25
    return s;
  }

  // Pile used for ring placement: a top-ranked card counts as Very important.
  function effPile(resp, id) {
    if (resp.top.indexOf(id) >= 0) return 'very';
    return resp.piles[id] || null;
  }

  function rings(A, B, ids) {
    var out = { inner: [], middle: [], outer: [] };
    ids.forEach(function (id) {
      var a = effPile(A, id), b = effPile(B, id);
      if (!a || !b || a === 'pass' || b === 'pass') return;
      if (a === 'very' && b === 'very') out.inner.push(id);
      else if ((a === 'very' && b === 'imp') || (a === 'imp' && b === 'very')) out.middle.push(id);
      else if ((a === 'very' && b === 'less') || (a === 'less' && b === 'very')) out.outer.push(id);
    });
    return out;
  }

  function intersect(x, y) { return x.filter(function (i) { return y.indexOf(i) >= 0; }); }
  function minus(x, y) { return x.filter(function (i) { return y.indexOf(i) < 0; }); }

  function sharedTop(A, B) { return intersect(A.top, B.top); }

  function jaccardTop(A, B) {
    var inter = intersect(A.top, B.top).length;
    var union = A.top.length + B.top.length - inter;
    return union ? inter / union : null;
  }

  // How well X predicted Y's top values.
  function prediction(X, Y) {
    var guess = (X.predict && X.predict.top) || [];
    var hits = intersect(guess, Y.top);
    var surprises = minus(Y.top, guess);
    var misses = minus(guess, Y.top);
    var projections = intersect(misses, X.top);
    var domains = [];
    var pd = (X.predict && X.predict.domains) || {};
    Object.keys(pd).forEach(function (id) {
      var actual = Y.domains[id] && !Y.domains[id].pass ? Y.domains[id].imp : null;
      domains.push({ id: id, guess: pd[id], actual: actual });
    });
    return { hits: hits, surprises: surprises, misses: misses, projections: projections,
      domains: domains, n: guess.length, confidence: X.predict ? X.predict.conf : null };
  }

  function ranks(arr) { // average ranks for ties, 1-based
    var idx = arr.map(function (v, i) { return [v, i]; }).sort(function (a, b) { return a[0] - b[0]; });
    var r = new Array(arr.length);
    for (var i = 0; i < idx.length;) {
      var j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  }

  function pearson(x, y) {
    var n = x.length, mx = 0, my = 0;
    for (var i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my);
    }
    if (!sxx || !syy) return null;
    return sxy / Math.sqrt(sxx * syy);
  }

  function spearman(A, B, ids) {
    var xs = [], ys = [];
    ids.forEach(function (id) {
      var a = cardScore(A, id), b = cardScore(B, id);
      if (a != null && b != null) { xs.push(a); ys.push(b); }
    });
    if (xs.length < 3) return null;
    return { rho: pearson(ranks(xs), ranks(ys)), n: xs.length };
  }

  // Rank-biased overlap of the two ordered top lists, normalised so identical
  // lists score 1. p = 0.9 weights the top of each list most heavily.
  function rbo(a, b, p) {
    p = p || 0.9;
    var k = Math.max(a.length, b.length);
    if (!k) return null;
    var sum = 0, norm = 0;
    for (var d = 1; d <= k; d++) {
      var overlap = intersect(a.slice(0, d), b.slice(0, d)).length;
      sum += Math.pow(p, d - 1) * (overlap / d);
      norm += Math.pow(p, d - 1);
    }
    return sum / norm;
  }

  // Mean card score per higher-order group, centred on the person's own mean
  // across all scored cards (an analogue of PVQ-RR MRAT centring).
  function higherOrder(resp, cards) {
    var all = [], by = { OC: [], SE: [], CO: [], ST: [] };
    cards.forEach(function (c) {
      var s = cardScore(resp, c.id);
      if (s == null) return;
      all.push(s);
      if (c.ho && by[c.ho]) by[c.ho].push(s);
    });
    var mean = function (xs) { return xs.length ? xs.reduce(function (t, v) { return t + v; }, 0) / xs.length : null; };
    var m = mean(all);
    var out = {};
    Object.keys(by).forEach(function (k) {
      var v = mean(by[k]);
      out[k] = (v == null || m == null) ? null : v - m;
    });
    return out;
  }

  function domainCompare(A, B, domains) {
    var groups = { explore: [], different: [], aligned: [], low: [], passed: [] };
    domains.forEach(function (d) {
      var a = A.domains[d.id] || {}, b = B.domains[d.id] || {};
      var row = { id: d.id, a: a, b: b };
      if (a.pass || b.pass || a.imp == null || b.imp == null) { groups.passed.push(row); return; }
      if (a.imp <= 1 && b.imp <= 1) { groups.low.push(row); return; }
      var posDiffer = a.pos != null && b.pos != null && a.pos !== b.pos;
      var delta = Math.abs(a.imp - b.imp);
      row.delta = delta; row.posDiffer = posDiffer;
      if (a.imp >= 3 && b.imp >= 3 && posDiffer && (a.flex === 'firm' || b.flex === 'firm')) groups.explore.push(row);
      else if (posDiffer || delta >= 2) groups.different.push(row);
      else groups.aligned.push(row);
    });
    return groups;
  }

  // Top-ranked values of X that Y did not rate Very important.
  function distinct(X, Y) {
    return X.top.filter(function (id) { return effPile(Y, id) !== 'very'; });
  }

  VD.score = {
    TOP_N: TOP_N, cardScore: cardScore, effPile: effPile, rings: rings, sharedTop: sharedTop,
    jaccardTop: jaccardTop, prediction: prediction, spearman: spearman, rbo: rbo,
    higherOrder: higherOrder, domainCompare: domainCompare, distinct: distinct, ranks: ranks
  };
})(typeof window !== 'undefined' ? window : globalThis);
