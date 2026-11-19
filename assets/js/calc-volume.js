/* ==========================================================================
   PourCost — concrete volume, bag & material calculator
   9 pour shapes (incl. triangle and a multi-shape custom builder),
   imperial/metric input, 4 bag sizes, gravel base volume, metric output.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.PourCostApp, PC = window.PourCost;

  function getRadio(name, fallback) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < els.length; i++) if (els[i].checked) return els[i].value;
    return fallback;
  }
  function show(id, vis) {
    var el = document.getElementById(id);
    if (el) el.style.display = vis ? "" : "none";
  }
  function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }

  /* ---------- Unit system ---------- */
  function unitSystem() {
    return getRadio("vsystem", "imperial");
  }
  var UNIT_LABEL = { len: { imperial: "ft", metric: "m" }, thick: { imperial: "in", metric: "cm" } };

  function applyUnits() {
    var sys = unitSystem();
    Array.prototype.forEach.call(document.querySelectorAll("[data-unit]"), function (el) {
      var kind = el.getAttribute("data-unit");
      var map = UNIT_LABEL[kind];
      if (map) el.textContent = map[sys];
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-dim]"), function (el) {
      var kind = el.getAttribute("data-dim");
      var map = UNIT_LABEL[kind];
      if (map) el.setAttribute("step", sys === "metric" ? "0.05" : "0.5");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-metric-only]"), function (el) {
      el.style.display = sys === "metric" ? "" : "none";
    });
    if (customDirty) renderCustomRows();
  }

  /* ---------- Convert entered values when the unit system changes ---------- */
  function convertInputs(from, to) {
    if (from === to) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-dim]"), function (el) {
      var kind = el.getAttribute("data-dim");
      var v = parseFloat(el.value);
      if (!isFinite(v)) return;
      var nv;
      if (kind === "len") {
        nv = from === "metric" ? v * 3.280839895 : v * 0.3048;   // m <-> ft
      } else {
        nv = from === "metric" ? v * 0.393700787 : v * 2.54;    // cm <-> in
      }
      var dp = kind === "len" ? 3 : 2;
      el.value = Math.round(nv * Math.pow(10, dp)) / Math.pow(10, dp);
    });
    // Custom-builder rows carry their own dimension kind.
    customShapes.forEach(function (c) {
      if (!isFinite(c.a)) return;
      c.a = from === "metric" ? c.a * 3.280839895 : c.a * 0.3048;
      c.b = isFinite(c.b) ? (from === "metric" ? c.b * 3.280839895 : c.b * 0.3048) : c.b;
    });
    customDirty = true;
  }

  /* ---------- Custom multi-shape builder ---------- */
  var customShapes = [
    { type: "rect", a: 20, b: 20, c: 0 },
    { type: "circle", a: 12, b: 0, c: 0 }
  ];
  var customDirty = false;

  var CUSTOM_TYPES = {
    rect:    { label: "Rectangle", fields: [["a", "Length"], ["b", "Width"]], n: 2 },
    circle:  { label: "Round pad", fields: [["a", "Diameter"]], n: 1 },
    triangle:{ label: "Triangle", fields: [["a", "Base"], ["b", "Height"]], n: 2 }
  };

  function renderCustomRows() {
    var host = document.getElementById("v-custom-list");
    if (!host) return;
    var sys = unitSystem();
    var unit = sys === "metric" ? "m" : "ft";
    host.innerHTML = "";

    customShapes.forEach(function (c, idx) {
      var meta = CUSTOM_TYPES[c.type] || CUSTOM_TYPES.rect;
      var row = document.createElement("div");
      row.className = "custom-row";
      row.setAttribute("data-idx", String(idx));

      var sel = document.createElement("select");
      sel.className = "custom-row__type";
      sel.setAttribute("aria-label", "Shape type for component " + (idx + 1));
      Object.keys(CUSTOM_TYPES).forEach(function (k) {
        var o = document.createElement("option");
        o.value = k; o.textContent = CUSTOM_TYPES[k].label;
        if (k === c.type) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () {
        c.type = sel.value;
        if (c.type === "circle") { c.b = 0; }
        customDirty = true;
        renderCustomRows();
        render();
      });
      row.appendChild(wrapField("Type", sel));

      meta.fields.forEach(function (f) {
        var input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "0.5";
        input.inputMode = "decimal";
        input.value = c[f[0]];
        input.setAttribute("aria-label", f[1] + " for component " + (idx + 1));
        input.addEventListener("input", function () {
          c[f[0]] = parseFloat(input.value) || 0;
          customDirty = true;
          render();
        });
        row.appendChild(wrapField(f[1], input, unit));
      });

      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "custom-row__remove";
      rm.setAttribute("aria-label", "Remove component " + (idx + 1));
      rm.innerHTML = "&times;";
      rm.addEventListener("click", function () {
        customShapes.splice(idx, 1);
        if (!customShapes.length) customShapes.push({ type: "rect", a: 20, b: 20, c: 0 });
        customDirty = true;
        renderCustomRows();
        render();
      });
      row.appendChild(rm);

      host.appendChild(row);
    });
    customDirty = false;
  }

  function wrapField(labelText, control, unitText) {
    var wrap = document.createElement("div");
    wrap.className = "custom-row__field";
    var lab = document.createElement("span");
    lab.className = "custom-row__label";
    lab.textContent = labelText;
    wrap.appendChild(lab);
    var iw = document.createElement("div");
    iw.className = "input-wrap" + (unitText ? " has-unit" : "");
    iw.appendChild(control);
    if (unitText) {
      var u = document.createElement("span");
      u.className = "unit";
      u.textContent = unitText;
      iw.appendChild(u);
    }
    wrap.appendChild(iw);
    return wrap;
  }

  /* ---------- Read dimensions for the active shape ---------- */
  function dims() {
    var shape = getRadio("vshape", "rect");
    var sys = unitSystem();
    var L = function (id, d) { return PC.toFeet(A.val(id, d), sys); };  // feet
    var T = function (id, d) { return PC.toInches(A.val(id, d), sys); }; // inches

    switch (shape) {
      case "circle":
        return { shape: shape, diameter: L("v-diameter", 12), thickness: T("v-thickness-c", 4) };
      case "column":
        // Diameter entered in inches (sonotube sizes); engine works in feet.
        return { shape: shape, diameter: T("v-col-dia", 12) / 12, thickness: T("v-height", 48) };
      case "lshape":
        return {
          shape: shape,
          length: L("v-l-length", 24), width: L("v-l-width", 18),
          length2: L("v-l-notch-l", 10), width2: L("v-l-notch-w", 8),
          thickness: T("v-thickness-ls", 4)
        };
      case "footing":
        return { shape: shape, length: L("v-f-length", 10), width: L("v-f-width", 2), thickness: T("v-f-depth", 12) };
      case "wall":
        // Length and height in feet, wall thickness in inches.
        return { shape: shape, length: L("v-w-length", 20), thickness: T("v-w-thick", 8), thickness2: L("v-w-height", 4) };
      case "stairs":
        return {
          shape: shape,
          run: L("v-run", 12), rise: L("v-rise", 6), width: L("v-st-width", 4),
          platform: L("v-platform", 4), platformt: T("v-platformt", 4),
          risers: A.val("v-risers", 6), thickness: T("v-thickness", 4)
        };
      case "triangle":
        return {
          shape: shape,
          base: L("v-tri-base", 20), height: L("v-tri-height", 12),
          tritype: A.str("v-tri-type", "iso"), thickness: T("v-tri-thickness", 4)
        };
      case "custom":
        return { shape: shape, thickness: T("v-custom-thickness", 4) };
      default:
        return { shape: "rect", length: L("v-length", 20), width: L("v-width", 20), thickness: T("v-thickness", 4) };
    }
  }

  /* ---------- Custom components in engine units ---------- */
  function customComponents(d) {
    var sys = unitSystem();
    return customShapes.map(function (c) {
      var a = sys === "metric" ? c.a * PC.M_TO_FT : c.a;
      var b = sys === "metric" ? c.b * PC.M_TO_FT : c.b;
      if (c.type === "circle") {
        return { shape: "circle", dims: { diameter: a, thickness: d.thickness } };
      }
      if (c.type === "triangle") {
        return { shape: "triangle", dims: { base: a, height: b, tritype: "iso", thickness: d.thickness } };
      }
      return { shape: "rect", dims: { length: a, width: b, thickness: d.thickness } };
    });
  }

  /* ---------- Render ---------- */
  function render() {
    var d = dims();
    var sys = unitSystem();
    var thickness = d.thickness || 4;
    var waste = A.val("v-waste", 10);
    var qty = A.val("v-qty", 1);
    var showCost = A.checked("v-showcost");

    // Shape field groups
    ["rect", "lshape", "circle", "footing", "column", "wall", "stairs", "triangle", "custom"]
      .forEach(function (s) { show("vg-" + s, d.shape === s); });

    var v;
    if (d.shape === "custom") {
      v = PC.volumeCustom(customComponents(d));
    } else {
      v = PC.volume(d.shape, d);
    }

    var cuFt = v.volumeCuFt * qty;
    var cuYd = v.volumeCuYd * qty;
    var area = v.areaSqFt * qty;
    var withWaste = cuYd * (1 + waste / 100);
    var bags = PC.bagsForAllSizes(cuFt, waste);
    var coverage = PC.coveragePerYard(thickness);
    var weight = cuFt * 150;

    // Gravel base volume (compacted crushed stone under the pour)
    var baseDepth = A.val("v-base-depth", 4);
    var gv = PC.gravelVolume(area, baseDepth);

    var areaUnit = sys === "metric" ? " m²" : " sq ft";
    var areaText = area > 0
      ? (sys === "metric" ? A.num(PC.sqFtToSqM(area), 1) : A.num(area, 0)) + areaUnit
      : "—";
    if (sys === "metric" && area > 0) areaText = A.num(PC.sqFtToSqM(area), 1) + " m²";

    set("v-area", areaText);
    set("v-cuft", cuFt > 0 ? A.num(cuFt, 1) + " ft³" : "—");
    set("v-cuyd", cuYd > 0 ? A.num(cuYd, 2) + " yd³" : "—");
    set("v-cum", cuYd > 0 ? A.num(PC.cuYdToCuM(cuYd), 2) + " m³" : "—");
    set("v-gravel", gv.volumeCuYd > 0 ? A.num(gv.volumeCuYd, 2) + " yd³" : "—");
    set("v-order", cuYd > 0 ? A.num(withWaste, 2) + " yd³" : "—");
    set("v-bags80", bags[80] > 0 ? bags[80] + " bags" : "—");
    set("v-bags60", bags[60] > 0 ? bags[60] + " bags" : "—");
    set("v-bags50", bags[50] > 0 ? bags[50] + " bags" : "—");
    set("v-bags40", bags[40] > 0 ? bags[40] + " bags" : "—");
    set("v-coverage", coverage > 0 ? coverage + " sq ft/yd³" : "—");
    set("v-weight", weight > 0 ? A.num(weight, 0) + " lb" : "—");

    // Shape description line
    var desc = document.getElementById("v-shape-desc");
    if (desc && PC.SHAPES[d.shape]) desc.textContent = PC.SHAPES[d.shape].desc;

    // Material summary (visual feedback)
    renderSummary(d, cuYd, withWaste, bags, gv, baseDepth, area);

    // Cost comparison
    var cp = document.getElementById("v-cost-panel");
    var cp2 = document.getElementById("v-cost-panel2");
    if (cp) cp.style.display = showCost ? "" : "none";
    if (cp2) cp2.style.display = showCost ? "" : "none";
    if (cp && showCost) {
      var rmPrice = A.val("v-rmprice", 155);
      var bagPrice = A.val("v-bagprice", 6.50);
      var rmCost = withWaste * rmPrice;
      var bagCost = bags[80] * bagPrice;
      var truck = Math.max(1, Math.ceil(withWaste / 10));
      var rmTotal = rmCost + truck * 120;
      set("v-rmcost", A.money(rmCost));
      set("v-rmtotal", A.money(rmTotal));
      set("v-bagcost", A.money(bagCost));
      set("v-trucks", truck + (truck > 1 ? " loads" : " load"));

      var vEl = document.getElementById("v-verdict");
      if (vEl) {
        if (cuYd < 1) {
          vEl.className = "verdict";
          vEl.innerHTML = "<b>" + A.num(cuYd, 2) + " cubic yards</b> — under the 1 yd³ threshold where bags stop making sense. " +
            "Buy <b>" + bags[80] + " bags of 80 lb mix</b> (" + A.money(bagCost) + ") rather than paying for a truck. " +
            "Mixing and pouring this much by hand is a realistic weekend project.";
        } else {
          vEl.className = "verdict verdict--info";
          vEl.innerHTML = "<b>" + A.num(cuYd, 2) + " cubic yards</b> is past the point where hand-mixing is sensible. " +
            "A ready-mix load runs about <b>" + A.money(rmTotal) + "</b> delivered, against <b>" + A.money(bagCost) +
            "</b> in bags before you mix, haul, and pour 3,600 lb by hand. " +
            "Order <b>" + A.num(Math.ceil(withWaste * 4) / 4, 2) + " cubic yards</b> — plants sell in quarter-yard increments.";
        }
      }
    }
  }

  /* ---------- Material summary card ---------- */
  function renderSummary(d, cuYd, withWaste, bags, gv, baseDepth, area) {
    var host = document.getElementById("v-summary");
    if (!host) return;
    var rows = [];
    rows.push(["Plan area", A.num(area, 0) + " sq ft"]);
    rows.push(["Slab thickness", (d.thickness || 4) + " in"]);
    rows.push(["Concrete volume", A.num(cuYd, 2) + " yd³ (" + A.num(PC.cuYdToCuM(cuYd), 2) + " m³)"]);
    rows.push(["Order volume (with waste)", A.num(withWaste, 2) + " yd³"]);
    rows.push(["Gravel base (" + baseDepth + " in)", A.num(gv.volumeCuYd, 2) + " yd³"]);
    rows.push(["80 lb bags", bags[80] + " bags"]);
    rows.push(["Estimated weight", A.num(cuYd * 27 * 150, 0) + " lb"]);

    var html = '<div class="summary-card"><div class="summary-card__title">Material summary</div><dl>';
    rows.forEach(function (r) {
      html += "<div class=\"summary-card__row\"><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
    });
    html += "</dl></div>";
    host.innerHTML = html;
  }

  /* ---------- Init ---------- */
  function init() {
    var form = document.getElementById("volume-form");
    if (!form) return;

    form.addEventListener("input", render);
    form.addEventListener("change", render);

    // Shape chips
    Array.prototype.forEach.call(document.querySelectorAll("[data-vshape]"), function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll("[data-vshape]"), function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        btn.setAttribute("aria-pressed", "true");
        var r = document.getElementById("vshape-" + btn.getAttribute("data-vshape"));
        if (r) r.checked = true;
        if (btn.getAttribute("data-vshape") === "custom") renderCustomRows();
        applyUnits();
        render();
      });
    });

    // Custom builder
    var addBtn = document.getElementById("v-custom-add");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        customShapes.push({ type: "rect", a: 10, b: 10, c: 0 });
        customDirty = true;
        renderCustomRows();
        render();
      });
    }

    // Unit system
    var lastSystem = unitSystem();
    Array.prototype.forEach.call(document.querySelectorAll('input[name="vsystem"]'), function (r) {
      r.addEventListener("change", function () {
        var now = unitSystem();
        convertInputs(lastSystem, now);
        lastSystem = now;
        applyUnits();
        render();
      });
    });

    renderCustomRows();
    applyUnits();
    render();
  }

  window.PourCostPages = { init: init };
})();
