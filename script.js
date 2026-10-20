var $ = function (id) { return document.getElementById(id); };
var val = function (id) { return (($(id) && $(id).value) || "").trim(); };

(function buildDeps() {
  var rows = [
    ["Name:", "name", '<input type="text" id="d#_name">'],
    ["S/o, D/o, W/o:", "father", '<input type="text" id="d#_father">'],
    ["CNIC No:", "cnic", '<input type="tel" inputmode="numeric" maxlength="15" placeholder="00000-0000000-0" id="d#_cnic" data-mask="cnic">'],
    ["Mobile No:", "mob", '<input type="tel" inputmode="numeric" maxlength="12" placeholder="0300-1234567" id="d#_mob" data-mask="mobile">'],
    ["Address:", "addr", '<textarea rows="2" id="d#_addr"></textarea>']
  ];
  var html = "", i, r;
  for (i = 1; i <= 2; i++) {
    var sep = i === 2 ? " sep" : "";
    html += '<div class="dep-card dp' + i + sep + '">';
    html += '<div class="dhead r1 dp' + i + '">Deponent #' + i + '</div>';
    for (r = 0; r < rows.length; r++) {
      html += '<div class="dfield r' + (r + 2) + ' dp' + i + '">' +
              '<label class="dlab req" for="d' + i + '_' + rows[r][1] + '">' + rows[r][0] + '</label>' +
              '<div class="dval">' + rows[r][2].replace(/#/g, i) + '</div></div>';
    }
    html += '<div id="d' + i + '_relbox" class="drel r7 dp' + i + '">' +
      '<label class="check"><input type="checkbox" name="d' + i + '_rel" value="Neighbor"> Neighbor</label>' +
      '<label class="check"><input type="checkbox" name="d' + i + '_rel" value="Family Member"> Family Member</label></div>';
    html += '</div>';
  }
  if ($("deps")) $("deps").innerHTML = html;
  document.querySelectorAll('.drel input[type=checkbox]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      if (!cb.checked) return;
      document.querySelectorAll('input[name="' + cb.name + '"]').forEach(function (o) { if (o !== cb) o.checked = false; });
    });
  });
})();

function digits(s) { return s.replace(/\D/g, ""); }
function maskCnic(s) {
  var d = digits(s).slice(0, 13);
  if (d.length > 12) return d.slice(0, 5) + "-" + d.slice(5, 12) + "-" + d.slice(12);
  if (d.length > 5) return d.slice(0, 5) + "-" + d.slice(5);
  return d;
}
function maskMobile(s) {
  var d = digits(s).slice(0, 11);
  return d.length > 4 ? d.slice(0, 4) + "-" + d.slice(4) : d;
}
function bindMask(el, fn) { if (el) el.addEventListener("input", function () { el.value = fn(el.value); }); }
if ($("cnic")) bindMask($("cnic"), maskCnic);
if ($("mobile")) bindMask($("mobile"), maskMobile);
document.querySelectorAll('[data-mask="cnic"]').forEach(function (e) { bindMask(e, maskCnic); });
document.querySelectorAll('[data-mask="mobile"]').forEach(function (e) { bindMask(e, maskMobile); });

function years(a, b) {
  if (!a || !b) return "";
  var ms = new Date(b) - new Date(a);
  if (isNaN(ms) || ms < 0) return "";
  var y = Math.floor(ms / (365.25 * 864e5));
  return y < 1 ? "Less than 1" : String(y);
}
["a5", "a6", "a7"].forEach(function (p) {
  if (!$(p + "_from")) return;
  var upd = function () { $(p + "_y").value = years($(p + "_from").value, $(p + "_to").value); };
  $(p + "_from").addEventListener("input", upd);
  $(p + "_to").addEventListener("input", upd);
});
function today() {
  var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
}
["a5", "a6", "a7"].forEach(function (p) {
  if (!$(p + "_birth")) return;
  $(p + "_birth").addEventListener("change", function () {
    if (this.checked) {
      if (!$("dob").value) { toast("Enter your date of birth first."); this.checked = false; return; }
      $(p + "_from").value = $("dob").value; $(p + "_to").value = today();
    } else { $(p + "_from").value = ""; $(p + "_to").value = ""; }
    $(p + "_y").value = years($(p + "_from").value, $(p + "_to").value);
  });
});

if ($("name")) $("name").addEventListener("input", function () { if ($("sigName")) $("sigName").textContent = this.value.trim(); });

if ($("photoInput")) $("photoInput").addEventListener("change", function () {
  var f = this.files && this.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    var old = $("photoBox").querySelector("img"); if (old) old.remove();
    var img = new Image(); img.src = r.result; img.alt = "Applicant photo";
    $("photoBox").appendChild(img); $("photoHint").style.display = "none";
  };
  r.readAsDataURL(f);
});

(function () {
  var ids = ["p_visa", "p_imm", "p_gov", "p_pvt", "p_oth"];
  ids.forEach(function (id) {
    var box = $(id); if (!box) return;
    box.addEventListener("change", function () {
      if (ids.some(function (o) { return $(o) && $(o).checked; })) $("purposeErr").style.display = "none";
      if (!box.checked) return;
      ids.forEach(function (o) {
        if (o === id) return;
        if ($(o)) $(o).checked = false;
        var t = $(o + "_t"); if (t) t.value = "";
      });
    });
    var txt = $(id + "_t");
    if (txt) txt.addEventListener("input", function () {
      if (txt.value.trim() && !box.checked) { box.checked = true; box.dispatchEvent(new Event("change")); }
    });
    var purpose = box.closest(".purpose");
    if (purpose) purpose.addEventListener("click", function (e) {
      var tag = e.target.tagName;
      if (tag === "INPUT" || tag === "LABEL") return;
      box.checked = !box.checked;
      box.dispatchEvent(new Event("change"));
    });
  });
})();

var numMap = {};
function renumber() {
  var k = 0; numMap = {};
  document.querySelectorAll(".row").forEach(function (r) {
    var e = r.firstElementChild;
    if (!e || !e.classList.contains("num")) return;
    if (!e.dataset.n) e.dataset.n = parseInt(e.textContent, 10);
    if (r.style.display === "none") return;
    k++; numMap[e.dataset.n] = k; e.textContent = k + ".";
  });
  document.querySelectorAll(".ref").forEach(function (e) { e.textContent = numMap[e.dataset.n] || e.dataset.n; });
}

function passportOn() { return ($("p_visa") && $("p_visa").checked) || ($("p_imm") && $("p_imm").checked); }
function updatePassport() {
  if ($("passRow")) $("passRow").style.display = passportOn() ? "" : "none";
  renumber(); queueFit();
}
["p_visa", "p_imm", "p_gov", "p_pvt", "p_oth"].forEach(function (id) {
  if ($(id)) $(id).addEventListener("change", updatePassport);
});

var addrCount = 0;
function updateAddr() {
  if ($("addr6Row")) $("addr6Row").style.display = addrCount >= 1 ? "" : "none";
  if ($("addr7Row")) $("addr7Row").style.display = addrCount >= 2 ? "" : "none";
  var btn = $("btnAddAddr");
  if (btn && btn.parentNode) btn.parentNode.style.display = addrCount < 2 ? "" : "none";
  if (btn) btn.textContent = addrCount === 0 ? "+ Add another address (as per CNIC)" : "+ Add one more address";
  var r6 = document.querySelector('[data-rm="6"]');
  var r7 = document.querySelector('[data-rm="7"]');
  if (r6) r6.style.display = addrCount === 1 ? "" : "none";
  if (r7) r7.style.display = addrCount === 2 ? "" : "none";
  renumber(); queueFit();
}
if ($("btnAddAddr")) $("btnAddAddr").addEventListener("click", function () {
  if (addrCount >= 2) return;
  addrCount++; updateAddr();
  var t = $(addrCount === 1 ? "a6" : "a7"); if (t) t.focus();
});
document.querySelectorAll("[data-rm]").forEach(function (b) {
  b.addEventListener("click", function () {
    var p = "a" + b.getAttribute("data-rm");
    if ($(p)) $(p).value = "";
    if ($(p + "_from")) $(p + "_from").value = "";
    if ($(p + "_to")) $(p + "_to").value = "";
    if ($(p + "_y")) $(p + "_y").value = "";
    if ($(p + "_birth")) $(p + "_birth").checked = false;
    addrCount = Math.max(0, addrCount - 1); updateAddr();
  });
});

var tt;
function toast(msg) {
  var t = $("toast"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 3200);
}

function setBad(id, bad) {
  var el = $(id); if (!el) return bad;
  el.classList.toggle("invalid", bad);
  var f = el.closest(".f"); if (f) f.classList.toggle("bad", bad);
  return bad;
}

function validateStep(step) {
  var bad = [];
  if (step === 1) {
    var any = ["p_visa", "p_imm", "p_gov", "p_pvt", "p_oth"].some(function (id) { return $(id) && $(id).checked; });
    if ($("purposeErr")) $("purposeErr").style.display = any ? "none" : "block";
    if (!any) bad.push("purposes");
  }
  if (step === 2) {
    [
      ["name", val("name").length < 3],
      ["caste", val("caste").length < 2],
      ["father", val("father").length < 3],
      ["dob", !val("dob") || val("dob") > today() || val("dob") < "1900-01-01"],
      ["cnic", digits(val("cnic")).length !== 13],
      ["cnic_issue", !val("cnic_issue") || val("cnic_issue") > today()],
      ["cnic_exp", !val("cnic_exp") || (val("cnic_issue") && val("cnic_exp") <= val("cnic_issue"))],
      ["mobile", digits(val("mobile")).length !== 11 || val("mobile").slice(0, 2) !== "03"]
    ].forEach(function (c) { if (setBad(c[0], c[1])) bad.push(c[0]); });
  }
  if (step === 3) {
    if (setBad("a5", val("a5").length < 5)) bad.push("a5");
  }
  if (step === 4) {
    var depIds = [];
    for (var i = 1; i <= 2; i++) {
      var d = "d" + i + "_";
      [["name", val(d + "name").length < 3], ["father", val(d + "father").length < 3],
       ["cnic", digits(val(d + "cnic")).length !== 13],
       ["mob", digits(val(d + "mob")).length !== 11 || val(d + "mob").slice(0, 2) !== "03"],
       ["addr", val(d + "addr").length < 5]].forEach(function (c) {
        if (setBad(d + c[0], c[1])) { bad.push(d + c[0]); depIds.push(d + c[0]); }
      });
      var ok = !!document.querySelector('input[name="d' + i + '_rel"]:checked');
      if ($("d" + i + "_relbox")) $("d" + i + "_relbox").classList.toggle("bad-rel", !ok);
      if (!ok) { bad.push("rel" + i); depIds.push("rel" + i); }
    }
    if ($("depErr")) $("depErr").style.display = depIds.length ? "block" : "none";
  }
  if (step === 5) {
    if ($("agreeErr")) $("agreeErr").style.display = ($("agree") && $("agree").checked) ? "none" : "block";
    if (!$("agree") || !$("agree").checked) bad.push("agree");
  }
  if (bad.length) {
    var first = $(bad[0]) || document.querySelector('[data-step="' + step + '"]');
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Please fix the highlighted fields.");
    return false;
  }
  return true;
}

function validate() {
  for (var s = 1; s <= 5; s++) if (!validateStep(s)) { goStep(s); return false; }
  return true;
}

if ($("appForm")) {
  $("appForm").addEventListener("change", function (e) {
    var t = e.target;
    if (t.name && /_rel$/.test(t.name) && t.closest(".drel")) t.closest(".drel").classList.remove("bad-rel");
  });
  $("appForm").addEventListener("input", function (e) {
    if (e.target.classList.contains("invalid")) setBad(e.target.id, false);
  });
}
if ($("agree")) $("agree").addEventListener("change", function () { if (this.checked && $("agreeErr")) $("agreeErr").style.display = "none"; });

if ($("btnPrint")) $("btnPrint").addEventListener("click", function () {
  if (!validate()) return;
  try { window.print(); } catch (e) { toast("Printing is not available here. Open the link in your browser."); }
});
if ($("btnClear")) $("btnClear").addEventListener("click", function () {
  if (!confirm("Clear everything you have entered?")) return;
  $("appForm").reset();
  var img = $("photoBox") && $("photoBox").querySelector("img"); if (img) img.remove();
  if ($("photoHint")) $("photoHint").style.display = "";
  ["a5_y", "a6_y", "a7_y"].forEach(function (id) { if ($(id)) $(id).value = ""; });
  if ($("sigName")) $("sigName").textContent = "";
  document.querySelectorAll(".invalid").forEach(function (e) { e.classList.remove("invalid"); });
  document.querySelectorAll(".bad").forEach(function (e) { e.classList.remove("bad"); });
  addrCount = 0; updateAddr(); updatePassport();
  if ($("depErr")) $("depErr").style.display = "none";
  document.querySelectorAll(".bad-rel").forEach(function (e) { e.classList.remove("bad-rel"); });
  goStep(1);
  toast("Form cleared.");
});

var TOTAL = 5;
var currentStep = 1;
var stepNames = { 1: "Purpose", 2: "Personal details", 3: "Address", 4: "Witnesses", 5: "Review & Print" };

function isWizard() {
  return !document.documentElement.classList.contains("printing");
}

function goStep(n) {
  currentStep = Math.max(1, Math.min(TOTAL, n));
  document.querySelectorAll(".step").forEach(function (s) {
    var sn = parseInt(s.getAttribute("data-step"), 10);
    if (isWizard()) {
      s.classList.toggle("active", sn === currentStep);
      s.style.display = sn === currentStep ? "" : "none";
    } else {
      s.classList.add("active");
      s.style.display = "";
    }
  });
  if ($("wizFill")) $("wizFill").style.width = ((currentStep / TOTAL) * 100) + "%";
  if ($("wizStepLabel")) $("wizStepLabel").textContent = "Step " + currentStep + " of " + TOTAL;
  if ($("wizStepName")) $("wizStepName").textContent = stepNames[currentStep] || "";
  document.querySelectorAll(".wiz-dot").forEach(function (d, i) {
    d.classList.toggle("on", i + 1 <= currentStep);
    d.classList.toggle("current", i + 1 === currentStep);
  });
  if ($("btnBack")) $("btnBack").style.display = (isWizard() && currentStep > 1) ? "" : "none";
  if ($("btnNext")) $("btnNext").style.display = (isWizard() && currentStep < TOTAL) ? "" : "none";
  if ($("btnPrint")) $("btnPrint").style.display = (!isWizard() || currentStep === TOTAL) ? "" : "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initWizard() {
  var dots = $("wizDots");
  if (dots && !dots.children.length) {
    for (var i = 1; i <= TOTAL; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wiz-dot";
      b.textContent = String(i);
      b.setAttribute("aria-label", "Go to step " + i);
      b.dataset.step = i;
      b.addEventListener("click", function () {
        var t = parseInt(this.dataset.step, 10);
        if (t < currentStep) goStep(t);
      });
      dots.appendChild(b);
    }
  }
  goStep(currentStep);
}

if ($("btnNext")) $("btnNext").addEventListener("click", function () {
  if (!validateStep(currentStep)) return;
  goStep(currentStep + 1);
});
if ($("btnBack")) $("btnBack").addEventListener("click", function () {
  goStep(currentStep - 1);
});

var PAGE_H = 1123 - 46 - 14;
function isMobile() { return document.documentElement.classList.contains("mob"); }
function setMode() {
  document.documentElement.classList.toggle(
    "mob",
    window.matchMedia("(max-width: 950px), (pointer: coarse) and (max-width: 1100px)").matches
  );
  goStep(currentStep);
}
setMode();
function fitScreen() {
  var sc = $("scale");
  if (!sc) return;
  sc.style.zoom = 1;
}
function growOne(t) {
  t.style.height = "auto";
  t.style.height = Math.max(t.scrollHeight, parseFloat(getComputedStyle(t).minHeight) || 0) + "px";
}
function growAll() { document.querySelectorAll("textarea").forEach(growOne); }
function fitPage() {
  var sc = $("scale"), page = $("page");
  if (!sc || !page) { growAll(); return; }
  if (!document.documentElement.classList.contains("printing")) {
    sc.style.zoom = 1; page.style.zoom = 1; page.style.minHeight = ""; growAll(); return;
  }
  var keep = sc.style.zoom;
  sc.style.zoom = 1; page.style.zoom = 1; page.style.minHeight = ""; growAll();
  var h = page.offsetHeight;
  var z = h > PAGE_H ? Math.max(0.6, PAGE_H / h) : 1;
  z = Math.floor(z * 1000) / 1000;
  page.style.zoom = z; growAll();
  page.style.minHeight = z < 1 ? (PAGE_H / z) + "px" : "";
  sc.style.zoom = keep;
}
var fitTimer;
function queueFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fitPage, 120); }
if ($("appForm")) {
  $("appForm").addEventListener("input", function (e) {
    if (e.target.tagName !== "TEXTAREA") return;
    if (isMobile()) growOne(e.target); else queueFit();
  });
  $("appForm").addEventListener("change", queueFit);
}
var lastW = window.innerWidth;
window.addEventListener("resize", function () {
  if (window.innerWidth === lastW) return;
  lastW = window.innerWidth; setMode(); fitScreen(); fitPage();
});
window.addEventListener("beforeprint", function () {
  document.documentElement.classList.add("printing");
  document.documentElement.classList.remove("mob");
  document.querySelectorAll(".step").forEach(function (s) { s.style.display = ""; s.classList.add("active"); });
  fitScreen(); fitPage();
});
window.addEventListener("afterprint", function () {
  document.documentElement.classList.remove("printing");
  setMode(); fitScreen(); fitPage();
});

initWizard();
updateAddr(); updatePassport();
fitScreen(); fitPage();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPage);
