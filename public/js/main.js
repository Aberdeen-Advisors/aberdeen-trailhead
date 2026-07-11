/* Aberdeen Advisors — site interactions */
(function () {
  "use strict";

  /* mobile nav */
  var burger = document.querySelector(".nav-burger");
  var links = document.querySelector(".nav-links");
  burger.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") links.classList.remove("open");
  });

  /* dashboard tabs */
  var tabs = document.querySelectorAll(".tab");
  var panels = document.querySelectorAll(".dash-frame[data-panel]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var key = tab.dataset.tab;
      tabs.forEach(function (t) {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab);
      });
      panels.forEach(function (p) {
        p.classList.toggle("hidden", p.dataset.panel !== key);
      });
    });
  });

  /* architecture accordion */
  var diagBlocks = document.querySelectorAll(".arch-d-block");

  function syncDiagram(layerNum, isOpen) {
    diagBlocks.forEach(function (b) {
      b.classList.toggle("active", b.dataset.dlayer === layerNum && isOpen);
    });
  }

  document.querySelectorAll(".arch-layer").forEach(function (layer) {
    layer.addEventListener("click", function () {
      layer.classList.toggle("open");
      syncDiagram(layer.dataset.layer, layer.classList.contains("open"));
    });
  });

  diagBlocks.forEach(function (block) {
    block.addEventListener("click", function () {
      var target = document.querySelector('.arch-layer[data-layer="' + block.dataset.dlayer + '"]');
      if (target) {
        target.click();
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

  /* scroll reveal */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach(function (n) { io.observe(n); });

  /* hero stat count-up */
  var counted = false;
  var statIO = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting || counted) return;
    counted = true;
    document.querySelectorAll(".stat-num").forEach(function (n) {
      var target = parseInt(n.dataset.count, 10);
      var suffix = n.dataset.suffix || "";
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1100, 1);
        n.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  var stats = document.querySelector(".hero-stats");
  if (stats) statIO.observe(stats);
})();
