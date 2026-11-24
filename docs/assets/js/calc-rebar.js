/* ==========================================================================
   PourCost — rebar calculator
   ========================================================================== */
(function () {
  "use strict";
  var A = window.PourCostApp, PC = window.PourCost;

  function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }

  // Bar sizes: diameter, weight per linear foot, standard bend
  var BARS = {
    3: { label: "#3 (3/8 in)", ftPerLb: 0.667, pricePerFt: 0.85 },
    4: { label: "#4 (1/2 in)", ftPerLb: 0.850, pricePerFt: 1.05 },
    5: { label: "#5 (5/8 in)", ftPerLb: 1.043, pricePerFt: 1.28 },
    6: { label: "#6 (3/4 in)", ftPerLb: 1.248, pricePerFt: 1.55 },
    8: { label: "#8 (1 in)", ftPerLb: 1.670, pricePerFt: 2.35 }
  };

  function render() {
    var l = A.val("r-length", 20), w = A.val("r-width", 20);
    var spacing = A.val("r-spacing", 18);   // inches on center
    var barSize = A.val("r-barsize", 4);
    var embed = A.val("r-embed", 6);         // inches of embedment each end
    var bothWays = A.checked("r-bothways");
    var wastePct = A.val("r-waste", 5);
    var bar = BARS[barSize] || BARS[4];

    var spacingFt = spacing / 12;
    var embedFt = embed / 12;

    // Bars running along the width, spaced along the length
    var barsLong = Math.ceil(l / spacingFt) + 1;
    var lenLong = w + embedFt * 2;
    var ftLong = barsLong * lenLong;

    // Bars running along the length, spaced along the width
    var barsShort = Math.ceil(w / spacingFt) + 1;
    var lenShort = l + embedFt * 2;
    var ftShort = barsShort * lenShort;

    var ftOneWay = ftLong;
    var ftTotal = bothWays ? ftLong + ftShort : ftLong;
    var pieces = bothWays ? barsLong + barsShort : barsLong;

    // Tie wire: ~5 lbs per 100 ties
    var ties = bothWays ? barsLong * barsShort : barsLong;
    var tieWireLb = Math.max(1, Math.round((ties * 5) / 100));

    // Chairs / dobies: 1 per 4 ft² of slab
    var chairs = Math.max(1, Math.round((l * w) / 4));

    var waste = 1 + wastePct / 100;
    var ftWithWaste = ftTotal * waste;
    var materialCost = ftWithWaste * bar.pricePerFt;
    var chairsCost = chairs * 0.85;   // ~$0.85 per chair
    var tieCost = tieWireLb * 3.20;
    var totalMaterial = materialCost + chairsCost + tieCost;

    // Installed cost view: rebar typically runs $0.70–$2.00/sq ft
    var area = l * w;
    var installedLow = area * 0.70, installedHigh = area * 2.00;

    set("r-area", A.num(area, 0) + " sq ft");
    set("r-pieces", pieces + " bars");
    set("r-ft", A.num(ftWithWaste, 0) + " linear ft");
    set("r-ft-oneway", A.num(ftOneWay, 0) + " linear ft");
    set("r-material", A.money(materialCost));
    set("r-chairs", chairs + " chairs (" + A.money(chairsCost) + ")");
    set("r-ties", tieWireLb + " lb tie wire (" + A.money(tieCost) + ")");
    set("r-total", A.money(totalMaterial));
    set("r-per-sqft", A.money(totalMaterial / area, 2) + "/sq ft material");
    set("r-installed", A.money(installedLow, 2) + " – " + A.money(installedHigh, 2) + "/sq ft installed");
    set("r-weight", A.num((ftWithWaste / bar.ftPerLb) / 20, 2) + " tons");
    set("r-spacing-note", "every " + spacing + " in on center = every " + A.num(spacingFt, 2) + " ft");

    var v = document.getElementById("r-verdict");
    if (v) {
      v.className = "verdict verdict--info";
      v.innerHTML = "<b>" + pieces + " " + bar.label + " bars</b> — <b>" + A.num(ftWithWaste, 0) +
        " linear feet</b> including " + wastePct + "% waste, at " + A.num(spacing, 0) +
        " in on center. Material is about <b>" + A.money(totalMaterial) + "</b> (" +
        A.money(totalMaterial / area, 2) + " per sq ft) before the crew sets it. " +
        "Installed, rebar usually runs <b>" + A.money(installedLow, 2) + "–" + A.money(installedHigh, 2) +
        " per sq ft</b>. Do not forget chairs — rebar lying on the sub-base does nothing.";
    }
  }

  function init() {
    var form = document.getElementById("rebar-form");
    if (!form) return;
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    render();
  }

  window.PourCostPages = { init: init };
})();
