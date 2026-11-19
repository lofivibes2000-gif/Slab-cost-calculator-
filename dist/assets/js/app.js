/* ==========================================================================
   PourCost — shared app bootstrap
   Nav, FAQ rendering, FAQPage schema injection, small UI utilities.
   ========================================================================== */
(function () {
  "use strict";

  var SITE_URL = "https://pourcost.com";
  var SITE_NAME = "PourCost";

  /* ---------- Mobile nav ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- FAQ: render visible accordion + inject FAQPage schema ---------- */
  function initFaq() {
    var mount = document.getElementById("faq-list");
    if (!mount || !window.PourCostFaq) return;

    var pageKey = document.body.getAttribute("data-page") || "index";
    var items = window.PourCostFaq.renderFaq(pageKey, mount);

    // Inject FAQPage structured data, matched to the visible content exactly.
    var schema = window.PourCostFaq.buildFaqSchema(pageKey, SITE_URL);
    var el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(el);

    // Mark the FAQ section for the WebApplication schema on the main tool.
    var countEl = document.getElementById("faq-count");
    if (countEl) countEl.textContent = items.length;
  }

  /* ---------- Utility: element by id ---------- */
  function $(id) { return document.getElementById(id); }

  /* ---------- Utility: read a number from an input, falling back ---------- */
  function val(id, fallback) {
    var el = $(id);
    if (!el) return fallback;
    var n = parseFloat(el.value);
    return isFinite(n) ? n : fallback;
  }
  function str(id, fallback) {
    var el = $(id);
    if (!el) return fallback;
    return el.value || fallback;
  }
  function checked(id) {
    var el = $(id);
    return !!(el && el.checked);
  }

  /* ---------- Utility: money ---------- */
  function money(n, dp) {
    var d = dp === undefined ? 0 : dp;
    return "$" + (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString("en-US", {
      minimumFractionDigits: d, maximumFractionDigits: d
    });
  }
  function num(n, dp) {
    var d = dp === undefined ? 2 : dp;
    return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString("en-US", {
      minimumFractionDigits: d, maximumFractionDigits: d
    });
  }

  /* ---------- Utility: copy to clipboard ---------- */
  function copyText(text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    var y = String(new Date().getFullYear());
    Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
      el.textContent = y;
    });
  }

  /* ---------- Smooth-scroll for in-page links that respect reduced motion ---------- */
  function initAnchors() {
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", id);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initFaq();
    initYear();
    initAnchors();
    if (window.PourCostPages) window.PourCostPages.init();
  });

  window.PourCostApp = {
    $: $, val: val, str: str, checked: checked,
    money: money, num: num, copyText: copyText,
    SITE_URL: SITE_URL, SITE_NAME: SITE_NAME
  };
})();
