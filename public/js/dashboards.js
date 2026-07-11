/* Aberdeen Advisors — dashboard demos (synthetic data, rendered as SVG) */
(function () {
  "use strict";

  var C = {
    navy: "#09375F", teal: "#44B0B1", tealBright: "#00B3B2", blue: "#0072AD",
    good: "#00A676", bad: "#D85049", gold: "#F7CE01", cyan: "#03CBFF",
    muted: "#605E5C", grid: "#EBEBEB", text: "#201F1E"
  };

  function el(id) { return document.getElementById(id); }
  function svgOpen(w, h) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" role="img">';
  }
  function txt(x, y, s, size, fill, anchor, weight) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + (fill || C.muted) +
      '" text-anchor="' + (anchor || "start") + '"' + (weight ? ' font-weight="' + weight + '"' : "") + ">" + s + "</text>";
  }
  function line(x1, y1, x2, y2, stroke, w, dash) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke +
      '" stroke-width="' + (w || 1) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
  }
  function rect(x, y, w, h, fill, rx) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" rx="' + (rx || 0) + '"/>';
  }

  /* ---------- generic charts ---------- */

  // grouped/single column chart. series: [{name,color,values[]}]
  function columnChart(opts) {
    var W = opts.w || 560, H = opts.h || 240, padL = 34, padR = 8, padT = 14, padB = 34;
    var cw = W - padL - padR, ch = H - padT - padB;
    var max = opts.max || Math.max.apply(null, opts.series.flatMap(function (s) { return s.values; })) * 1.15;
    var n = opts.labels.length, groupW = cw / n;
    var out = svgOpen(W, H);
    // gridlines
    for (var g = 0; g <= 4; g++) {
      var gy = padT + ch - (ch * g) / 4;
      out += line(padL, gy, W - padR, gy, C.grid, 1);
      out += txt(padL - 6, gy + 3, opts.fmt ? opts.fmt((max * g) / 4) : Math.round((max * g) / 4), 9, C.muted, "end");
    }
    var bw = Math.min(18, (groupW * 0.7) / opts.series.length);
    opts.labels.forEach(function (lab, i) {
      var cx = padL + groupW * i + groupW / 2;
      var total = bw * opts.series.length + 3 * (opts.series.length - 1);
      opts.series.forEach(function (s, si) {
        var v = s.values[i], bh = (v / max) * ch;
        var bx = cx - total / 2 + si * (bw + 3);
        out += rect(bx, padT + ch - bh, bw, bh, s.color, 2);
      });
      out += txt(cx, H - padB + 14, lab, 9, C.muted, "middle");
    });
    // legend
    if (opts.series.length > 1) {
      var lx = padL;
      opts.series.forEach(function (s) {
        out += rect(lx, H - 12, 9, 9, s.color, 2);
        out += txt(lx + 13, H - 4, s.name, 9, C.muted);
        lx += 13 + s.name.length * 5.4 + 16;
      });
    }
    return out + "</svg>";
  }

  // line/area chart. series: [{name,color,values[],area,dash}]
  function lineChart(opts) {
    var W = opts.w || 460, H = opts.h || 230, padL = 36, padR = 10, padT = 14, padB = 34;
    var cw = W - padL - padR, ch = H - padT - padB;
    var all = opts.series.flatMap(function (s) { return s.values; });
    var max = opts.max || Math.max.apply(null, all) * 1.12;
    var n = opts.labels.length;
    function px(i) { return padL + (cw * i) / (n - 1); }
    function py(v) { return padT + ch - (v / max) * ch; }
    var out = svgOpen(W, H);
    for (var g = 0; g <= 4; g++) {
      var gy = padT + ch - (ch * g) / 4;
      out += line(padL, gy, W - padR, gy, C.grid, 1);
      out += txt(padL - 6, gy + 3, opts.fmt ? opts.fmt((max * g) / 4) : Math.round((max * g) / 4), 9, C.muted, "end");
    }
    opts.labels.forEach(function (lab, i) {
      if (n > 8 && i % 2 === 1) return;
      out += txt(px(i), H - padB + 14, lab, 9, C.muted, "middle");
    });
    opts.series.forEach(function (s) {
      var pts = s.values.map(function (v, i) { return px(i) + "," + py(v); }).join(" ");
      if (s.area) {
        out += '<polygon points="' + padL + "," + (padT + ch) + " " + pts + " " + px(n - 1) + "," + (padT + ch) +
          '" fill="' + s.color + '" opacity="0.12"/>';
      }
      out += '<polyline points="' + pts + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"' +
        (s.dash ? ' stroke-dasharray="5 4"' : "") + "/>";
      s.values.forEach(function (v, i) {
        out += '<circle cx="' + px(i) + '" cy="' + py(v) + '" r="2.6" fill="' + s.color + '"/>';
      });
    });
    if (opts.series.length > 1) {
      var lx = padL;
      opts.series.forEach(function (s) {
        out += line(lx, H - 7, lx + 14, H - 7, s.color, 2.5, s.dash ? "5 4" : null);
        out += txt(lx + 18, H - 4, s.name, 9, C.muted);
        lx += 18 + s.name.length * 5.4 + 16;
      });
    }
    return out + "</svg>";
  }

  // horizontal bars: items [{label,value,color,note}]
  function barChart(opts) {
    var W = opts.w || 460, rowH = opts.rowH || 26, padL = opts.padL || 130, padR = 46, padT = 6;
    var H = padT + opts.items.length * rowH + 6;
    var cw = W - padL - padR;
    var max = opts.max || Math.max.apply(null, opts.items.map(function (d) { return d.value; })) * 1.05;
    var out = svgOpen(W, H);
    opts.items.forEach(function (d, i) {
      var y = padT + i * rowH, bh = rowH - 9;
      out += txt(padL - 8, y + bh / 2 + 4, d.label, 9.5, C.text, "end");
      out += rect(padL, y, cw, bh, "#F1F1F1", 3);
      out += rect(padL, y, Math.max(3, (d.value / max) * cw), bh, d.color || C.tealBright, 3);
      out += txt(padL + (d.value / max) * cw + 6, y + bh / 2 + 4, opts.fmt ? opts.fmt(d.value) : d.value, 9.5, C.muted);
    });
    return out + "</svg>";
  }

  // donut: items [{label,value,color}]
  function donut(opts) {
    var W = opts.w || 420, H = opts.h || 210, cx = 105, cy = H / 2, r = 72, sw = 30;
    var total = opts.items.reduce(function (a, d) { return a + d.value; }, 0);
    var out = svgOpen(W, H), a0 = -Math.PI / 2;
    opts.items.forEach(function (d) {
      var a1 = a0 + (d.value / total) * Math.PI * 2;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      out += '<path d="M ' + x0 + " " + y0 + " A " + r + " " + r + " 0 " + large + " 1 " + x1 + " " + y1 +
        '" fill="none" stroke="' + d.color + '" stroke-width="' + sw + '"/>';
      a0 = a1 + 0.02;
    });
    out += txt(cx, cy - 2, opts.centerBig, 22, C.text, "middle", 700);
    out += txt(cx, cy + 16, opts.centerSmall, 9, C.muted, "middle");
    var ly = cy - (opts.items.length * 22) / 2 + 10;
    opts.items.forEach(function (d) {
      out += rect(215, ly - 9, 10, 10, d.color, 2);
      out += txt(231, ly, d.label, 10, C.text);
      out += txt(W - 8, ly, Math.round((d.value / total) * 100) + "%", 10, C.muted, "end", 600);
      ly += 22;
    });
    return out + "</svg>";
  }

  // funnel: stages [{label,value}]
  function funnel(opts) {
    var W = opts.w || 560, rowH = 30, padL = 172, padR = 52, padT = 4;
    var H = padT + opts.stages.length * rowH + 4;
    var cw = W - padL - padR;
    var max = opts.stages[0].value;
    var out = svgOpen(W, H);
    opts.stages.forEach(function (s, i) {
      var y = padT + i * rowH, bh = rowH - 9;
      var w = Math.max(6, (s.value / max) * cw);
      var t = i / Math.max(1, opts.stages.length - 1);
      var color = i === opts.stages.length - 1 ? C.good : "rgba(0,114,173," + (1 - t * 0.55).toFixed(2) + ")";
      out += txt(padL - 8, y + bh / 2 + 4, s.label, 9.5, C.text, "end");
      out += rect(padL + (cw - w) / 2, y, w, bh, color, 3);
      out += txt(padL + cw + 8, y + bh / 2 + 4, s.value.toLocaleString(), 9.5, C.muted);
      if (i > 0) {
        var conv = Math.round((s.value / opts.stages[i - 1].value) * 100);
        out += txt(padL + (cw - w) / 2 + w / 2, y + bh / 2 + 3.5, conv + "%", 8.5, "#FFFFFF", "middle", 600);
      }
    });
    return out + "</svg>";
  }

  function kpi(label, value, delta, cls) {
    return '<div class="kpi ' + (cls || "") + '"><div class="kpi-label">' + label +
      '</div><div class="kpi-value">' + value + "</div>" +
      (delta ? '<div class="kpi-delta ' + delta.dir + '">' + delta.text + "</div>" : "") + "</div>";
  }

  /* ================= CIO HUB ================= */

  var sprints = ["26.2.1", "26.2.2", "26.2.3", "26.2.4", "26.2.5", "26.2.6"];

  el("cio-kpis").innerHTML =
    kpi("Say / Do Ratio", "92.4%", { dir: "up", text: "▲ 3.1 pts vs prior sprint" }, "k-good") +
    kpi("Avg Cycle Time", "6.8 <span style='font-size:0.8rem'>days</span>", { dir: "up", text: "▼ 0.9 days vs PI avg" }) +
    kpi("Avg Lead Time", "11.2 <span style='font-size:0.8rem'>days</span>", { dir: "up", text: "▼ 1.4 days vs PI avg" }) +
    kpi("Throughput / Month", "148", { dir: "up", text: "▲ 12 items vs prior month" }) +
    kpi("Initiatives On Track", "14 <span style='font-size:0.8rem'>of 18</span>", null, "k-warn") +
    kpi("Sprint Churn", "4.6%", { dir: "down", text: "▲ 1.2 pts — watch item" }, "k-bad");

  el("cio-saydo").innerHTML = columnChart({
    labels: sprints,
    series: [
      { name: "Committed SP", color: C.navy, values: [212, 224, 218, 236, 228, 241] },
      { name: "Completed SP (In-Sprint)", color: C.tealBright, values: [183, 201, 189, 214, 209, 223] }
    ]
  });

  var teams = [
    { team: "Falcon", domain: "Client Experience", health: "on-track", saydo: 94 },
    { team: "Meridian", domain: "Data & Analytics", health: "on-track", saydo: 91 },
    { team: "Atlas", domain: "Core Platform", health: "at-risk", saydo: 78 },
    { team: "Harbor", domain: "Payments", health: "on-track", saydo: 96 },
    { team: "Summit", domain: "Security & Pricing", health: "on-track", saydo: 89 },
    { team: "Beacon", domain: "Infrastructure", health: "off-track", saydo: 64 },
    { team: "Quarry", domain: "Data Engineering", health: "on-track", saydo: 92 }
  ];
  el("cio-health").innerHTML =
    '<table class="health-table"><thead><tr><th>Team</th><th>Domain</th><th>Health</th><th>Say/Do</th></tr></thead><tbody>' +
    teams.map(function (t) {
      var label = t.health === "on-track" ? "On Track" : t.health === "at-risk" ? "At Risk" : "Off Track";
      return "<tr><td><b>" + t.team + "</b></td><td>" + t.domain + '</td><td><span class="badge ' + t.health + '">' + label +
        '</span></td><td><div class="mini-bar"><i style="width:' + t.saydo + "%;background:" +
        (t.saydo >= 85 ? C.tealBright : t.saydo >= 70 ? C.gold : C.bad) + '"></i></div></td></tr>';
    }).join("") + "</tbody></table>";

  el("cio-burnup").innerHTML = lineChart({
    labels: ["Jan 04", "Jan 11", "Jan 18", "Jan 25", "Feb 01", "Feb 08", "Feb 15", "Feb 22"],
    series: [
      { name: "Scope", color: C.muted, values: [640, 648, 655, 660, 668, 672, 675, 678], dash: true },
      { name: "Completed", color: C.tealBright, values: [95, 178, 262, 341, 415, 492, 561, 628], area: true }
    ]
  });

  el("cio-cycle").innerHTML = columnChart({
    w: 420, labels: sprints,
    series: [{ name: "Cycle days", color: C.blue, values: [8.4, 7.9, 8.1, 7.2, 7.0, 6.8] }],
    fmt: function (v) { return v.toFixed ? v.toFixed(0) : v; }
  });

  el("cio-churn").innerHTML = barChart({
    w: 330, padL: 96,
    items: [
      { label: "Scope adds", value: 31, color: C.blue },
      { label: "Reassignments", value: 22, color: C.tealBright },
      { label: "Removals", value: 14, color: C.gold },
      { label: "Splits", value: 9, color: C.navy }
    ]
  });

  el("cio-ai").innerHTML = [
    "A banner is being added to the client fee tool to communicate transfer cut-off dates, improving transparency ahead of quarter close.",
    "Resource reallocation is recommended for team <b>Beacon</b> — two consecutive sprints below 70% say/do with rising churn.",
    "A critical RAID item is open on the <b>Householding App Migration</b>; a go/no-go decision is required before Sprint 26.3.1.",
    "Vendor onboarding for the trading-connectivity initiative needs immediate attention — contract review is the current blocker.",
    "Cycle time has improved 19% since PI start, driven by smaller story slicing across the Data & Analytics domain.",
    "SRE dashboard delivery slipped one sprint after staffing changes; recovery plan brings completion back within the PI."
  ].map(function (s) { return "<li>" + s + "</li>"; }).join("");

  /* ================= ONBOARDING & LICENSING ================= */

  el("onb-kpis").innerHTML =
    kpi("Total Contractors", "4,862", { dir: "up", text: "▲ 214 this quarter" }) +
    kpi("Active Producers", "3,391", { dir: "up", text: "▲ 4.2% vs last quarter" }, "k-good") +
    kpi("In-Progress Cases", "918", null) +
    kpi("Blocked Cases", "57", { dir: "down", text: "▲ 9 — needs attention" }, "k-bad") +
    kpi("Avg Activation Days", "23.4", { dir: "up", text: "▼ 2.1 days vs target 25" }, "k-good") +
    kpi("SLA Breach Rate", "3.1%", { dir: "up", text: "▼ 1.8 pts vs last quarter" }) +
    kpi("Open Cases at High Risk <span style='font-size:0.7rem;opacity:.75'>ML</span>", "142", { dir: "down", text: "▲ 18 flagged this week" }, "k-bad") +
    kpi("Predicted New Breaches <span style='font-size:0.7rem;opacity:.75'>ML · next 30d</span>", "39", { dir: "down", text: "Forecast · 92% recall" }, "k-warn");

  el("onb-funnel").innerHTML = funnel({
    stages: [
      { label: "Offer Accepted", value: 1486 },
      { label: "Documents Submitted", value: 1402 },
      { label: "Background Check", value: 1387 },
      { label: "Fingerprinting", value: 1253 },
      { label: "FINRA Registration", value: 1044 },
      { label: "Insurance Licensing", value: 942 },
      { label: "Carrier Appointment", value: 861 },
      { label: "Training Complete", value: 792 },
      { label: "Ready to Sell", value: 748 }
    ]
  });

  el("onb-finra").innerHTML = donut({
    items: [
      { label: "Approved", value: 2647, color: C.good },
      { label: "Pending", value: 512, color: C.gold },
      { label: "Deficient", value: 174, color: C.bad },
      { label: "Withdrawn", value: 88, color: C.muted }
    ],
    centerBig: "77.4%", centerSmall: "APPROVAL RATE"
  });

  el("onb-expiry").innerHTML = barChart({
    w: 420, padL: 104,
    items: [
      { label: "0–30 days", value: 118, color: C.bad },
      { label: "31–60 days", value: 205, color: C.gold },
      { label: "61–90 days", value: 274, color: C.tealBright },
      { label: "> 90 days", value: 2794, color: C.navy }
    ],
    fmt: function (v) { return v.toLocaleString(); }
  });

  el("onb-sla").innerHTML = lineChart({
    w: 420,
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    series: [
      { name: "Breach %", color: C.bad, values: [6.8, 6.1, 5.9, 5.4, 5.6, 4.9, 4.4, 4.6, 3.9, 3.6, 3.4, 3.1], area: true },
      { name: "Target", color: C.muted, values: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], dash: true }
    ],
    fmt: function (v) { return v.toFixed ? v.toFixed(0) + "%" : v + "%"; }
  });

  el("onb-firms").innerHTML = barChart({
    w: 420, padL: 138,
    items: [
      { label: "Lighthouse Financial", value: 486, color: C.navy },
      { label: "Crestline Advisors", value: 402, color: C.blue },
      { label: "Bluewater Group", value: 356, color: C.tealBright },
      { label: "Summit Annuity", value: 289, color: C.teal },
      { label: "Heritage Insurance", value: 241, color: C.cyan },
      { label: "All Others", value: 1617, color: "#B9C6D0" }
    ],
    fmt: function (v) { return v.toLocaleString(); }
  });

  el("onb-ml-drivers").innerHTML = barChart({
    w: 620, padL: 200,
    items: [
      { label: "Days stuck in stage", value: 8.1, color: C.bad },
      { label: "Stage SLAs breached", value: 5.6, color: C.bad },
      { label: "Credit check exception", value: 1.7, color: C.gold },
      { label: "Stalled-onboarding alert", value: 1.2, color: C.gold },
      { label: "Criminal check flag", value: 0.9, color: C.muted }
    ],
    fmt: function (v) { return v.toFixed(1); }
  });

  el("onb-ml-firms").innerHTML = barChart({
    w: 620, padL: 200,
    items: [
      { label: "Northstar Wealth Partners", value: 41, color: C.bad },
      { label: "Prairie State Insurance", value: 34, color: C.bad },
      { label: "Summit Life & Annuity", value: 29, color: C.gold },
      { label: "Keystone Advisory Network", value: 26, color: C.gold },
      { label: "Pinnacle Financial Advisors", value: 22, color: C.gold },
      { label: "Evergreen Insurance Group", value: 18, color: C.tealBright },
      { label: "BlueRiver Securities", value: 15, color: C.tealBright },
      { label: "Guardian Peak Financial", value: 12, color: C.teal }
    ],
    fmt: function (v) { return v + "%"; }
  });

  /* ================= AI DELIVERY INSIGHTS ================= */

  el("ai-kpis").innerHTML =
    kpi("Avg Delivery Score", "8.4 <span style='font-size:0.8rem'>/ 10</span>", { dir: "up", text: "▲ 0.6 vs last PI" }, "k-good") +
    kpi("Initiatives Scored", "76", null) +
    kpi("Documents Indexed", "12,438", { dir: "up", text: "▲ 812 this month" }) +
    kpi("Agent Queries / Wk", "1,204", { dir: "up", text: "▲ 22% vs last month" }, "k-good") +
    kpi("Citation Accuracy", "96.2%", { dir: "up", text: "▲ 1.4 pts" }, "k-good") +
    kpi("Path-to-Green Coverage", "89%", null, "k-warn");

  el("ai-talking").innerHTML = [
    "Two initiatives moved from <b>Off Track → At Risk</b> this week — narrative attributes recovery to resource reallocation flagged in RAID two sprints ago.",
    "Middleware modernization remains the largest exposure — Kong migration and API gateway consolidation together represent 34% of at-risk budget.",
    "Cycle time is trending down across five of seven domains; the AI narrative highlights smaller story slicing as the dominant driver.",
    "A new critical RAID item has emerged around vendor onboarding — the agent surfaced this from a status doc uploaded 48 hours ago.",
    "Path-to-green commitments show 12 near-term dates within the next 30 days — three lack named owners and were flagged for follow-up.",
    "Portfolio burn is 27.9% YTD against 42.2% completion — the delivery narrative notes this as healthy pacing given the front-loaded discovery phase."
  ].map(function (s) { return "<li>" + s + "</li>"; }).join("");

  var scoredInits = [
    { name: "Customer Experience Overlay", score: 9.6, health: "on-track" },
    { name: "Insurance Compliance Program", score: 9.2, health: "on-track" },
    { name: "Householding App Migration", score: 8.7, health: "on-track" },
    { name: "Portfolio Data Consumption", score: 8.4, health: "on-track" },
    { name: "Advisor Onboarding Automation", score: 7.9, health: "at-risk" },
    { name: "Middleware Modernization", score: 6.4, health: "at-risk" },
    { name: "Data Center Migration", score: 5.7, health: "off-track" }
  ];
  el("ai-scores").innerHTML =
    '<table class="health-table"><thead><tr><th>Initiative</th><th>AI Score</th><th>Health</th><th>Trend</th></tr></thead><tbody>' +
    scoredInits.map(function (t) {
      var lab = t.health === "on-track" ? "On Track" : t.health === "at-risk" ? "At Risk" : "Off Track";
      var barColor = t.score >= 8.5 ? C.good : t.score >= 7 ? C.tealBright : t.score >= 6 ? C.gold : C.bad;
      return "<tr><td><b>" + t.name + "</b></td>" +
        '<td><div class="mini-bar" style="min-width:120px"><i style="width:' + (t.score * 10) + "%;background:" + barColor + '"></i></div>' +
        '<span style="font-size:0.7rem;color:#605E5C;margin-left:6px;">' + t.score.toFixed(1) + "</span></td>" +
        '<td><span class="badge ' + t.health + '">' + lab + "</span></td>" +
        "<td style='font-size:0.72rem;color:#00795A;'>▲ 0." + ((t.score * 10) % 9 + 1).toFixed(0) + "</td></tr>";
    }).join("") + "</tbody></table>";

  el("ai-dist").innerHTML = barChart({
    w: 380, padL: 96,
    items: [
      { label: "9.0 – 10.0", value: 14, color: C.good },
      { label: "8.0 – 8.9", value: 22, color: C.tealBright },
      { label: "7.0 – 7.9", value: 19, color: C.blue },
      { label: "6.0 – 6.9", value: 11, color: C.gold },
      { label: "< 6.0", value: 6, color: C.bad }
    ]
  });

  el("ai-narrative").innerHTML =
    '<div class="ai-narr-head"><span class="ai-narr-init">Portfolio Data Consumption</span>' +
    '<span class="ai-narr-score">Delivery Score <b>8.4</b> / 10</span></div>' +
    '<p class="ai-narr-body">Overall health is <b>strong</b>. Delivery metrics are within target (Say/Do 79.7%, avg cycle time 9.9 days). ' +
    'Funding of ~$2.0M is materially committed but paired with steady completion — YTD burn 41% against 47% delivery. ' +
    'RAID documentation is detailed and cites named owners for every open item. The path-to-green identifies two near-term ' +
    'dates (domain sign-off by 6/30, QE lead named by 7/12) as the remaining risks to monitor.</p>' +
    '<div class="ai-narr-cite">Grounded in: <b>3 status reports</b>, <b>1 charter</b>, <b>RAID log (12 items)</b>, <b>sprint telemetry</b></div>';

  el("ai-docs").innerHTML = donut({
    items: [
      { label: "Status reports", value: 4820, color: C.navy },
      { label: "Charters & plans", value: 2140, color: C.blue },
      { label: "RAID / decisions", value: 3180, color: C.tealBright },
      { label: "Meeting notes", value: 1698, color: C.gold },
      { label: "Lessons learned", value: 600, color: C.muted }
    ],
    centerBig: "12.4K", centerSmall: "DOCS INDEXED"
  });

  el("ai-usage").innerHTML = lineChart({
    w: 460,
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
    series: [
      { name: "Agent queries / week", color: C.tealBright, values: [186, 214, 268, 342, 401, 487, 594, 712, 831, 968, 1097, 1204], area: true }
    ],
    fmt: function (v) { return Math.round(v).toLocaleString(); }
  });

  /* ================= DEMAND & INCIDENT MANAGEMENT ================= */

  el("inc-kpis").innerHTML =
    kpi("Total Active Demands", "143", { dir: "up", text: "▲ 12 this month" }) +
    kpi("Active Demands Cost", "$13.9M", { dir: "up", text: "▲ $1.2M vs prior" }) +
    kpi("Critical Active", "4", { dir: "up", text: "▲ 1 — needs review" }, "k-bad") +
    kpi("Due in 30 Days", "3", { dir: "down", text: "▼ 2 vs last week" }, "k-good") +
    kpi("Past Due", "12", { dir: "up", text: "▲ 3 — escalate" }, "k-warn") +
    kpi("Paused", "2", null);

  el("inc-prio").innerHTML = donut({
    items: [
      { label: "Critical", value: 4, color: C.bad },
      { label: "High", value: 38, color: C.gold },
      { label: "Medium", value: 62, color: C.tealBright },
      { label: "Low", value: 39, color: C.muted }
    ],
    centerBig: "143", centerSmall: "ACTIVE DEMANDS"
  });

  el("inc-state").innerHTML = donut({
    items: [
      { label: "Approved", value: 74, color: C.good },
      { label: "In Discovery", value: 32, color: C.blue },
      { label: "Draft", value: 21, color: C.gold },
      { label: "On Hold", value: 16, color: C.muted }
    ],
    centerBig: "$13.9M", centerSmall: "COMMITTED"
  });

  el("inc-port").innerHTML = donut({
    items: [
      { label: "Digital Products", value: 41, color: C.navy },
      { label: "Digital Health", value: 34, color: C.tealBright },
      { label: "Enterprise Data", value: 28, color: C.blue },
      { label: "Infrastructure", value: 22, color: C.teal },
      { label: "Security", value: 18, color: C.cyan }
    ],
    centerBig: "5", centerSmall: "PORTFOLIOS"
  });

  el("inc-vp").innerHTML = columnChart({
    w: 560, h: 240,
    labels: ["Kim A.", "Lee B.", "Ortiz C.", "Patel D.", "Reyes E.", "Singh F.", "Torres G.", "Walsh H.", "Vega I.", "Yates J.", "Zhao K."],
    series: [{ name: "Active demands", color: C.blue, values: [4, 5, 6, 7, 8, 8, 9, 9, 10, 11, 12] }],
    fmt: function (v) { return Math.round(v); }
  });

  el("inc-open").innerHTML = lineChart({
    w: 460,
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    series: [
      { name: "Avg open days", color: C.blue, values: [0, 24, 76, 48, 42, 36, 44, 32], area: true },
      { name: "Target (56 days)", color: C.muted, values: [56, 56, 56, 56, 56, 56, 56, 56], dash: true }
    ],
    fmt: function (v) { return Math.round(v); }
  });

  el("inc-closed").innerHTML = columnChart({
    w: 720, h: 220,
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    series: [{ name: "Closed / completed", color: C.tealBright, values: [4, 5, 3, 7, 11, 6, 3, 5, 4] }],
    fmt: function (v) { return Math.round(v); }
  });

  /* ================= PRICE & MATERIALS INTELLIGENCE ================= */

  el("prc-kpis").innerHTML =
    kpi("Materials w/ Alternatives", "419", { dir: "up", text: "▲ 34 this month" }, "k-good") +
    kpi("Total Potential Savings", "$193.7K", { dir: "up", text: "▲ $22.4K vs last cycle" }, "k-good") +
    kpi("Vendors Analyzed", "490", null) +
    kpi("PO Records Ingested", "8,101", { dir: "up", text: "▲ 421 this month" }) +
    kpi("Avg Savings / Unit", "$286", { dir: "up", text: "▲ 4.2% vs baseline" }, "k-good") +
    kpi("Spec Match Confidence", "94.1%", null, "k-good");

  // bubble chart for savings by material group
  (function () {
    var W = 620, H = 300, padL = 44, padR = 12, padT = 12, padB = 34;
    var cw = W - padL - padR, ch = H - padT - padB;
    var groups = [
      { name: "Manual Valve, Ball", x: 29, y: 52, r: 30 },
      { name: "Manual Valve, Plug", x: 10, y: 24, r: 20 },
      { name: "Manual Valve, Globe", x: 6, y: 26, r: 16 },
      { name: "Inst-Temperature", x: 24, y: 12, r: 22 },
      { name: "Inst-Pressure", x: 30, y: 11, r: 24 },
      { name: "Centrifugal Pump", x: 10, y: 9, r: 14 },
      { name: "Filters-Element", x: 16, y: 4, r: 18 },
      { name: "Valve Actuators", x: 5, y: 4, r: 10 },
      { name: "Bearings", x: 23, y: 3, r: 11 },
      { name: "Gaskets - Equipment", x: 27, y: 2.5, r: 12 },
      { name: "Filters-Demister", x: 3, y: 5.5, r: 8 },
      { name: "Valves - Pump", x: 2, y: 8, r: 7 }
    ];
    var xMax = 32, yMax = 60;
    function px(x) { return padL + (x / xMax) * cw; }
    function py(y) { return padT + ch - (y / yMax) * ch; }
    var out = svgOpen(W, H);
    for (var g = 0; g <= 4; g++) {
      var gy = padT + ch - (ch * g) / 4;
      out += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="' + C.grid + '" stroke-width="1"/>';
      out += '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" font-size="9" fill="' + C.muted + '" text-anchor="end">$' + ((yMax * g) / 4).toFixed(0) + "K</text>";
    }
    for (var i = 0; i <= 4; i++) {
      var xv = (xMax * i) / 4;
      var xx = px(xv);
      out += '<text x="' + xx + '" y="' + (H - padB + 14) + '" font-size="9" fill="' + C.muted + '" text-anchor="middle">' + Math.round(xv) + "</text>";
    }
    out += '<text x="' + (padL + cw / 2) + '" y="' + (H - 4) + '" font-size="9" fill="' + C.muted + '" text-anchor="middle">Potential alternative materials</text>';
    groups.forEach(function (b) {
      out += '<circle cx="' + px(b.x) + '" cy="' + py(b.y) + '" r="' + b.r + '" fill="' + C.blue + '" opacity="0.55" stroke="' + C.navy + '" stroke-width="1"/>';
      out += '<text x="' + px(b.x) + '" y="' + (py(b.y) - b.r - 3) + '" font-size="9" fill="' + C.text + '" text-anchor="middle">' + b.name + "</text>";
    });
    el("prc-bubble").innerHTML = out + "</svg>";
  })();

  el("prc-top").innerHTML = barChart({
    w: 380, padL: 132,
    items: [
      { label: "Manual Valve, Ball", value: 52400, color: C.navy },
      { label: "Manual Valve, Plug", value: 24100, color: C.blue },
      { label: "Manual Valve, Globe", value: 25800, color: C.tealBright },
      { label: "Inst-Pressure", value: 11200, color: C.teal },
      { label: "Inst-Temperature", value: 12300, color: C.cyan },
      { label: "Centrifugal Pump", value: 9100, color: C.gold }
    ],
    fmt: function (v) { return "$" + (v / 1000).toFixed(0) + "K"; }
  });

  el("prc-trend").innerHTML = lineChart({
    w: 520, h: 230,
    labels: ["Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"],
    series: [
      { name: "Vendor A", color: C.navy, values: [38, 12, 12, 12, 12] },
      { name: "Vendor B", color: C.tealBright, values: [30, 6, 4, 4, 4] },
      { name: "Vendor C", color: C.blue, values: [22, 4, 3, 3, 3] },
      { name: "Vendor D", color: C.gold, values: [12, 3, 12, 3, 3] },
      { name: "Vendor E", color: C.bad, values: [6, 4, 4, 4, 4] }
    ],
    fmt: function (v) { return "$" + v + "K"; }
  });

  el("prc-po").innerHTML = columnChart({
    w: 460, h: 230,
    labels: ["Vendor A", "Vendor B", "Vendor C"],
    series: [
      { name: "PO Count", color: C.navy, values: [644, 508, 398] },
      { name: "Invoiced Qty", color: C.good, values: [6397, 5188, 14714] }
    ],
    fmt: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + "K" : v; }
  });

  var alts = [
    { mat: "Valve — Needle 3/4×1/2", cur: "$1,180", curV: "Vendor A", alt: "Valve — Needle 3/4×1/2", altV: "Vendor B", save: "$758" },
    { mat: "Filter — FLTR", cur: "$675", curV: "Vendor C", alt: "Filter — FLTR", altV: "Vendor D", save: "$584" },
    { mat: "Seal — Shaft Oil", cur: "$394", curV: "Vendor E", alt: "Seal — Shaft Oil", altV: "Vendor F", save: "$269" },
    { mat: "Valve Actuator SR", cur: "$1,179", curV: "Vendor G", alt: "Valve Actuator SR", altV: "Vendor H", save: "$468" },
    { mat: "Valve Kit — Linkage", cur: "$112", curV: "Vendor I", alt: "Valve Kit — Linkage", altV: "Vendor J", save: "$51" },
    { mat: "Filter — FLTR (alt)", cur: "$89", curV: "Vendor K", alt: "Filter — FLTR", altV: "Vendor D", save: "$84" }
  ];
  el("prc-alts").innerHTML =
    '<table class="health-table"><thead><tr><th>Material</th><th>Current Price</th><th>Current Vendor</th><th>Alt Material</th><th>Alt Vendor</th><th>Savings / Unit</th></tr></thead><tbody>' +
    alts.map(function (a) {
      return "<tr><td><b>" + a.mat + "</b></td><td>" + a.cur + "</td><td>" + a.curV +
        "</td><td>" + a.alt + "</td><td>" + a.altV +
        "</td><td style='color:#00795A;font-weight:600;'>" + a.save + "</td></tr>";
    }).join("") + "</tbody></table>";

  /* ================= SUPPLY CHAIN (Customer Experience + Vendor Payables) ================= */

  el("sc-kpis").innerHTML =
    kpi("Total Orders", "57,888", { dir: "up", text: "▲ 4.2% vs prior year" }) +
    kpi("Shipped On-Time", "81%", { dir: "up", text: "▼ 3 pts vs target 84%" }, "k-warn") +
    kpi("Avg Ordered → Shipped", "24h 47m", { dir: "up", text: "▼ 1h 12m vs last quarter" }, "k-good") +
    kpi("Invoice Holds", "5,594", { dir: "down", text: "▲ 312 this month" }, "k-bad") +
    kpi("Hold Value", "$41.8M", { dir: "down", text: "▲ $3.4M this month" }, "k-bad") +
    kpi("Avg Hold Time", "17 <span style='font-size:0.8rem'>days</span>", { dir: "up", text: "▼ 2 days vs last quarter" }, "k-good");

  // Orders over time — daily volume, trailing 12 months
  (function () {
    var months = ["Sep 24", "Oct 24", "Nov 24", "Dec 24", "Jan 25", "Feb 25", "Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25"];
    var pts = [];
    for (var i = 0; i < 260; i++) {
      var base = 380 + 60 * Math.sin(i / 6) + 40 * Math.sin(i / 2);
      var noise = (Math.sin(i * 17.3) + Math.cos(i * 7.1)) * 40;
      pts.push(Math.max(120, Math.round(base + noise)));
    }
    var W = 620, H = 250, padL = 40, padR = 12, padT = 12, padB = 34;
    var cw = W - padL - padR, ch = H - padT - padB;
    var maxY = 600;
    function px(i) { return padL + (i / (pts.length - 1)) * cw; }
    function py(v) { return padT + ch - (v / maxY) * ch; }
    var out = svgOpen(W, H);
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (ch * g) / 4;
      out += line(padL, gy, W - padR, gy, C.grid, 1);
      out += txt(padL - 6, gy + 3, (maxY - (maxY * g) / 4).toFixed(0), 9, C.muted, "end");
    }
    for (var m = 0; m < months.length; m++) {
      var mx = padL + (m / (months.length - 1)) * cw;
      out += txt(mx, H - padB + 14, months[m], 8, C.muted, "middle");
    }
    var d = "M" + pts.map(function (v, i) { return px(i) + "," + py(v); }).join(" L");
    out += '<path d="' + d + '" fill="none" stroke="' + C.good + '" stroke-width="1.4"/>';
    el("sc-orders").innerHTML = out + "</svg>";
  })();

  // Order shipment performance — split bar
  (function () {
    var W = 420, H = 250, padL = 90, padR = 12, padT = 16, padB = 20;
    var cw = W - padL - padR;
    var rows = [
      { label: "All DC", on: 81, del: 19, onV: "34,897", delV: "8,200" },
      { label: "ALP", on: 80, del: 20, onV: "22,104", delV: "5,617" },
      { label: "FNO", on: 76, del: 24, onV: "8,650", delV: "2,731" },
      { label: "Dropship", on: 71, del: 29, onV: "10,374", delV: "4,231" }
    ];
    var rh = 34, gap = 8;
    var out = svgOpen(W, H);
    rows.forEach(function (r, i) {
      var y = padT + i * (rh + gap);
      var onW = (r.on / 100) * cw;
      out += txt(padL - 8, y + rh / 2 + 3, r.label, 10, C.text, "end", "600");
      out += rect(padL, y, onW, rh, C.tealBright, 3);
      out += rect(padL + onW, y, cw - onW, rh, C.bad, 3);
      out += txt(padL + 8, y + rh / 2 + 4, r.on + "% · " + r.onV, 10, "#fff", "start", "600");
      out += txt(padL + cw - 8, y + rh / 2 + 4, r.del + "% · " + r.delV, 10, "#fff", "end", "600");
    });
    el("sc-ship").innerHTML = out + "</svg>";
  })();

  el("sc-aging").innerHTML = barChart({
    w: 420, padL: 92,
    items: [
      { label: "1–30 days", value: 252997, color: C.cyan },
      { label: "31–60 days", value: 37989, color: C.good },
      { label: "61–90 days", value: 10651, color: C.gold },
      { label: "90+ days", value: 25011, color: C.bad }
    ],
    fmt: function (v) { return v.toLocaleString(); }
  });

  el("sc-suppliers").innerHTML = barChart({
    w: 420, padL: 156,
    items: [
      { label: "Fillauer Inc", value: 10061, color: C.navy },
      { label: "Ossur Americas", value: 9464, color: C.blue },
      { label: "Otto Bock Health", value: 4483, color: C.tealBright },
      { label: "Proteor", value: 4199, color: C.teal },
      { label: "Acor Orthopaedic", value: 3505, color: C.cyan },
      { label: "Specialty Vermic.", value: 3100, color: "#7A8B94" },
      { label: "Amoena USA", value: 1868, color: "#95A3AA" },
      { label: "Willowwood Global", value: 1538, color: "#B9C6D0" }
    ],
    fmt: function (v) { return "$" + (v / 1000).toFixed(1) + "K"; }
  });

  el("sc-reasons").innerHTML = barChart({
    w: 420, padL: 130,
    items: [
      { label: "Qty Received", value: 31.7, color: C.blue },
      { label: "Others", value: 19.2, color: C.tealBright },
      { label: "Qty Ordered", value: 16.1, color: C.teal },
      { label: "Incomplete Invoice", value: 12.6, color: C.cyan },
      { label: "Max Ship Amount", value: 11.4, color: C.gold },
      { label: "Line Variance", value: 9.2, color: C.bad }
    ],
    fmt: function (v) { return v.toFixed(1) + "%"; }
  });

  el("sc-trend").innerHTML = lineChart({
    w: 620,
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    series: [
      { name: "Holds (count)", color: C.navy, values: [412, 468, 502, 561, 598, 645, 671, 683, 702, 688, 712, 754], area: true },
      { name: "Avg Hold Days", color: C.bad, values: [22, 21, 20, 19, 19, 18, 18, 17, 17, 17, 17, 17], dash: true }
    ],
    fmt: function (v) { return v; }
  });

  /* ================= PMO STAGE GATES ================= */

  el("pmo-kpis").innerHTML =
    kpi("Total Open Projects", "293", { dir: "up", text: "▲ 12 this quarter" }) +
    kpi("In Implementation", "198 <span style='font-size:0.8rem'>· 66%</span>", { dir: "up", text: "▲ 8 vs last month" }, "k-good") +
    kpi("In Study / Design", "11", null) +
    kpi("At Gate Review", "25 <span style='font-size:0.8rem'>· intake+auth</span>", { dir: "up", text: "3 awaiting sign-off" }, "k-warn") +
    kpi("Closed Projects", "6", { dir: "up", text: "▲ 2 this month" }, "k-good") +
    kpi("Deferred / On Hold", "39 <span style='font-size:0.8rem'>· no status</span>", null);

  // Pipeline funnel — 7 stages
  (function () {
    var stages = [
      { name: "Stage 0", label: "Intake Draft", count: 4, pct: "1%", color: "#44B0B1" },
      { name: "Gate 1", label: "Intake Review", count: 19, pct: "6%", color: "#09375F" },
      { name: "Stage 1", label: "Study", count: 11, pct: "4%", color: "#4CA0DE" },
      { name: "Stage 2", label: "Detailed Planning", count: 6, pct: "2%", color: "#B9AEE6" },
      { name: "Gate 2", label: "Project Authorization", count: 6, pct: "2%", color: "#09375F" },
      { name: "Stage 3", label: "Implementation", count: 198, pct: "66%", color: "#44B0B1" },
      { name: "Stage 4", label: "Closure", count: 6, pct: "2%", color: "#7CC6A6" }
    ];
    var W = 920, H = 190, padL = 12, padR = 12, padT = 12, padB = 12;
    var cw = (W - padL - padR - (stages.length - 1) * 8) / stages.length;
    var ch = H - padT - padB;
    var out = svgOpen(W, H);
    stages.forEach(function (s, i) {
      var x = padL + i * (cw + 8);
      out += rect(x, padT, cw, ch, s.color, 6);
      out += txt(x + cw / 2, padT + 22, s.name, 11, "#fff", "middle", "600");
      out += txt(x + cw / 2, padT + 42, s.label, 10, "rgba(255,255,255,0.85)", "middle");
      out += txt(x + cw / 2, padT + 100, String(s.count), 34, "#fff", "middle", "700");
      out += txt(x + cw / 2, padT + 130, s.pct, 12, "rgba(255,255,255,0.85)", "middle", "600");
    });
    el("pmo-pipeline").innerHTML = out + "</svg>";
  })();

  // Simplified Gantt — 12 project rows with timeline bars
  (function () {
    var rows = [
      { name: "Data Optimization Mfg — Data Lakehouse", owner: "Lethlean T.", start: 0, dur: 42, color: "#6B5DA0" },
      { name: "Margin in Stock", owner: "Naillat F.", start: 6, dur: 2, color: "#F7A55E" },
      { name: "Diamond SAP — Upgrade to Ehp8", owner: "Wunder D.", start: 8, dur: 38, color: "#6B5DA0" },
      { name: "SDWAN — Deployment", owner: "Lubera A.", start: 4, dur: 32, color: "#6B5DA0" },
      { name: "DSD — CfME Team of Teams", owner: "Peers D.", start: 10, dur: 22, color: "#44B0B1" },
      { name: "PRD — Patch", owner: "Pitts E.", start: 3, dur: 30, color: "#6B5DA0" },
      { name: "DSD — HCL Inventory · Power BI", owner: "Peers D.", start: 6, dur: 26, color: "#6B5DA0" },
      { name: "PRD — BI Fix Cost", owner: "Naillat F.", start: 14, dur: 3, color: "#F7A55E" },
      { name: "DM — Private 5G Arkema Changshu", owner: "Zhu G.", start: 12, dur: 16, color: "#F7A55E" },
      { name: "IDoc — Monitoring Optimization", owner: "Pitts E.", start: 8, dur: 22, color: "#44B0B1" },
      { name: "DSD — ORA (Occupational Risk)", owner: "Peers D.", start: 16, dur: 24, color: "#6B5DA0" },
      { name: "S4 — AMAS", owner: "Pitts E.", start: 18, dur: 28, color: "#6B5DA0" }
    ];
    var W = 1200, H = 360, padL = 280, padR = 90, padT = 24, padB = 14;
    var cw = W - padL - padR;
    var rh = (H - padT - padB) / rows.length;
    var maxT = 48;
    var today = 26;
    var out = svgOpen(W, H);
    // month markers
    var months = ["Apr 25", "Jul 25", "Oct 25", "Jan 26", "Apr 26", "Jul 26", "Oct 26", "Jan 27"];
    for (var m = 0; m < months.length; m++) {
      var mx = padL + (m / (months.length - 1)) * cw;
      out += line(mx, padT - 6, mx, H - padB, C.grid, 1);
      out += txt(mx, padT - 10, months[m], 11, C.muted, "middle");
    }
    // today line
    var tx = padL + (today / maxT) * cw;
    out += '<line x1="' + tx + '" y1="' + padT + '" x2="' + tx + '" y2="' + (H - padB) + '" stroke="' + C.teal + '" stroke-width="1.4" stroke-dasharray="4 3"/>';
    // rows
    rows.forEach(function (r, i) {
      var y = padT + i * rh;
      out += txt(padL - 10, y + rh / 2 + 4, r.name, 11, C.text, "end");
      var bx = padL + (r.start / maxT) * cw;
      var bw = (r.dur / maxT) * cw;
      out += rect(bx, y + 5, bw, rh - 10, r.color, 3);
      out += txt(bx + bw + 6, y + rh / 2 + 4, r.owner, 10, C.muted, "start");
    });
    el("pmo-gantt").innerHTML = out + "</svg>";
  })();

  (function () {
    var items = [
      { label: "EMEA", value: 172, color: C.navy },
      { label: "AMAS", value: 78, color: C.tealBright },
      { label: "APAC", value: 32, color: C.gold },
      { label: "Global", value: 11, color: C.muted }
    ];
    var W = 320, H = 420, cx = W / 2, cy = 140, r = 108, sw = 42;
    var total = items.reduce(function (a, d) { return a + d.value; }, 0);
    var out = svgOpen(W, H), a0 = -Math.PI / 2;
    items.forEach(function (d) {
      var a1 = a0 + (d.value / total) * Math.PI * 2;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      out += '<path d="M ' + x0 + " " + y0 + " A " + r + " " + r + " 0 " + large + " 1 " + x1 + " " + y1 +
        '" fill="none" stroke="' + d.color + '" stroke-width="' + sw + '"/>';
      a0 = a1 + 0.02;
    });
    out += txt(cx, cy + 4, "293", 38, C.text, "middle", 700);
    out += txt(cx, cy + 26, "OPEN", 11, C.muted, "middle");
    var ly = cy + r + 38;
    items.forEach(function (d) {
      out += rect(24, ly - 9, 12, 12, d.color, 2);
      out += txt(42, ly + 1, d.label, 12, C.text);
      out += txt(W - 20, ly + 1, Math.round((d.value / total) * 100) + "%", 12, C.muted, "end", 600);
      ly += 22;
    });
    el("pmo-region").innerHTML = out + "</svg>";
  })();

  (function () {
    var pmoRows = [
      { id: 1, name: "LAN — Renovation LACH 2026", mgr: "Roulet M.", dept: "Regional Org.", region: "EMEA", stage: "Stage 3", budget: "€23,900" },
      { id: 10, name: "PM — Implementation NL+BE (Eagle 6)", mgr: "Gauthard P.", dept: "Business Apps", region: "EMEA", stage: "Stage 3", budget: "€303,400" },
      { id: 101, name: "Manufacturing Assistance 2026", mgr: "Gacogne F.", dept: "Technical Solutions", region: "EMEA", stage: "Stage 3", budget: "€198,000" },
      { id: 102, name: "WDM — Miniproject 2026", mgr: "Delouzilliere A.", dept: "Technical Solutions", region: "EMEA", stage: "Stage 3", budget: "€30,000" },
      { id: 103, name: "Cyber — PMO 2026", mgr: "Bernou O.", dept: "Cyber Security", region: "EMEA", stage: "Stage 3", budget: "€75,000" },
      { id: 104, name: "Customer — BEST · EDI Expansion", mgr: "Pitts E.", dept: "Business Apps", region: "AMAS", stage: "Stage 3", budget: "$24,649" }
    ];
    el("pmo-table").innerHTML =
      '<table class="health-table"><thead><tr><th>ID</th><th>Project</th><th>Manager</th><th>Delivery Dept</th><th>Region</th><th>Stage</th><th>Budget</th></tr></thead><tbody>' +
      pmoRows.map(function (r) {
        return "<tr><td>" + r.id + "</td><td><b>" + r.name + "</b></td><td>" + r.mgr + "</td><td>" + r.dept +
          "</td><td>" + r.region + '</td><td><span class="badge on-track">' + r.stage + "</span></td><td>" + r.budget + "</td></tr>";
      }).join("") + "</tbody></table>";
  })();

  /* ================= COST CONTROL ================= */

  el("cc-kpis").innerHTML =
    kpi("Total Projects", "299", { dir: "up", text: "▲ 18 vs last quarter" }) +
    kpi("Project Budget", "$28.8M", null) +
    kpi("Cost Estimate", "$3.4M", { dir: "up", text: "▲ $240K this quarter" }, "k-warn") +
    kpi("Resource Cost", "$2.8M", null) +
    kpi("Capital Estimate", "$3.0M", { dir: "up", text: "▲ $180K this quarter" }) +
    kpi("Expense Estimate", "$377.7K", { dir: "up", text: "▼ $22K vs baseline" }, "k-good");

  el("cc-org").innerHTML = barChart({
    w: 620, padL: 190,
    items: [
      { label: "Infra: Service Delivery", value: 399, color: C.navy },
      { label: "IT Operational Excellence", value: 376, color: C.navy },
      { label: "BA: Finance & GASP", value: 361, color: C.navy },
      { label: "TS: Manufacturing", value: 193, color: C.blue },
      { label: "DA: Solution Factory", value: 124.6, color: C.blue },
      { label: "DA: Data", value: 118.9, color: C.blue },
      { label: "TS: R&D", value: 109.5, color: C.blue },
      { label: "DA: BI", value: 100, color: C.blue },
      { label: "Infra: C&H", value: 92.4, color: C.tealBright },
      { label: "Infra: DW", value: 62.3, color: C.tealBright },
      { label: "Cyber: SOC", value: 53, color: C.tealBright },
      { label: "BA: Projects", value: 49.6, color: C.tealBright },
      { label: "Engineering (DT/PT)", value: 45.5, color: C.tealBright }
    ],
    fmt: function (v) { return "$" + v.toFixed(0) + "K"; }
  });

  el("cc-class").innerHTML = barChart({
    w: 620, padL: 200,
    items: [
      { label: "No Budget Classification", value: 1155.6, color: C.navy },
      { label: "BA — Finance — Treasury", value: 330, color: C.navy },
      { label: "BA — HR — ADIS", value: 280, color: C.navy },
      { label: "X-Charged Other", value: 188, color: C.blue },
      { label: "RO — Standard", value: 163.1, color: C.blue },
      { label: "Bostik X-Charged", value: 162.9, color: C.blue },
      { label: "TIS — Industry DT", value: 150.4, color: C.blue },
      { label: "BA — Industry — DDD/D…", value: 131.6, color: C.tealBright },
      { label: "ITS — Delivery & svcs", value: 111.5, color: C.tealBright },
      { label: "TIS — Digital Marketing", value: 105.9, color: C.tealBright },
      { label: "AMAS Digital & Tech…", value: 102.5, color: C.tealBright },
      { label: "BA — Finance — Ctrl…", value: 100, color: C.tealBright },
      { label: "AMAS Business Apps", value: 87, color: C.tealBright }
    ],
    fmt: function (v) { return "$" + v.toFixed(0) + "K"; }
  });

  /* ================= PORTFOLIO FINANCIALS ================= */

  el("fin-kpis").innerHTML =
    kpi("Initiatives w/ Financials", "20", null) +
    kpi("Total EBC Funding", "$25.9M", { dir: "up", text: "▲ $1.8M vs plan" }) +
    kpi("Avg Say/Do (In-Sprint)", "74.1%", { dir: "up", text: "▲ 2.4 pts vs last PI" }, "k-good") +
    kpi("Avg Cycle Time", "9.2 <span style='font-size:0.8rem'>days</span>", { dir: "up", text: "▼ 0.6 days vs last PI" }, "k-good") +
    kpi("Avg Delivery Score", "8.1 <span style='font-size:0.8rem'>/ 10</span>", { dir: "up", text: "▲ 0.4 vs last PI" }, "k-good") +
    kpi("Off-Track Initiatives", "3", { dir: "down", text: "▲ 1 this month" }, "k-bad");

  (function () {
    var initiatives = [
      { name: "Consumer Banking Platform Modernization", ebc: 3944226.7, color: "#003D6A", saydo: "66.7%", cycle: "33.7" },
      { name: "Enterprise Cloud Migration Program", ebc: 3500000, color: "#B54D1A", saydo: "63.7%", cycle: "8.8" },
      { name: "Operations & Maintenance Portfolio 2026", ebc: 3000000, color: "#D8CFB8", saydo: "73.7%", cycle: "6.5" },
      { name: "Unified Client Engagement Framework", ebc: 2637145, color: "#44B0B1", saydo: "77.5%", cycle: "10.4" },
      { name: "Advisor Experience Uplift", ebc: 2297533, color: "#8FBF7D", saydo: "82.9%", cycle: "5.2" },
      { name: "Enterprise Data Consumption Platform", ebc: 2029420, color: "#5FB4FF", saydo: "71.6%", cycle: "9.9" },
      { name: "Retirement Solutions Modernization", ebc: 1993769, color: "#B94040", saydo: "79.7%", cycle: "8.7" },
      { name: "Systems-of-Record Foundation", ebc: 1700000, color: "#F2B23A", saydo: "70.6%", cycle: "8.9" },
      { name: "Standard Client Conversion Program", ebc: 1250000, color: "#C7B6E0", saydo: "71.5%", cycle: "8.3" },
      { name: "Client Personalization Engine", ebc: 815880, color: "#7A8B94", saydo: "80.0%", cycle: "7.0" },
      { name: "Embedded CRM Integration", ebc: 700000, color: "#95A3AA", saydo: "63.9%", cycle: "5.4" },
      { name: "Client Householding Modernization", ebc: 540696, color: "#B9C6D0", saydo: "68.8%", cycle: "8.6" },
      { name: "Non-Purpose Lending Expansion", ebc: 418600, color: "#D3DBE0", saydo: "79.4%", cycle: "8.2" },
      { name: "Insurance Platform Overlay", ebc: 346808, color: "#E6EBEE", saydo: "81.6%", cycle: "6.9" },
      { name: "Vendor-Dependent Integration Track", ebc: 307440, color: "#EFF2F4", saydo: "76.1%", cycle: "7.5" },
      { name: "Advisor Mobile Experience", ebc: 191000, color: "#F5F7F8", saydo: "69.5%", cycle: "7.5" }
    ];
    // donut — taller viewBox + two-column legend below to fill card vertically
    var W = 460, H = 620, cx = W / 2, cy = 200, r = 150, sw = 46;
    var total = initiatives.reduce(function (a, d) { return a + d.ebc; }, 0);
    var out = svgOpen(W, H), a0 = -Math.PI / 2;
    initiatives.forEach(function (d) {
      var a1 = a0 + (d.ebc / total) * Math.PI * 2;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      out += '<path d="M ' + x0 + " " + y0 + " A " + r + " " + r + " 0 " + large + " 1 " + x1 + " " + y1 +
        '" fill="none" stroke="' + d.color + '" stroke-width="' + sw + '"/>';
      a0 = a1 + 0.008;
    });
    out += txt(cx, cy - 6, "$25.9M", 28, C.text, "middle", 700);
    out += txt(cx, cy + 18, "TOTAL EBC", 11, C.muted, "middle");
    // legend: 2 columns below the donut
    var colX = [20, 240], colStart = 400, rowH = 22;
    initiatives.forEach(function (d, i) {
      var col = i < 8 ? 0 : 1;
      var row = i < 8 ? i : i - 8;
      var lx = colX[col], ly = colStart + row * rowH;
      out += rect(lx, ly - 10, 12, 12, d.color, 2);
      out += txt(lx + 18, ly, d.name.length > 26 ? d.name.slice(0, 25) + "…" : d.name, 10, C.text);
    });
    el("fin-donut").innerHTML = out + "</svg>";

    el("fin-table").innerHTML =
      '<table class="health-table"><thead><tr><th>Initiative</th><th>EBC Funding</th><th>Say/Do</th><th>Cycle (days)</th></tr></thead><tbody>' +
      initiatives.map(function (d) {
        return "<tr><td><b>" + d.name + "</b></td><td>$" + (d.ebc / 1000).toFixed(1) + "K</td><td>" + d.saydo +
          "</td><td>" + d.cycle + "</td></tr>";
      }).join("") + "</tbody></table>";
  })();

  (function () {
    var rows = [
      { init: "Advisor Experience Uplift", score: 10.0, tone: "k-good", summary: "Healthy delivery (Say/Do >80%, short cycle). Funding ~$2.3M is material but paired with strong delivery. RAID and highlights include owners, mitigations and a clear path-to-green with near-term dates (domain sign-off by 6/30, appointing a QE lead)." },
      { init: "Insurance Platform Overlay", score: 10.0, tone: "k-good", summary: "Delivery metrics are strong and well within targets. RAID and path-to-green provide clear scope, schedule, approval milestones and budget controls. Financial exposure actively managed, delivery risk low." },
      { init: "Enterprise Cloud Migration Program", score: 6.4, tone: "k-warn", summary: "Say/Do (63.7%) below portfolio target; cycle time acceptable. Middleware modernization is a key drag — Tibco BW to .Net track is off-plan for Sep 30. Path-to-green requires exec reinforcement on API gateway domain commitments." },
      { init: "Consumer Banking Platform Modernization", score: 4.8, tone: "k-bad", summary: "Cycle time (33.7 days) is the highest in the portfolio; Say/Do 66.7%. Root cause: multi-vendor integration on legacy Intraday API — recommend re-scoping the Q3 chunk and adding a second QE reviewer." },
      { init: "Operations & Maintenance Portfolio 2026", score: 7.9, tone: "k-good", summary: "Solid delivery (Say/Do 73.7%, cycle 6.5 days). RAID surfaces routine BAU items. No path-to-green action required. Continue current cadence." }
    ];
    el("fin-ai").innerHTML =
      '<table class="health-table"><thead><tr><th>Initiative</th><th>Delivery Score (/10)</th><th>AI Executive Summary</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var color = r.tone === "k-good" ? "#00795A" : r.tone === "k-warn" ? "#B87500" : "#B7383A";
        return "<tr><td><b>" + r.init + "</b></td><td style='color:" + color + ";font-weight:700;'>" + r.score.toFixed(1) +
          "</td><td>" + r.summary + "</td></tr>";
      }).join("") + "</tbody></table>";
  })();

  /* ================= WORKFORCE MANAGEMENT (Roster View) ================= */

  el("wfm-kpis").innerHTML =
    kpi("Teams Supported", "109", null) +
    kpi("Total Resources", "734", { dir: "up", text: "▲ 24 this PI" }) +
    kpi("Onshore Mix", "71.8%", null, "k-good") +
    kpi("Offshore Mix", "28.2%", null) +
    kpi("Completed Stories", "6,572 <span style='font-size:0.7rem;opacity:.75'>/ 7,242</span>", { dir: "up", text: "91% of committed" }, "k-good") +
    kpi("Completed Story Points", "16.6K <span style='font-size:0.7rem;opacity:.75'>/ 19.0K</span>", { dir: "up", text: "87% of committed" }, "k-good");

  el("wfm-contracts").innerHTML = barChart({
    w: 620, padL: 160,
    items: [
      { label: "FTE", value: 385, color: C.navy },
      { label: "Fixed Bid", value: 335, color: C.blue },
      { label: "W2", value: 45, color: C.gold },
      { label: "Time & Materials", value: 41, color: C.tealBright },
      { label: "C2C", value: 9, color: C.muted }
    ],
    fmt: function (v) { return v.toLocaleString(); }
  });

  (function () {
    var W = 620, H = 200, padL = 20, padR = 20, padT = 60, padB = 40;
    var cw = W - padL - padR;
    var out = svgOpen(W, H);
    var offW = 0.2822 * cw, onW = 0.7178 * cw;
    out += txt(W / 2, 28, "28.2% Offshore  ·  71.8% Onshore (US)", 13, C.text, "middle", 700);
    out += rect(padL, padT, offW, 40, C.navy, 4);
    out += rect(padL + offW, padT, onW, 40, C.gold, 4);
    out += txt(padL + offW / 2, padT + 26, "28.22%", 14, "#fff", "middle", 700);
    out += txt(padL + offW + onW / 2, padT + 26, "71.78%", 14, "#0A2540", "middle", 700);
    out += rect(padL, padT + 58, 12, 12, C.navy, 2);
    out += txt(padL + 20, padT + 68, "Offshore", 11, C.text);
    out += rect(padL + 100, padT + 58, 12, 12, C.gold, 2);
    out += txt(padL + 120, padT + 68, "Onshore — US", 11, C.text);
    el("wfm-onshore").innerHTML = out + "</svg>";
  })();

  (function () {
    var rows = [
      { team: "Investor Protection Squad", res: 7, on: "100.00%", fte: 7, nfte: 0, loc: 5, vend: 1 },
      { team: "Comms Security Squad", res: 9, on: "77.78%", fte: 4, nfte: 5, loc: 5, vend: 3 },
      { team: "Enterprise Security Oversight", res: 7, on: "100.00%", fte: 6, nfte: 1, loc: 4, vend: 2 },
      { team: "Partner Affiliation", res: 1, on: "100.00%", fte: 1, nfte: 0, loc: 1, vend: 1 },
      { team: "Falcon", res: 21, on: "80.95%", fte: 7, nfte: 14, loc: 9, vend: 2 },
      { team: "Compliance Attestations", res: 2, on: "100.00%", fte: 2, nfte: 0, loc: 2, vend: 1 },
      { team: "Advisor Login Services", res: 1, on: "100.00%", fte: 1, nfte: 0, loc: 1, vend: 1 },
      { team: "Batch Operations", res: 1, on: "—", fte: 1, nfte: 0, loc: 1, vend: 1 },
      { team: "Enhanced Login Platform", res: 15, on: "46.67%", fte: 15, nfte: 0, loc: 8, vend: 1 },
      { team: "Managed Production Support", res: 71, on: "9.86%", fte: 0, nfte: 71, loc: 11, vend: 1 },
      { team: "Advisor Workbench Essentials", res: 1, on: "100.00%", fte: 1, nfte: 0, loc: 1, vend: 1 },
      { team: "Advisor Workbench Foundations", res: 1, on: "—", fte: 1, nfte: 0, loc: 1, vend: 1 }
    ];
    el("wfm-table").innerHTML =
      '<table class="health-table"><thead><tr><th>Team</th><th>Resources</th><th>Onshore %</th><th>FTE</th><th>Non-FTE</th><th>Locations</th><th>Vendors</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return "<tr><td><b>" + r.team + "</b></td><td>" + r.res + "</td><td>" + r.on + "</td><td>" + r.fte +
          "</td><td>" + r.nfte + "</td><td>" + r.loc + "</td><td>" + r.vend + "</td></tr>";
      }).join("") + "</tbody></table>";
  })();

  var wfmSprints = ["26.1.1", "26.1.2", "26.1.4", "26.1.5", "26.1.6", "26.2.1", "26.2.2", "26.2.3", "26.2.4", "26.2.5", "26.2.6"];
  el("wfm-saydo").innerHTML = columnChart({
    labels: wfmSprints,
    series: [
      { name: "Committed SP", color: C.navy, values: [1100, 1150, 1400, 1600, 1750, 1850, 2100, 3200, 2500, 2400, 2300] },
      { name: "Completed SP (In-Sprint)", color: C.tealBright, values: [630, 590, 1010, 990, 980, 1220, 1240, 1216, 1550, 1200, 1400] }
    ]
  });

  el("wfm-cycle").innerHTML = lineChart({
    w: 620,
    labels: wfmSprints,
    series: [
      { name: "Average Cycle Days", color: C.navy, values: [9.5, 5.6, 6.5, 8.5, 8.3, 6.8, 8.5, 9.9, 8.1, 6.6, 9.1] },
      { name: "Median Cycle Days", color: C.bad, values: [6.8, 1.0, 2.0, 6.0, 4.9, 3.8, 6.7, 5.2, 4.2, 4.0, 7.0], dash: true }
    ],
    fmt: function (v) { return v.toFixed(1); }
  });

  (function () {
    var ccRows = [
      { name: "WW CMDB Industrialization", mgr: "Pincon P.", dept: "Operational Excellence", region: "EMEA", budget: "—", resource: "$352,000" },
      { name: "WDM — Proxima 2026", mgr: "Delouzilliere A.", dept: "Technical Solutions", region: "EMEA", budget: "€263,205", resource: "—" },
      { name: "WDM — PIM & DAM · Deployment 2026", mgr: "Delouzilliere A.", dept: "Technical Solutions", region: "EMEA", budget: "€19,048", resource: "—" },
      { name: "WDM — Miniproject 2026", mgr: "Delouzilliere A.", dept: "Technical Solutions", region: "EMEA", budget: "€30,000", resource: "—" },
      { name: "WDM — CIAM 2026", mgr: "Delouzilliere A.", dept: "Technical Solutions", region: "EMEA", budget: "€20,000", resource: "$19,721" },
      { name: "WDM — B2B eShop 2026", mgr: "Delouzilliere A.", dept: "Technical Solutions", region: "EMEA", budget: "€120,000", resource: "—" },
      { name: "VERN — Protecsys Update 2026", mgr: "Roulet M.", dept: "Regional Org.", region: "EMEA", budget: "€5,000", resource: "$4,500" },
      { name: "Valerian — IT", mgr: "Schnebelen A.", dept: "Infrastructure Svcs", region: "EMEA", budget: "€116,450", resource: "—" },
      { name: "Transformation des Opérations (Teamwork)", mgr: "Regnier S.", dept: "Infrastructure Svcs", region: "EMEA", budget: "€100,000", resource: "—" }
    ];
    el("cc-table").innerHTML =
      '<table class="health-table"><thead><tr><th>Project</th><th>Manager</th><th>Delivery Dept</th><th>Region</th><th>Project Budget</th><th>Resource Cost</th></tr></thead><tbody>' +
      ccRows.map(function (r) {
        return "<tr><td><b>" + r.name + "</b></td><td>" + r.mgr + "</td><td>" + r.dept +
          "</td><td>" + r.region + "</td><td>" + r.budget + "</td><td>" + r.resource + "</td></tr>";
      }).join("") + "</tbody></table>";
  })();
})();
