/* ==========================================================================
   PourCost — driveway & patio project calculators (shared engine)
   ========================================================================== */
(function () {
  "use strict";
  var A = window.PourCostApp, PC = window.PourCost;

  function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }

  /* ---------------- Driveway ---------------- */
  function renderDriveway() {
    var l = A.val("d-length", 60), w = A.val("d-width", 12);
    var t = A.val("d-thickness", 5);
    var region = A.str("d-region", "national");
    var finish = A.str("d-finish", "broom");
    var waste = A.val("d-waste", 10);

    var res = PC.estimate({
      shape: "rect", length: l, width: w, thickness: t,
      region: region, psi: 4000, reinforcement: "rebar", finish: finish,
      wastePct: waste, includeBase: true, baseDepth: 6,
      includeSitePrep: true, includeSealer: true
    });

    set("d-area", A.num(res.areaSqFt, 0) + " sq ft");
    set("d-yards", A.num(res.orderCuYd, 2) + " yd³");
    set("d-bags", res.bags[80] + " bags");
    set("d-sqft-low", A.money(res.perSqFt.low, 2));
    set("d-sqft-typ", A.money(res.perSqFt.typ, 2));
    set("d-sqft-high", A.money(res.perSqFt.high, 2));
    set("d-total-low", A.money(res.totals.low));
    set("d-total-typ", A.money(res.totals.typ));
    set("d-total-high", A.money(res.totals.high));
    set("d-loads", res.loads + (res.loads > 1 ? " loads" : " load"));
    set("d-joints", res.joints.joints + " joints");
    set("d-coverage", res.coveragePerYard + " sq ft/yd³");

    var bd = document.getElementById("d-breakdown");
    if (bd) {
      var max = 0;
      res.lines.forEach(function (x) { if (x.typ > max) max = x.typ; });
      bd.innerHTML = res.lines.map(function (x) {
        var wpc = max > 0 ? (x.typ / max) * 100 : 0;
        return '<div class="bd-row"><div class="bd-row__head">' +
          '<span class="bd-row__label">' + x.label + ' <small>· ' + x.detail + '</small></span>' +
          '<span class="bd-row__val">' + A.money(x.typ) + '</span></div>' +
          '<div class="bd-bar"><span class="' + x.cls + '" style="width:' + wpc.toFixed(1) + '%"></span></div></div>';
      }).join("");
    }

    var v = document.getElementById("d-verdict");
    if (v) {
      v.className = "verdict verdict--info";
      v.innerHTML = "A <b>" + A.num(res.areaSqFt, 0) + " sq ft</b> driveway at <b>" + t + " inches</b> lands at <b>" +
        A.money(res.perSqFt.typ, 2) + " per sq ft</b> — total <b>" + A.money(res.totals.typ) + "</b>. " +
        "Range " + A.money(res.totals.low) + " to " + A.money(res.totals.high) + ". " +
        "Concrete needed: " + A.num(res.orderCuYd, 2) + " cubic yards, or " + res.loads +
        (res.loads > 1 ? " truck loads" : " truck load") + ".";
    }
  }

  /* ---------------- Patio ---------------- */
  function renderPatio() {
    var l = A.val("p-length", 20), w = A.val("p-width", 20);
    var t = A.val("p-thickness", 4);
    var region = A.str("p-region", "national");
    var finish = A.str("p-finish", "broom");
    var waste = A.val("p-waste", 10);
    var reinf = A.str("p-reinf", "wire");

    var res = PC.estimate({
      shape: "rect", length: l, width: w, thickness: t,
      region: region, psi: 3500, reinforcement: reinf, finish: finish,
      wastePct: waste, includeBase: true, baseDepth: 4,
      includeSitePrep: true, includeSealer: true
    });

    set("p-area", A.num(res.areaSqFt, 0) + " sq ft");
    set("p-yards", A.num(res.orderCuYd, 2) + " yd³");
    set("p-bags", res.bags[80] + " bags");
    set("p-sqft-low", A.money(res.perSqFt.low, 2));
    set("p-sqft-typ", A.money(res.perSqFt.typ, 2));
    set("p-sqft-high", A.money(res.perSqFt.high, 2));
    set("p-total-low", A.money(res.totals.low));
    set("p-total-typ", A.money(res.totals.typ));
    set("p-total-high", A.money(res.totals.high));
    set("p-loads", res.loads + (res.loads > 1 ? " loads" : " load"));

    var bd = document.getElementById("p-breakdown");
    if (bd) {
      var max = 0;
      res.lines.forEach(function (x) { if (x.typ > max) max = x.typ; });
      bd.innerHTML = res.lines.map(function (x) {
        var wpc = max > 0 ? (x.typ / max) * 100 : 0;
        return '<div class="bd-row"><div class="bd-row__head">' +
          '<span class="bd-row__label">' + x.label + ' <small>· ' + x.detail + '</small></span>' +
          '<span class="bd-row__val">' + A.money(x.typ) + '</span></div>' +
          '<div class="bd-bar"><span class="' + x.cls + '" style="width:' + wpc.toFixed(1) + '%"></span></div></div>';
      }).join("");
    }

    var v = document.getElementById("p-verdict");
    if (v) {
      v.className = "verdict verdict--info";
      v.innerHTML = "A <b>" + A.num(res.areaSqFt, 0) + " sq ft</b> patio at <b>" + t + " inches</b> lands at <b>" +
        A.money(res.perSqFt.typ, 2) + " per sq ft</b> — total <b>" + A.money(res.totals.typ) + "</b>. " +
        "Range " + A.money(res.totals.low) + " to " + A.money(res.totals.high) + ". " +
        "You need " + A.num(res.orderCuYd, 2) + " cubic yards of concrete, or " + res.bags[80] + " bags of 80 lb mix.";
    }
  }

  function init() {
    var df = document.getElementById("driveway-form");
    if (df) {
      df.addEventListener("input", renderDriveway);
      df.addEventListener("change", renderDriveway);
      renderDriveway();
    }
    var pf = document.getElementById("patio-form");
    if (pf) {
      pf.addEventListener("input", renderPatio);
      pf.addEventListener("change", renderPatio);
      renderPatio();
    }
  }

  window.PourCostPages = { init: init };
})();
