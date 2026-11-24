/* ==========================================================================
   PourCost — ready-mix vs bags comparison
   ========================================================================== */
(function () {
  "use strict";
  var A = window.PourCostApp, PC = window.PourCost;

  function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }

  function render() {
    var l = A.val("c-length", 12), w = A.val("c-width", 12);
    var t = A.val("c-thickness", 4);
    var waste = A.val("c-waste", 10);
    var rmPrice = A.val("c-rmprice", 155);
    var bagPrice = A.val("c-bagprice", 6.50);
    var delivery = A.val("c-delivery", 120);
    var shortLoad = A.val("c-shortload", 120);
    var bagSize = A.str("c-bagsize", "80");
    var mixer = A.val("c-mixer", 0);
    var planMin = A.val("c-planmin", 4);

    var v = PC.volume("rect", { length: l, width: w, thickness: t });
    var cuYd = v.volumeCuYd;
    var orderYd = cuYd * (1 + waste / 100);
    var bags = PC.bagCount(v.volumeCuFt, bagSize, waste);

    // --- Ready-mix scenario ---
    var loads = Math.max(1, Math.ceil(orderYd / 10));
    var rmConcrete = orderYd * rmPrice;
    var rmDelivery = loads * delivery;
    var rmShort = orderYd < planMin ? shortLoad : 0;
    var rmTotal = rmConcrete + rmDelivery + rmShort;
    var rmPerYd = orderYd > 0 ? rmTotal / orderYd : 0;

    // --- Bagged scenario ---
    var bagMaterial = bags * bagPrice;
    var bagTotal = bagMaterial + mixer;
    var bagPerYd = orderYd > 0 ? bagTotal / orderYd : 0;

    var bagsCheaper = bagTotal < rmTotal;

    set("cmp-volume", A.num(cuYd, 2) + " yd³");
    set("cmp-order", A.num(orderYd, 2) + " yd³");
    set("cmp-bags", bags + " bags");
    set("cmp-loads", loads + (loads > 1 ? " loads" : " load"));

    set("cmp-rm-concrete", A.money(rmConcrete));
    set("cmp-rm-delivery", A.money(rmDelivery));
    set("cmp-rm-short", rmShort > 0 ? A.money(rmShort) : "—");
    set("cmp-rm-total", A.money(rmTotal));
    set("cmp-rm-peryd", A.money(rmPerYd, 2) + "/yd³");

    set("cmp-bag-material", A.money(bagMaterial));
    set("cmp-bag-mixer", mixer > 0 ? A.money(mixer) : "—");
    set("cmp-bag-total", A.money(bagTotal));
    set("cmp-bag-peryd", A.money(bagPerYd, 2) + "/yd³");

    set("cmp-diff", A.money(Math.abs(rmTotal - bagTotal)));
    set("cmp-savings", bagsCheaper ? "Bags" : "Ready-mix");
    set("cmp-savings-val", A.money(Math.abs(rmTotal - bagTotal)));

    // Highlight the winning column
    var rmCol = document.getElementById("cmp-rm-col");
    var bagCol = document.getElementById("cmp-bag-col");
    if (rmCol) rmCol.style.borderColor = bagsCheaper ? "rgba(255,255,255,.12)" : "var(--orange)";
    if (bagCol) bagCol.style.borderColor = bagsCheaper ? "var(--orange)" : "rgba(255,255,255,.12)";

    var vEl = document.getElementById("cmp-verdict");
    if (vEl) {
      if (bagsCheaper) {
        vEl.className = "verdict";
        vEl.innerHTML = "<b>Bags win by " + A.money(Math.abs(rmTotal - bagTotal)) + "</b> on this pour. " +
          "At " + A.num(cuYd, 2) + " cubic yards you would need " + bags + " bags of " + bagSize +
          " lb mix (" + A.money(bagMaterial) + (mixer > 0 ? " plus " + A.money(mixer) + " mixer rental" : "") +
          ") against a delivered ready-mix load of " + A.money(rmTotal) + ". " +
          "Hand-mixing this volume is a full day of work for two people — the cost saving is real, the time cost is yours to weigh.";
      } else {
        vEl.className = "verdict verdict--info";
        vEl.innerHTML = "<b>Ready-mix wins by " + A.money(Math.abs(rmTotal - bagTotal)) + "</b> on this pour. " +
          "Bags would cost " + A.money(bagTotal) + " in material" + (mixer > 0 ? " plus " + A.money(mixer) + " for the mixer" : "") +
          ", and you would still have to mix, haul, and pour " + A.num(cuYd * 2700, 0) +
          " lb by hand. A delivered ready-mix load is " + A.money(rmTotal) + " and takes about an hour. " +
          "Past " + A.num(cuYd, 2) + " yd³, ready-mix is the only sensible option.";
      }
    }
  }

  function init() {
    var form = document.getElementById("cmp-form");
    if (!form) return;
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    render();
  }

  window.PourCostPages = { init: init };
})();
