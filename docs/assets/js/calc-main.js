/* ==========================================================================
   PourCost — main concrete slab cost calculator (index page)
   ========================================================================== */
(function () {
  "use strict";

  var A = window.PourCostApp;
  var PC = window.PourCost;

  var state = {
    shape: "rect",
    lastResult: null
  };

  /* ---------- Preset application ---------- */
  function applyPreset(key) {
    var p = PC.PRESETS[key];
    if (!p) return;
    setVal("f-thickness", p.thickness);
    setVal("f-psi", p.psi);
    setVal("f-reinf", p.reinf);
    setVal("f-finish", p.finish);
    setVal("f-basedepth", p.base);
    updateThicknessHint();
    render();
  }

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = v;
  }
  function setRadio(name, value) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].value === value) els[i].checked = true;
    }
  }
  function getRadio(name, fallback) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].checked) return els[i].value;
    }
    return fallback;
  }

  /* ---------- Thickness hint: recommended use by thickness ---------- */
  var THICK_HINT = {
    3: "Overlays, shed floors on solid base",
    4: "Patios, walkways, shed & AC pads — the standard residential minimum",
    5: "Residential driveways and garage floors (passenger cars, half-ton pickups)",
    6: "Heavy vehicle driveways, RV and boat pads, commercial slabs",
    8: "Post-tensioned, heavily loaded, or industrial slabs"
  };
  function updateThicknessHint() {
    var t = A.val("f-thickness", 4);
    var el = document.getElementById("thickness-hint");
    if (el) {
      el.textContent = THICK_HINT[t] || (t + " in — enter a custom thickness");
    }
  }

  /* ---------- Region application ---------- */
  function applyRegion() {
    var r = A.str("f-region", "national");
    var reg = PC.REGIONS[r];
    if (!reg) return;
    var el = document.getElementById("region-note");
    if (!el) return;
    var psi = A.val("f-psi", 3000);
    var band = PC.PRICES.readyMix[psi] || PC.PRICES.readyMix[3000];
    var lo = Math.round(band.low * reg.readyMix);
    var hi = Math.round(band.high * reg.readyMix);
    el.innerHTML = "<strong>" + reg.label + "</strong> — about $" + lo + "–$" + hi +
      " per cubic yard at " + psi + " PSI, and " +
      Math.round(reg.labor * 100) + "% of the national labor rate.";
  }

  /* ---------- Build model input from the form ---------- */
  function readInput() {
    var shape = getRadio("shape", "rect");

    // Dimensions depend on the active shape.
    var length, width, length2, width2, diameter;
    if (shape === "lshape") {
      length = A.val("f-l-length", 24);
      width = A.val("f-l-width", 18);
      length2 = A.val("f-l-notch-l", 10);   // notch length
      width2 = A.val("f-l-notch-w", 8);     // notch width
      diameter = 0;
    } else if (shape === "circle") {
      length = A.val("f-diameter", 12);
      width = A.val("f-diameter", 12);
      length2 = 0; width2 = 0;
      diameter = A.val("f-diameter", 12);
    } else {
      length = A.val("f-length", 20);
      width = A.val("f-width", 20);
      length2 = 0; width2 = 0;
      diameter = 0;
    }

    return {
      shape: shape,
      length: length,
      width: width,
      length2: length2,
      width2: width2,
      diameter: diameter,
      thickness: A.val("f-thickness", 4),
      quantity: A.val("f-qty", 1),
      wastePct: A.val("f-waste", 10),
      region: A.str("f-region", "national"),
      psi: A.val("f-psi", 3000),
      reinforcement: A.str("f-reinf", "wire"),
      finish: A.str("f-finish", "broom"),
      readyMixPrice: (function () {
        var el = document.getElementById("f-rmprice");
        return el && el.value !== "" ? A.val("f-rmprice") : null;
      })(),
      bagPrice80: (function () {
        var el = document.getElementById("f-bagprice");
        return el && el.value !== "" ? A.val("f-bagprice") : null;
      })(),
      deliveryFee: (function () {
        var el = document.getElementById("f-delivery");
        return el && el.value !== "" ? A.val("f-delivery") : null;
      })(),
      shortLoadFee: (function () {
        var el = document.getElementById("f-shortload");
        return el && el.value !== "" ? A.val("f-shortload") : null;
      })(),
      pumpTruck: A.checked("f-pump"),
      includeBase: A.checked("f-include-base"),
      baseDepth: A.val("f-basedepth", 4),
      includeSitePrep: A.checked("f-include-prep"),
      includeSealer: A.checked("f-include-seal"),
      planMinYards: A.val("f-planmin", 4)
    };
  }

  /* ---------- Render ---------- */
  function render() {
    var input = readInput();
    var r = PC.estimate(input);
    state.lastResult = r;

    // --- Shape visibility ---
    toggleGroup("shape-rect-fields", state.shape === "rect");
    toggleGroup("shape-lshape-fields", state.shape === "lshape");
    toggleGroup("shape-circle-fields", state.shape === "circle");

    var hasArea = r.areaSqFt > 0;

    // --- Headline ---
    var head = document.getElementById("headline-value");
    var sub = document.getElementById("headline-sub");
    var band = document.getElementById("range-band");
    var legend = document.getElementById("range-legend");
    var empty = document.getElementById("empty-state");

    if (!hasArea) {
      head.textContent = "—";
      head.classList.add("is-empty");
      sub.innerHTML = "Enter dimensions to see your estimate";
      band.style.display = "none";
      legend.style.display = "none";
      if (empty) empty.style.display = "block";
    } else {
      head.classList.remove("is-empty");
      head.textContent = A.money(r.totals.typ);
      sub.innerHTML = A.money(r.totals.low) + " – " + A.money(r.totals.high) +
        " typical range &nbsp;·&nbsp; <b>" + A.money(r.perSqFt.typ, 2) + "/sq ft</b>";
      if (empty) empty.style.display = "none";

      // Range band: widths proportional to low/typ/high
      var span = Math.max(r.totals.high - r.totals.low, 1);
      var lowW = (r.totals.low - r.totals.low) / span * 100;
      var typW = (r.totals.typ - r.totals.low) / span * 100;
      var highW = (r.totals.high - r.totals.low) / span * 100;
      band.style.display = "flex";
      band.innerHTML =
        '<span class="rb-low" style="width:' + lowW + '%"></span>' +
        '<span class="rb-typ" style="width:' + typW + '%"></span>' +
        '<span class="rb-high" style="width:' + highW + '%"></span>';
      legend.style.display = "flex";
      legend.innerHTML =
        "<span>Low " + A.money(r.totals.low) + "</span>" +
        "<span>Typical " + A.money(r.totals.typ) + "</span>" +
        "<span>High " + A.money(r.totals.high) + "</span>";
    }

    // --- Stats ---
    setStat("stat-area", hasArea ? A.num(r.areaSqFt, 0) + " sq ft" : "—");
    setStat("stat-yards", hasArea ? A.num(r.orderCuYd, 2) + " yd³" : "—");
    setStat("stat-bags", hasArea ? r.bags[80] + " bags" : "—");
    setStat("stat-sqft", hasArea ? A.money(r.perSqFt.typ, 2) + "/sq ft" : "—");
    setStat("stat-coverage", hasArea ? r.coveragePerYard + " sq ft/yd³" : "—");
    setStat("stat-weight", hasArea ? A.num(r.weightLbs, 0) + " lb" : "—");
    setStat("stat-loads", hasArea ? r.loads + " truck load" + (r.loads > 1 ? "s" : "") : "—");
    setStat("stat-joints", hasArea ? (r.joints.joints || 0) + " joints" : "—");

    // --- Breakdown ---
    var bd = document.getElementById("breakdown");
    if (!hasArea) {
      bd.innerHTML = '<p class="small muted">Enter the slab dimensions to see a line-item cost breakdown.</p>';
    } else {
      var max = 0;
      r.lines.forEach(function (l) { if (l.typ > max) max = l.typ; });
      bd.innerHTML = r.lines.map(function (l) {
        var w = max > 0 ? (l.typ / max) * 100 : 0;
        return '<div class="bd-row">' +
          '<div class="bd-row__head">' +
            '<span class="bd-row__label">' + l.label + ' <small>· ' + l.detail + '</small></span>' +
            '<span class="bd-row__val">' + A.money(l.typ) + '</span>' +
          '</div>' +
          '<div class="bd-bar"><span class="' + l.cls + '" style="width:' + w.toFixed(1) + '%"></span></div>' +
        '</div>';
      }).join("");
    }

    // --- Totals ---
    setText("total-low", hasArea ? A.money(r.totals.low) : "—");
    setText("total-typ", hasArea ? A.money(r.totals.typ) : "—");
    setText("total-high", hasArea ? A.money(r.totals.high) : "—");
    setText("total-sqft", hasArea ? A.money(r.perSqFt.typ, 2) + " / sq ft" : "—");

    // --- Verdict: bags vs ready-mix ---
    var v = document.getElementById("verdict");
    if (!hasArea) {
      v.className = "verdict";
      v.innerHTML = "Enter dimensions to compare bagged concrete against a ready-mix truck.";
    } else {
      var cmp = PC.compareOptions(r);
      var bagYd = r.orderCuYd;
      if (bagYd < 1) {
        v.className = "verdict";
        v.innerHTML = "<b>" + A.num(bagYd, 2) + " cubic yards</b> is under the 1 yd³ threshold where bags stop being sensible. " +
          "Bagged concrete costs about <b>" + A.money(cmp.bags) + "</b> in material (" + r.bags[80] +
          " bags of 80 lb mix), versus roughly <b>" + A.money(cmp.readyMix) +
          "</b> for a delivered ready-mix load including delivery and short-load fees. " +
          "For this size, <b>bags are the sensible choice</b>.";
      } else {
        v.className = "verdict verdict--info";
        v.innerHTML = "<b>" + A.num(bagYd, 2) + " cubic yards</b> is past the point where hand-mixing makes sense. " +
          "Bagged concrete would run about <b>" + A.money(cmp.bags) + "</b> in material alone (" + r.bags[80] +
          " bags of 80 lb mix) and still need to be mixed, hauled, and poured by hand. " +
          "A ready-mix load with delivery comes to about <b>" + A.money(cmp.readyMix) +
          "</b> — cheaper on material, and far less work.";
      }
    }

    // --- Summary block for copy ---
    if (hasArea) {
      var s =
        "CONCRETE SLAB COST ESTIMATE\n" +
        "============================\n" +
        "Size: " + A.num(r.areaSqFt, 0) + " sq ft" +
          (r.quantity > 1 ? " (" + r.quantity + " slabs)" : "") + "\n" +
        "Thickness: " + r.thickness + " in\n" +
        "Concrete: " + A.num(r.volumeCuYd, 2) + " yd³ (" + A.num(r.orderCuYd, 2) + " yd³ with waste)\n" +
        "Bags (80 lb): " + r.bags[80] + "\n" +
        "Coverage: " + r.coveragePerYard + " sq ft per yd³\n" +
        "\nESTIMATED COST\n" +
        "Low:  " + A.money(r.totals.low) + "\n" +
        "Typical: " + A.money(r.totals.typ) + "\n" +
        "High: " + A.money(r.totals.high) + "\n" +
        "Per sq ft: " + A.money(r.perSqFt.typ, 2) + "\n" +
        "\nBREAKDOWN\n" +
        r.lines.map(function (l) { return "  " + l.label + ": " + A.money(l.typ); }).join("\n") +
        "\n\n2026 U.S. national average pricing. Planning estimate, not a quote.";
      window.__pourcostSummary = s;
    } else {
      window.__pourcostSummary = "";
    }
  }

  function setStat(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function toggleGroup(id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  /* ---------- Build comparison tables on the page ---------- */
  function buildTables() {
    var price = PC.PRICES.readyMix[3000].typ;
    var sqft = A.val("f-ratesqft", 8);

    // Cost per sq ft by thickness
    var tBody = document.getElementById("table-thickness");
    if (tBody) {
      tBody.innerHTML = PC.thicknessTable(price).map(function (r) {
        return "<tr>" +
          "<td><strong>" + r.thickness + ' in</strong></td>' +
          "<td class='num'>" + r.coverage + "</td>" +
          "<td class='num'>" + A.money(r.materialPerSqFt, 2) + "</td>" +
          "<td class='num'>" + A.money(r.materialWithWaste, 2) + "</td>" +
          "</tr>";
      }).join("");
    }

    // Project totals by size
    var sBody = document.getElementById("table-sizes");
    if (sBody) {
      sBody.innerHTML = PC.sizeTable(sqft, 4).map(function (r) {
        return "<tr>" +
          "<td><strong>" + r.label + " ft</strong></td>" +
          "<td class='num'>" + r.area + "</td>" +
          "<td class='num'>" + A.num(r.cuYd, 2) + "</td>" +
          "<td class='num'>" + r.bags80 + "</td>" +
          "<td class='num'>" + A.money(r.low) + " – " + A.money(r.high) + "</td>" +
          "</tr>";
      }).join("");
    }

    // Concrete-only per sq ft table
    var cBody = document.getElementById("table-concrete-only");
    if (cBody) {
      cBody.innerHTML = PC.thicknessTable(price).map(function (r) {
        return "<tr>" +
          "<td>" + r.thickness + ' in</td>' +
          "<td class='num'>" + r.coverage + "</td>" +
          "<td class='num'>" + A.money(r.materialPerSqFt, 2) + "</td>" +
          "<td class='num'>" + A.money(r.materialWithWaste, 2) + "</td>" +
          "</tr>";
      }).join("");
    }
  }

  /* ---------- Share state via URL hash (shareable estimates) ---------- */
  function writeHash() {
    var p = new URLSearchParams();
    p.set("s", state.shape);
    if (state.shape === "lshape") {
      p.set("l", A.val("f-l-length", 24));
      p.set("w", A.val("f-l-width", 18));
      p.set("l2", A.val("f-l-notch-l", 10));
      p.set("w2", A.val("f-l-notch-w", 8));
    } else if (state.shape === "circle") {
      p.set("d", A.val("f-diameter", 12));
    } else {
      p.set("l", A.val("f-length", 20));
      p.set("w", A.val("f-width", 20));
    }
    p.set("t", A.val("f-thickness", 4));
    p.set("q", A.val("f-qty", 1));
    p.set("waste", A.val("f-waste", 10));
    p.set("psi", A.val("f-psi", 3000));
    p.set("r", A.str("f-region", "national"));
    p.set("rein", A.str("f-reinf", "wire"));
    p.set("fin", A.str("f-finish", "broom"));
    history.replaceState(null, "", "#" + p.toString());
  }

  function readHash() {
    if (!location.hash || location.hash.length < 2) return false;
    var p = new URLSearchParams(location.hash.slice(1));
    var s = p.get("s");
    if (!s && !p.get("l") && !p.get("d")) return false;
    setRadio("shape", s || "rect");
    if (s === "lshape") {
      setVal("f-l-length", p.get("l"));
      setVal("f-l-width", p.get("w"));
      setVal("f-l-notch-l", p.get("l2"));
      setVal("f-l-notch-w", p.get("w2"));
    } else if (s === "circle") {
      setVal("f-diameter", p.get("d"));
    } else if (p.get("l")) {
      setVal("f-length", p.get("l"));
      setVal("f-width", p.get("w"));
    }
    setVal("f-thickness", p.get("t"));
    setVal("f-qty", p.get("q"));
    setVal("f-waste", p.get("waste"));
    setVal("f-psi", p.get("psi"));
    setVal("f-region", p.get("r"));
    setVal("f-reinf", p.get("rein"));
    setVal("f-finish", p.get("fin"));
    return true;
  }

  /* ---------- Init ---------- */
  function init() {
    var form = document.getElementById("calc-form");
    if (!form) return;

    state.shape = getRadio("shape", "rect");
    readHash();
    state.shape = getRadio("shape", "rect");

    // Live recalculation on any input change
    form.addEventListener("input", function () {
      state.shape = getRadio("shape", "rect");
      updateThicknessHint();
      applyRegion();
      render();
      writeHash();
    });
    form.addEventListener("change", function () {
      state.shape = getRadio("shape", "rect");
      updateThicknessHint();
      applyRegion();
      render();
      writeHash();
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

    // Preset chips
    Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        btn.setAttribute("aria-pressed", "true");
        applyPreset(btn.getAttribute("data-preset"));
      });
    });

    // Thickness quick chips
    Array.prototype.forEach.call(document.querySelectorAll("[data-thickness]"), function (btn) {
      btn.addEventListener("click", function () {
        setVal("f-thickness", btn.getAttribute("data-thickness"));
        updateThicknessHint();
        render();
        writeHash();
      });
    });

    // Rate slider for the size table
    var slider = document.getElementById("f-ratesqft");
    if (slider) {
      slider.addEventListener("input", function () {
        var out = document.getElementById("ratesqft-out");
        if (out) out.textContent = "$" + slider.value;
        buildTables();
      });
    }

    // Copy summary
    var copyBtn = document.getElementById("btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (window.__pourcostSummary) A.copyText(window.__pourcostSummary, copyBtn);
      });
    }

    // Print
    var printBtn = document.getElementById("btn-print");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    // Reset
    var resetBtn = document.getElementById("btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        form.reset();
        setRadio("shape", "rect");
        setVal("f-length", 20); setVal("f-width", 20); setVal("f-thickness", 4);
        setVal("f-qty", 1); setVal("f-waste", 10); setVal("f-psi", 3000);
        setVal("f-region", "national"); setVal("f-reinf", "wire"); setVal("f-finish", "broom");
        updateThicknessHint(); applyRegion(); render(); writeHash();
      });
    }

    updateThicknessHint();
    applyRegion();
    buildTables();
    render();
  }

  window.PourCostPages = { init: init };
})();
