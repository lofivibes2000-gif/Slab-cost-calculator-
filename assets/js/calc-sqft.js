/* ==========================================================================
   PourCost — cost per square foot explorer
   ========================================================================== */
(function () {
  "use strict";
  var A = window.PourCostApp, PC = window.PourCost;

  function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }

  function render() {
    var t = A.val("s-thickness", 4);
    var area = A.val("s-area", 400);
    var region = A.str("s-region", "national");
    var finish = A.str("s-finish", "broom");
    var reinf = A.str("s-reinf", "wire");
    var psi = A.val("s-psi", 3000);
    var waste = A.val("s-waste", 10);

    var reg = PC.REGIONS[region] || PC.REGIONS.national;
    var rmBand = PC.PRICES.readyMix[psi] || PC.PRICES.readyMix[3000];
    var rm = { low: rmBand.low * reg.readyMix, typ: rmBand.typ * reg.readyMix, high: rmBand.high * reg.readyMix };

    var labor = { low: PC.PRICES.labor.low * reg.labor, typ: PC.PRICES.labor.typ * reg.labor, high: PC.PRICES.labor.high * reg.labor };
    var finishBand = PC.PRICES.finish[finish] || PC.PRICES.finish.broom;
    var reinfKey = reinf || "none";
    var reinfBand = reinfKey === "none" ? { low: 0, typ: 0, high: 0 } : PC.PRICES[PC.REINFORCEMENT[reinfKey].rate];
    var prep = PC.PRICES.sitePrep;
    var base = PC.PRICES.gravelBase;
    var vb = PC.PRICES.vaporBarrier;
    var seal = PC.PRICES.cureSeal;

    // Per-square-foot components
    var ydPerSqFt = (t / 12) / 27;
    var concrete = { low: ydPerSqFt * rm.low, typ: ydPerSqFt * rm.typ, high: ydPerSqFt * rm.high };
    var formsPerSqFt = 2 * (Math.sqrt(area) + Math.sqrt(area)) / area * PC.PRICES.forms.typ; // approx for square
    var forms = { low: formsPerSqFt * 0.8, typ: formsPerSqFt, high: formsPerSqFt * 1.3 };

    var comps = [
      { label: "Ready-mix concrete", detail: A.num(rm.typ, 0) + "/yd³ at " + psi + " PSI", v: concrete, cls: "c1" },
      { label: "Delivery", detail: "amortized per load", v: { low: 0.10, typ: 0.22, high: 0.45 }, cls: "c2" },
      { label: "Site prep &amp; excavation", detail: "grading and compaction", v: prep, cls: "c2" },
      { label: "Gravel sub-base", detail: "4 in compacted stone", v: base, cls: "c3" },
      { label: "Forms", detail: "perimeter lumber and stakes", v: forms, cls: "c4" },
      { label: "Reinforcement", detail: PC.REINFORCEMENT[reinfKey] ? PC.REINFORCEMENT[reinfKey].label : "None", v: reinfBand, cls: "c3" },
      { label: "Vapor barrier", detail: "6 mil poly", v: vb, cls: "c4" },
      { label: "Placing &amp; finishing labor", detail: "form, pour, screed, finish", v: labor, cls: "c1" },
      { label: "Decorative finish", detail: finish === "broom" ? "standard broom" : finish, v: finishBand, cls: "c5" },
      { label: "Control joints &amp; curing", detail: "saw cuts, cure, sealer", v: { low: 0.35, typ: 0.62, high: 1.15 }, cls: "c4" }
    ];

    var totals = { low: 0, typ: 0, high: 0 };
    comps.forEach(function (c) { totals.low += c.v.low; totals.typ += c.v.typ; totals.high += c.v.high; });

    // Waste is already embedded in ready-mix sizing assumptions; surface it
    var wasteNote = waste;

    var wrap = document.getElementById("sqft-breakdown");
    if (wrap) {
      var max = 0;
      comps.forEach(function (c) { if (c.v.typ > max) max = c.v.typ; });
      wrap.innerHTML = comps.map(function (c) {
        var w = max > 0 ? (c.v.typ / max) * 100 : 0;
        return '<div class="bd-row">' +
          '<div class="bd-row__head"><span class="bd-row__label">' + c.label + ' <small>· ' + c.detail + '</small></span>' +
          '<span class="bd-row__val">' + A.money(c.v.typ, 2) + '</span></div>' +
          '<div class="bd-bar"><span class="' + c.cls + '" style="width:' + w.toFixed(1) + '%"></span></div>' +
        '</div>';
      }).join("");
    }

    set("sqft-typ", A.money(totals.typ, 2));
    set("sqft-low", A.money(totals.low, 2));
    set("sqft-high", A.money(totals.high, 2));
    set("sqft-project-total", A.money(totals.typ * area));
    set("sqft-total-low", A.money(totals.low * area));
    set("sqft-total-typ", A.money(totals.typ * area));
    set("sqft-total-high", A.money(totals.high * area));
    set("sqft-concrete-share", Math.round((concrete.typ / totals.typ) * 100) + "%");
    set("sqft-labor-share", Math.round((labor.typ / totals.typ) * 100) + "%");
    set("sqft-coverage", PC.coveragePerYard(t) + " sq ft/yd³");
    set("sqft-yards", A.num(area * (t / 12) / 27 * (1 + wasteNote / 100), 2) + " yd³");

    var v = document.getElementById("sqft-verdict");
    if (v) {
      var band = totals.typ < 6 ? "at the low end of the national range" :
                 totals.typ > 12 ? "above the national range" : "right in the middle of the national range";
      v.className = "verdict verdict--info";
      v.innerHTML = "At <b>" + A.money(totals.typ, 2) + " per square foot</b>, this slab sits <b>" + band +
        "</b> ($6–$12 per sq ft installed). Concrete is <b>" + Math.round((concrete.typ / totals.typ) * 100) +
        "%</b> of the price and labor is <b>" + Math.round((labor.typ / totals.typ) * 100) + "%</b>.";
    }
  }

  function init() {
    var form = document.getElementById("sqft-form");
    if (!form) return;
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    render();
  }

  window.PourCostPages = { init: init };
})();
