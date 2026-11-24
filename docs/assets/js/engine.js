/* ==========================================================================
   PourCost Engine — concrete slab volume, materials and cost modelling
   Pure functions, no DOM. Exposed as window.PourCost.

   Pricing basis: 2026 U.S. national averages compiled from published
   ready-mix supplier price lists, RSMeans-style cost guides, and NRMCA
   benchmark ranges. Every rate is a planning band, not a quote.
   ========================================================================== */
(function (global) {
  "use strict";

  /* ---------- Constants: material yields ---------- */
  // Bag yields are published finished cubic-foot yields per bag.
  var BAG_YIELD = { 40: 0.30, 50: 0.375, 60: 0.45, 80: 0.60 }; // ft^3 per bag
  var CU_FT_PER_YD = 27;

  /* ---------- Shape registry ---------- */
  // Each entry describes one pour shape. `dims` lists the inputs the UI must
  // collect, and drives both the form and the volume model.
  var SHAPES = {
    rect:     { label: "Rectangular slab", dims: ["length", "width", "thickness"],
                desc: "Patios, driveways, garage floors, shed and equipment pads" },
    lshape:   { label: "L-shape", dims: ["length", "width", "length2", "width2", "thickness"],
                desc: "Notched slabs, porches and L-shaped pads" },
    circle:   { label: "Round pad", dims: ["diameter", "thickness"],
                desc: "Round patios, tree rings, circular pads" },
    footing:  { label: "Footing", dims: ["length", "width", "thickness"],
                desc: "Strip footings and spread footings" },
    column:   { label: "Column / sonotube", dims: ["diameter", "thickness"],
                desc: "Round columns, piers and pilings" },
    wall:     { label: "Wall", dims: ["length", "thickness", "thickness2"],
                desc: "Retaining walls and block wall footings" },
    stairs:   { label: "Stairs", dims: ["run", "rise", "width", "platform", "platformt", "risers", "thickness"],
                desc: "Concrete steps and stair flights" },
    triangle: { label: "Triangle", dims: ["base", "height", "tritype", "thickness"],
                desc: "Triangular slabs, wedges and angled pads" },
    custom:   { label: "Custom (multiple shapes)", dims: ["components", "thickness"],
                desc: "Combine several rectangles, circles and triangles" }
  };

  /* ---------- Unit conversion ---------- */
  var M_TO_FT = 3.280839895;
  var CM_TO_IN = 0.393700787;

  /** Convert a length/dimension value into feet for the given unit system. */
  function toFeet(value, system) {
    return system === "metric" ? value * M_TO_FT : value;
  }
  /** Convert a thickness/depth value into inches for the given unit system. */
  function toInches(value, system) {
    return system === "metric" ? value * CM_TO_IN : value;
  }
  /** Format a dimension for display in the active unit system. */
  function formatDim(valueFt, system) {
    if (system === "metric") return (valueFt / M_TO_FT).toFixed(2) + " m";
    return round(valueFt, 2) + " ft";
  }

  /* ---------- Constants: 2026 national price bands ---------- */
  // Each rate is {low, typ, high} in USD. Source notes live in /about.html.
  var PRICES = {
    readyMix: {
      2500: { low: 131, typ: 145, high: 160 },
      3000: { low: 135, typ: 155, high: 175 },
      3500: { low: 139, typ: 160, high: 180 },
      4000: { low: 143, typ: 168, high: 190 },
      4500: { low: 147, typ: 175, high: 200 },
      5000: { low: 151, typ: 185, high: 215 }
    },
    bag80:        { low: 5.50, typ: 6.50, high: 7.75 },
    bag60:        { low: 4.25, typ: 5.25, high: 6.25 },
    bag40:        { low: 3.25, typ: 4.00, high: 4.90 },
    delivery:     { low: 80,  typ: 120, high: 180 },   // per load
    shortLoad:    { low: 60,  typ: 120, high: 200 },   // flat, under plant minimum
    pumpTruck:    { low: 450, typ: 650, high: 900 },   // flat
    labor:        { low: 3.00, typ: 4.50, high: 8.00 },// per sq ft
    sitePrep:     { low: 0.00, typ: 0.85, high: 2.50 },// per sq ft
    gravelBase:   { low: 0.75, typ: 1.25, high: 1.90 },// per sq ft, 4in compacted
    forms:        { low: 1.50, typ: 2.25, high: 3.00 },// per linear ft
    vaporBarrier: { low: 0.10, typ: 0.20, high: 0.32 },// per sq ft
    fiberMesh:    { low: 0.10, typ: 0.20, high: 0.32 },// per sq ft
    wireMesh:     { low: 0.20, typ: 0.45, high: 0.90 },// per sq ft
    rebar:        { low: 0.70, typ: 1.10, high: 2.00 },// per sq ft
    finish: {
      broom:     { low: 0.00, typ: 0.00, high: 0.00 },
      trowel:    { low: 0.75, typ: 1.25, high: 2.00 },
      stamped:   { low: 5.00, typ: 7.00, high: 10.00 },
      exposed:   { low: 2.50, typ: 3.75, high: 5.50 },
      polished:  { low: 6.00, typ: 9.00, high: 14.00 }
    },
    sawCut:       { low: 1.60, typ: 2.40, high: 3.60 }, // per linear ft of joint
    sawCutMin:    { low: 150, typ: 175, high: 225 },    // flat minimum
    cureSeal:     { low: 0.25, typ: 0.50, high: 1.00 }   // per sq ft
  };

  /* ---------- Regional multipliers on ready-mix + labor ---------- */
  var REGIONS = {
    national: { label: "National average", readyMix: 1.00, labor: 1.00 },
    southeast:{ label: "Southeast (FL, GA, AL)", readyMix: 0.90, labor: 0.90 },
    midwest:  { label: "Midwest (OH, IN, IL)", readyMix: 0.96, labor: 0.94 },
    southwest:{ label: "Southwest (TX, AZ, NM)", readyMix: 1.00, labor: 0.96 },
    northeast:{ label: "Northeast (NY, MA, PA)", readyMix: 1.10, labor: 1.15 },
    west:     { label: "West Coast (CA, WA, OR)", readyMix: 1.16, labor: 1.25 },
    hawaii:   { label: "Hawaii & remote/island", readyMix: 1.55, labor: 1.40 }
  };

  /* ---------- Project presets: thickness, PSI, reinforcement, finish ---------- */
  var PRESETS = {
    patio:      { label: "Patio", thickness: 4, psi: 3000, reinf: "wire", finish: "broom", base: 4 },
    walkway:    { label: "Walkway / sidewalk", thickness: 4, psi: 3000, reinf: "wire", finish: "broom", base: 4 },
    driveway:   { label: "Driveway (cars)", thickness: 5, psi: 4000, reinf: "rebar", finish: "broom", base: 6 },
    drivewayHvy:{ label: "Driveway (trucks/RV)", thickness: 6, psi: 4000, reinf: "rebar", finish: "broom", base: 6 },
    garage:     { label: "Garage floor", thickness: 5, psi: 4000, reinf: "rebar", finish: "broom", base: 6 },
    shed:       { label: "Shed / AC pad", thickness: 4, psi: 3000, reinf: "wire", finish: "broom", base: 4 },
    pool:       { label: "Pool deck", thickness: 4, psi: 3500, reinf: "rebar", finish: "broom", base: 4 },
    sidewalk:   { label: "Sidewalk", thickness: 4, psi: 3000, reinf: "wire", finish: "broom", base: 4 },
    stamped:    { label: "Decorative / stamped", thickness: 4, psi: 3500, reinf: "wire", finish: "stamped", base: 4 },
    commercial: { label: "Commercial / warehouse", thickness: 6, psi: 4000, reinf: "rebar", finish: "trowel", base: 6 }
  };

  var REINFORCEMENT = {
    none:  { label: "None", rate: 0 },
    fiber: { label: "Fiber mesh (in mix)", rate: "fiberMesh" },
    wire:  { label: "Welded wire mesh", rate: "wireMesh" },
    rebar: { label: "Rebar grid", rate: "rebar" }
  };

  var FINISHES = {
    broom:   "Broom (standard)",
    trowel:  "Smooth trowel",
    stamped: "Stamped / decorative",
    exposed: "Exposed aggregate",
    polished:"Polished / ground"
  };

  /* ---------- Small helpers ---------- */
  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) && n >= 0 ? n : (fallback || 0);
  }
  function round(n, dp) {
    var f = Math.pow(10, dp || 0);
    return Math.round((n + Number.EPSILON) * f) / f;
  }
  function money(n) { return Math.round(n); }
  function band(rate, mult) {
    return { low: rate.low * (mult || 1), typ: rate.typ * (mult || 1), high: rate.high * (mult || 1) };
  }

  /* ---------- Volume ---------- */
  /**
   * shape: one of SHAPES keys.
   * dims: dimensions in FEET and INCHES (call toFeet/toInches first when
   *       the UI is in metric).
   *   rect / footing : length, width, thickness
   *   lshape         : length, width, length2, width2, thickness
   *   circle/column  : diameter, thickness (thickness = height for a column)
   *   wall           : length, thickness (wall width), thickness2 (height)
   *   stairs         : run, rise, width, platform, platformt, risers, thickness
   * Returns { areaSqFt, volumeCuFt, volumeCuYd, perimeterFt, linearFt }
   */
  function volume(shape, d) {
    var t = num(d.thickness) / 12; // feet
    var area = 0, cf = 0, perim = 0, linear = 0;

    if (shape === "circle" || shape === "column") {
      var dia = num(d.diameter);
      var r = dia / 2;
      area = Math.PI * r * r;
      // For a column, "thickness" is the height of the pour.
      cf = area * t;
      perim = Math.PI * dia;
      linear = dia;

    } else if (shape === "lshape") {
      // Full rectangle L1 x W1 with a rectangular notch L2 x W2 removed
      // from one corner. A corner notch preserves the outer perimeter.
      var L1 = num(d.length), W1 = num(d.width);
      var L2 = num(d.length2), W2 = num(d.width2);
      area = Math.max(0, L1 * W1 - L2 * W2);
      cf = area * t;
      perim = 2 * (L1 + W1);

    } else if (shape === "wall") {
      // length x thickness (wall width) x height. Length and height in feet,
      // wall thickness in inches.
      var wl = num(d.length), wt = num(d.thickness) / 12, wh = num(d.thickness2);
      area = wl * wh;               // face area, useful for formwork estimates
      cf = wl * wt * wh;
      perim = 2 * (wl + wh);
      linear = wl;

    } else if (shape === "triangle") {
      // base x height, split into two triangles by the altitude.
      // tritype: "iso" = apex centred over the base (symmetric),
      //          "right" = 90 degrees at one corner.
      var tb = num(d.base), th = num(d.height);
      area = (tb * th) / 2;
      if (d.tritype === "right") {
        perim = tb + th + Math.sqrt(tb * tb + th * th);
      } else {
        var half = tb / 2;
        perim = tb + 2 * Math.sqrt(half * half + th * th);
      }
      cf = area * t;
      linear = tb + th;

    } else if (shape === "stairs") {
      // Solid stepped flight modelled as a triangular prism (run/2 x rise)
      // plus a landing block. For N risers this equals the exact solid-step
      // volume w * d * h * N(N-1)/2, so no approximation is introduced.
      var run = num(d.run), rise = num(d.rise), sw = num(d.width);
      var plat = num(d.platform), platT = num(d.platformt) / 12;
      var flight = sw * (run / 2) * rise;
      var landing = sw * plat * platT;
      cf = flight + landing;
      area = sw * (run + plat);
      perim = 2 * (run + sw);
      linear = run + plat;

    } else {
      // rect and footing share the same geometry
      var L = num(d.length), W = num(d.width);
      area = L * W;
      cf = area * t;
      perim = 2 * (L + W);
      linear = L + W;
    }

    return {
      areaSqFt: area,
      volumeCuFt: cf,
      volumeCuYd: cf / CU_FT_PER_YD,
      perimeterFt: perim,
      linearFt: linear
    };
  }

  /**
   * Sum a list of components into one plan area.
   * Each component is { shape, dims } where dims uses the same units as
   * volume(). Perimeter is the SUM of component perimeters — shared edges
   * between adjacent components are counted twice, because each component
   * still needs its own form on that edge unless it is cast in place.
   */
  function volumeCustom(components) {
    var area = 0, cf = 0, perim = 0, linear = 0;
    (components || []).forEach(function (c) {
      if (!c || !c.shape) return;
      var v = volume(c.shape, c.dims || {});
      area += v.areaSqFt;
      cf += v.volumeCuFt;
      perim += v.perimeterFt;
      linear += v.linearFt;
    });
    return {
      areaSqFt: area,
      volumeCuFt: cf,
      volumeCuYd: cf / CU_FT_PER_YD,
      perimeterFt: perim,
      linearFt: linear
    };
  }

  /**
   * Gravel base volume for a given plan area and base depth.
   * @param areaSqFt plan area in square feet
   * @param depthIn  compacted base depth in inches
   */
  function gravelVolume(areaSqFt, depthIn) {
    var cuFt = areaSqFt * (num(depthIn) / 12);
    return { volumeCuFt: cuFt, volumeCuYd: cuFt / CU_FT_PER_YD };
  }

  /* ---------- Metric output helpers ---------- */
  var SQFT_PER_SQM = 10.763910417;
  var CUM_PER_CUFT = 0.0283168466;

  /** Square feet -> square metres. */
  function sqFtToSqM(sqft) { return num(sqft) / SQFT_PER_SQM; }
  /** Cubic feet -> cubic metres. */
  function cuFtToCuM(cuft) { return num(cuft) * CUM_PER_CUFT; }
  /** Cubic yards -> cubic metres. */
  function cuYdToCuM(cuyd) { return num(cuyd) * 27 * CUM_PER_CUFT; }

  /* ---------- Bags ---------- */
  function bagCount(cuFt, bagSize, wastePct) {
    var w = 1 + num(wastePct) / 100;
    var yieldFt3 = BAG_YIELD[bagSize];
    if (!yieldFt3) return 0;
    return Math.ceil((cuFt * w) / yieldFt3);
  }
  function bagsForAllSizes(cuFt, wastePct) {
    return {
      40: bagCount(cuFt, 40, wastePct),
      50: bagCount(cuFt, 50, wastePct),
      60: bagCount(cuFt, 60, wastePct),
      80: bagCount(cuFt, 80, wastePct)
    };
  }
  function bagsPerYard(bagSize) {
    return Math.round(CU_FT_PER_YD / BAG_YIELD[bagSize]);
  }

  /* ---------- Coverage ---------- */
  // One cubic yard spreads over 324 / thickness_in sq ft.
  function coveragePerYard(thicknessIn) {
    var t = num(thicknessIn);
    if (t <= 0) return 0;
    return round(CU_FT_PER_YD / (t / 12), 1);
  }

  /* ---------- Control joints ---------- */
  // Joint spacing in feet = thickness in inches x 2 to 3 (ACPA/industry rule),
  // capped at 15 ft. Returns linear feet of joint and number of joints.
  function controlJoints(areaSqFt, lengthFt, widthFt, thicknessIn) {
    var t = num(thicknessIn);
    if (t <= 0 || areaSqFt <= 0) return { jointFt: 0, joints: 0, spacingFt: 0 };
    var spacing = Math.min(t * 2.5, 15); // ~2.5x thickness, 15 ft max
    if (spacing < 5) spacing = 5;
    var joints = Math.max(0, Math.ceil(lengthFt / spacing) + Math.ceil(widthFt / spacing) - 2);
    var jointFt = joints * lengthFt;
    return { jointFt: jointFt, joints: joints, spacingFt: round(spacing, 1) };
  }

  /* ---------- Main cost model ---------- */
  /**
   * input: {
   *   shape, length, width, thickness, length2, width2, diameter,
   *   quantity, wastePct, region, psi, reinforcement, finish,
   *   readyMixPrice (override or null), bagPrice80, deliveryFee, shortLoadFee,
   *   pumpTruck (bool), includeBase, baseDepth, includeSitePrep, includeSealer,
   *   planMinYards (plant minimum, default 4)
   * }
   */
  function estimate(input) {
    var i = input || {};
    var region = REGIONS[i.region] || REGIONS.national;
    var qty = Math.max(1, Math.round(num(i.quantity, 1)));
    var wastePct = num(i.wastePct, 10);
    var thickness = num(i.thickness, 4);

    var v = volume(i.shape || "rect", i);
    var area = v.areaSqFt * qty;
    var cuFt = v.volumeCuFt * qty;
    var cuYd = v.volumeCuYd * qty;
    var perimeter = v.perimeterFt * qty;

    var orderYd = cuYd * (1 + wastePct / 100);
    // Ready-mix is sold in quarter-yard increments.
    var orderYdRounded = Math.ceil(orderYd * 4) / 4;

    // ---- Price selection (auto from PSI + region, overridable) ----
    var psi = num(i.psi, 3000);
    var rmBand = PRICES.readyMix[psi] || PRICES.readyMix[3000];
    var rm = band(rmBand, region.readyMix);
    if (i.readyMixPrice != null && i.readyMixPrice !== "") {
      var ovr = num(i.readyMixPrice);
      rm = { low: ovr * 0.92, typ: ovr, high: ovr * 1.12 };
    }

    var deliveryBand = i.deliveryFee != null && i.deliveryFee !== ""
      ? { low: num(i.deliveryFee) * 0.8, typ: num(i.deliveryFee), high: num(i.deliveryFee) * 1.4 }
      : PRICES.delivery;
    var shortLoadBand = i.shortLoadFee != null && i.shortLoadFee !== ""
      ? { low: num(i.shortLoadFee) * 0.75, typ: num(i.shortLoadFee), high: num(i.shortLoadFee) * 1.5 }
      : PRICES.shortLoad;
    var pumpBand = PRICES.pumpTruck;

    var laborBand = band(PRICES.labor, region.labor);
    var baseBand = PRICES.gravelBase;
    var formsBand = PRICES.forms;
    var vbBand = PRICES.vaporBarrier;
    var reinfKey = REINFORCEMENT[i.reinforcement] ? i.reinforcement : "none";
    var reinfBand = reinfKey === "none" ? { low: 0, typ: 0, high: 0 } : PRICES[REINFORCEMENT[reinfKey].rate];
    var finishKey = FINISHES[i.finish] ? i.finish : "broom";
    var finishBand = PRICES.finish[finishKey];
    var cut = controlJoints(v.areaSqFt, num(i.length), num(i.width), thickness);
    var sawBand = PRICES.sawCut;
    var sawMinBand = PRICES.sawCutMin;
    var sealBand = PRICES.cureSeal;
    var prepBand = PRICES.sitePrep;

    var bagPriceBand = i.bagPrice80 != null && i.bagPrice80 !== ""
      ? { low: num(i.bagPrice80) * 0.85, typ: num(i.bagPrice80), high: num(i.bagPrice80) * 1.15 }
      : PRICES.bag80;

    // ---- Build line items ----
    // Each line: { key, label, detail, low, typ, high, show }
    var lines = [];

    lines.push({
      key: "concrete", label: "Ready-mix concrete",
      detail: round(orderYd, 2) + " yd³ @ $" + round(rm.typ, 2) + "/yd³ (" + psi + " PSI)",
      low: orderYd * rm.low, typ: orderYd * rm.typ, high: orderYd * rm.high, cls: "c1"
    });

    // Delivery: charged per load. A standard truck carries ~10 yd³.
    var truckCapacity = 10;
    var loads = Math.max(1, Math.ceil(orderYd / truckCapacity));
    lines.push({
      key: "delivery", label: "Concrete delivery",
      detail: loads + " load" + (loads > 1 ? "s" : "") + " @ $" + round(deliveryBand.typ) + "/load",
      low: loads * deliveryBand.low, typ: loads * deliveryBand.typ, high: loads * deliveryBand.high, cls: "c2"
    });

    // Short-load fee: applies when the order is under the plant's minimum.
    var planMin = num(i.planMinYards, 4);
    var shortApplies = orderYd < planMin;
    if (shortApplies) {
      lines.push({
        key: "shortload", label: "Short-load fee",
        detail: "order under " + planMin + " yd³ plant minimum",
        low: shortLoadBand.low, typ: shortLoadBand.typ, high: shortLoadBand.high, cls: "c6"
      });
    }

    if (i.pumpTruck) {
      lines.push({
        key: "pump", label: "Pump truck",
        detail: "boom pump for backyard or remote access",
        low: pumpBand.low, typ: pumpBand.typ, high: pumpBand.high, cls: "c6"
      });
    }

    if (i.includeSitePrep !== false) {
      lines.push({
        key: "prep", label: "Site prep & excavation",
        detail: "grading, compaction and minor excavation",
        low: area * prepBand.low, typ: area * prepBand.typ, high: area * prepBand.high, cls: "c2"
      });
    }

    if (i.includeBase !== false) {
      var baseDepth = num(i.baseDepth, 4);
      lines.push({
        key: "base", label: "Gravel sub-base",
        detail: baseDepth + " in compacted crushed stone",
        low: area * baseBand.low, typ: area * baseBand.typ, high: area * baseBand.high, cls: "c3"
      });
    }

    lines.push({
      key: "forms", label: "Forms & edge setup",
      detail: round(perimeter, 0) + " linear ft @ $" + round(formsBand.typ, 2) + "/lf",
      low: perimeter * formsBand.low, typ: perimeter * formsBand.typ, high: perimeter * formsBand.high, cls: "c4"
    });

    if (reinfKey !== "none") {
      lines.push({
        key: "rebar", label: "Reinforcement",
        detail: REINFORCEMENT[reinfKey].label + " @ $" + round(reinfBand.typ, 2) + "/sq ft",
        low: area * reinfBand.low, typ: area * reinfBand.typ, high: area * reinfBand.high, cls: "c3"
      });
    }

    lines.push({
      key: "vapor", label: "Vapor barrier",
      detail: "6 mil poly or 10 mil vapor retarder",
      low: area * vbBand.low, typ: area * vbBand.typ, high: area * vbBand.high, cls: "c4"
    });

    lines.push({
      key: "labor", label: "Placing & finishing labor",
      detail: "form, pour, screed, finish, float @ $" + round(laborBand.typ, 2) + "/sq ft",
      low: area * laborBand.low, typ: area * laborBand.typ, high: area * laborBand.high, cls: "c1"
    });

    if (finishBand.typ > 0) {
      lines.push({
        key: "finish", label: "Decorative finish",
        detail: FINISHES[finishKey] + " @ $" + round(finishBand.typ, 2) + "/sq ft",
        low: area * finishBand.low, typ: area * finishBand.typ, high: area * finishBand.high, cls: "c5"
      });
    }

    if (cut.joints > 0) {
      lines.push({
        key: "sawcut", label: "Control joints (saw cut)",
        detail: cut.joints + " joint" + (cut.joints > 1 ? "s" : "") + ", " + round(cut.spacingFt, 1) + " ft spacing",
        low: Math.max(cut.jointFt * sawBand.low, sawMinBand.low),
        typ: Math.max(cut.jointFt * sawBand.typ, sawMinBand.typ),
        high: Math.max(cut.jointFt * sawBand.high, sawMinBand.high), cls: "c4"
      });
    }

    if (i.includeSealer !== false) {
      lines.push({
        key: "seal", label: "Curing compound & sealer",
        detail: "cure + protective seal @ $" + round(sealBand.typ, 2) + "/sq ft",
        low: area * sealBand.low, typ: area * sealBand.typ, high: area * sealBand.high, cls: "c4"
      });
    }

    // ---- Totals ----
    var total = { low: 0, typ: 0, high: 0 };
    lines.forEach(function (l) { total.low += l.low; total.typ += l.typ; total.high += l.high; });

    var perSqFt = {
      low: area > 0 ? total.low / area : 0,
      typ: area > 0 ? total.typ / area : 0,
      high: area > 0 ? total.high / area : 0
    };

    // ---- Bagged alternative ----
    var bags = bagsForAllSizes(cuFt, wastePct);
    var bagCost = {
      low: bags[80] * bagPriceBand.low,
      typ: bags[80] * bagPriceBand.typ,
      high: bags[80] * bagPriceBand.high
    };
    // Ready-mix material only, for a like-for-like material comparison
    var readyMixMaterial = {
      low: orderYd * rm.low + loads * deliveryBand.low + (shortApplies ? shortLoadBand.low : 0),
      typ: orderYd * rm.typ + loads * deliveryBand.typ + (shortApplies ? shortLoadBand.typ : 0),
      high: orderYd * rm.high + loads * deliveryBand.high + (shortApplies ? shortLoadBand.high : 0)
    };

    // ---- Weight ----
    var weightLbs = cuFt * 150; // normal weight concrete ~150 lb/ft3

    return {
      input: i,
      shape: i.shape || "rect",
      quantity: qty,
      areaSqFt: area,
      perimeterFt: perimeter,
      volumeCuFt: cuFt,
      volumeCuYd: cuYd,
      orderCuYd: orderYd,
      orderCuYdRounded: orderYdRounded,
      wastePct: wastePct,
      thickness: thickness,
      coveragePerYard: coveragePerYard(thickness),
      bags: bags,
      bagsPerYard: { 40: bagsPerYard(40), 60: bagsPerYard(60), 80: bagsPerYard(80) },
      weightLbs: weightLbs,
      loads: loads,
      truckCapacity: truckCapacity,
      shortLoadApplies: shortApplies,
      planMinYards: planMin,
      joints: cut,
      lines: lines,
      totals: total,
      perSqFt: perSqFt,
      bagCost: bagCost,
      readyMixMaterial: readyMixMaterial,
      pricePerYd: rm,
      region: region,
      // Flag: bagged material is cheaper than delivered ready-mix
      bagsCheaper: bagCost.typ < readyMixMaterial.typ
    };
  }

  /* ---------- Comparison helper: ready-mix vs bags ---------- */
  function compareOptions(est) {
    var bagTotal = est.bagCost.typ;
    var rmTotal = est.readyMixMaterial.typ;
    return {
      bags: bagTotal,
      readyMix: rmTotal,
      cheaper: bagTotal < rmTotal ? "bags" : "readyMix",
      difference: Math.abs(bagTotal - rmTotal),
      breakevenYd: (function () {
        // Solve for the yardage where bags and ready-mix material cost match.
        var bagPerYd = est.bagsPerYard[80] * est.pricePerYd.typ; // bags per yd x $/bag approx
        return bagPerYd > 0 ? round(rmTotal / Math.max(0.01, bagPerYd), 2) : null;
      })()
    };
  }

  /* ---------- Reference tables (used by the cost-per-sq-ft page) ---------- */
  function thicknessTable(pricePerYd) {
    var p = pricePerYd || 155;
    var rows = [];
    [3, 4, 5, 6, 8].forEach(function (t) {
      var ydPerSqFt = (t / 12) / 27;
      rows.push({
        thickness: t,
        ydPerSqFt: ydPerSqFt,
        coverage: coveragePerYard(t),
        materialPerSqFt: ydPerSqFt * p,
        materialWithWaste: ydPerSqFt * p * 1.1
      });
    });
    return rows;
  }

  function sizeTable(pricePerSqFt, thickness) {
    var sizes = [
      { label: "8 x 8", l: 8, w: 8 }, { label: "10 x 10", l: 10, w: 10 },
      { label: "12 x 12", l: 12, w: 12 }, { label: "10 x 20", l: 10, w: 20 },
      { label: "20 x 20", l: 20, w: 20 }, { label: "20 x 24", l: 20, w: 24 },
      { label: "24 x 24", l: 24, w: 24 }, { label: "30 x 30", l: 30, w: 30 },
      { label: "30 x 50", l: 30, w: 50 }, { label: "40 x 60", l: 40, w: 60 }
    ];
    return sizes.map(function (s) {
      var area = s.l * s.w;
      var yd = area * (thickness / 12) / 27;
      return {
        label: s.label, area: area, cuYd: yd,
        bags80: Math.ceil(yd * 1.1 * est80PerYard()),
        low: area * pricePerSqFt * 0.75,
        typ: area * pricePerSqFt,
        high: area * pricePerSqFt * 1.25
      };
    });
  }
  function est80PerYard() { return bagsPerYard(80); }

  /* ---------- Export ---------- */
  global.PourCost = {
    PRICES: PRICES,
    SHAPES: SHAPES,
    REGIONS: REGIONS,
    PRESETS: PRESETS,
    REINFORCEMENT: REINFORCEMENT,
    FINISHES: FINISHES,
    BAG_YIELD: BAG_YIELD,
    M_TO_FT: M_TO_FT,
    CM_TO_IN: CM_TO_IN,
    volume: volume,
    volumeCustom: volumeCustom,
    gravelVolume: gravelVolume,
    sqFtToSqM: sqFtToSqM,
    cuFtToCuM: cuFtToCuM,
    cuYdToCuM: cuYdToCuM,
    toFeet: toFeet,
    toInches: toInches,
    formatDim: formatDim,
    bagCount: bagCount,
    bagsForAllSizes: bagsForAllSizes,
    bagsPerYard: bagsPerYard,
    coveragePerYard: coveragePerYard,
    controlJoints: controlJoints,
    estimate: estimate,
    compareOptions: compareOptions,
    thicknessTable: thicknessTable,
    sizeTable: sizeTable,
    round: round,
    num: num
  };
})(typeof window !== "undefined" ? window : this);
