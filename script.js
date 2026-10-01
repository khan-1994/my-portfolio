var $ = function (id) { return document.getElementById(id); };
var val = function (id) { return ($(id).value || "").trim(); };

// Deponents
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
    html += '<div class="dhead r1 dp' + i + sep + '">Deponent #' + i + '</div>';
    for (r = 0; r < rows.length; r++) {
      html += '<label class="dlab req r' + (r + 2) + ' dp' + i + sep + '" for="d' + i + '_' + rows[r][1] + '">' + rows[r][0] + '</label>' +
              '<div class="dval r' + (r + 2) + ' dp' + i + '">' + rows[r][2].replace(/#/g, i) + '</div>';
    }
    html += '<div id="d' + i + '_relbox" class="drel r7 dp' + i + sep + '">' +
      '<label class="check"><input type="checkbox" name="d' + i + '_rel" value="Neighbor"> Neighbor</label>' +
      '<label class="check"><input type="checkbox" name="d' + i + '_rel" value="Family Member"> Family Member</label></div>';
  }
  $("deps").innerHTML = html;
  // only one of Neighbor / Family Member per deponent
  document.querySelectorAll('.drel input[type=checkbox]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      if (!cb.checked) return;
      document.querySelectorAll('input[name="' + cb.name + '"]').forEach(function (o) { if (o !== cb) o.checked = false; });
    });
  });
})();

// Input masks
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
function bindMask(el, fn) { el.addEventListener("input", function () { el.value = fn(el.value); }); }
bindMask($("cnic"), maskCnic);
bindMask($("mobile"), maskMobile);
document.querySelectorAll('[data-mask="cnic"]').forEach(function (e) { bindMask(e, maskCnic); });
document.querySelectorAll('[data-mask="mobile"]').forEach(function (e) { bindMask(e, maskMobile); });

// Years between dates
function years(a, b) {
  if (!a || !b) return "";
  var ms = new Date(b) - new Date(a);
  if (isNaN(ms) || ms < 0) return "";
  var y = Math.floor(ms / (365.25 * 864e5));
  return y < 1 ? "Less than 1" : String(y);
}
["a5", "a6", "a7"].forEach(function (p) {
  var upd = function () { $(p + "_y").value = years($(p + "_from").value, $(p + "_to").value); };
  $(p + "_from").addEventListener("input", upd);
  $(p + "_to").addEventListener("input", upd);
});
function today() {
  var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
}
["a5", "a6", "a7"].forEach(function (p) {
  $(p + "_birth").addEventListener("change", function () {
    if (this.checked) {
      if (!$("dob").value) { toast("Enter your date of birth first."); this.checked = false; return; }
      $(p + "_from").value = $("dob").value; $(p + "_to").value = today();
    } else { $(p + "_from").value = ""; $(p + "_to").value = ""; }
    $(p + "_y").value = years($(p + "_from").value, $(p + "_to").value);
  });
});

// Name under signature
$("name").addEventListener("input", function () { $("sigName").textContent = this.value.trim(); });

// Photo
$("photoInput").addEventListener("change", function () {
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




// Purpose: tick any ONE option (Visa, Immigration, ...). Choosing another moves the tick.
(function () {
  var ids = ["p_visa", "p_imm", "p_gov", "p_pvt", "p_oth"];
  ids.forEach(function (id) {
    var box = $(id);
    box.addEventListener("change", function () {
      if (ids.some(function (o) { return $(o).checked; })) $("purposeErr").style.display = "none";
      if (!box.checked) return;
      ids.forEach(function (o) {
        if (o === id) return;
        $(o).checked = false;
        var t = $(o + "_t"); if (t) t.value = "";
      });
    });
    var txt = $(id + "_t");
    if (txt) txt.addEventListener("input", function () {
      if (txt.value.trim() && !box.checked) { box.checked = true; box.dispatchEvent(new Event("change")); }
    });
    // bigger tap area: tapping the empty space around an option also toggles it
    box.closest(".purpose").addEventListener("click", function (e) {
      var tag = e.target.tagName;
      if (tag === "INPUT" || tag === "LABEL") return;
      box.checked = !box.checked;
      box.dispatchEvent(new Event("change"));
    });
  });
})();


// Numbering follows the rows that are visible (passport and extra addresses can be hidden).
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
function num(n) { return numMap[n] || n; }

// Passport section: only for Visa / Immigration purposes.
function passportOn() { return $("p_visa").checked || $("p_imm").checked; }
function updatePassport() {
  $("passRow").style.display = passportOn() ? "" : "none";
  renumber(); queueFit();
}
["p_visa", "p_imm", "p_gov", "p_pvt", "p_oth"].forEach(function (id) { $(id).addEventListener("change", updatePassport); });

// Addresses: one by default, "Add another address" reveals No. 6, then No. 7.
var addrCount = 0;
function updateAddr() {
  $("addr6Row").style.display = addrCount >= 1 ? "" : "none";
  $("addr7Row").style.display = addrCount >= 2 ? "" : "none";
  $("btnAddAddr").parentNode.style.display = addrCount < 2 ? "" : "none";
  $("btnAddAddr").textContent = addrCount === 0 ? "+ Add another address (as per CNIC)" : "+ Add one more address";
  document.querySelector('[data-rm="6"]').style.display = addrCount === 1 ? "" : "none";
  document.querySelector('[data-rm="7"]').style.display = addrCount === 2 ? "" : "none";
  renumber(); queueFit();
}
$("btnAddAddr").addEventListener("click", function () {
  if (addrCount >= 2) return;
  addrCount++; updateAddr();
  var t = $(addrCount === 1 ? "a6" : "a7"); if (t) t.focus();
});
document.querySelectorAll("[data-rm]").forEach(function (b) {
  b.addEventListener("click", function () {
    var p = "a" + b.getAttribute("data-rm");
    $(p).value = ""; $(p + "_from").value = ""; $(p + "_to").value = ""; $(p + "_y").value = ""; $(p + "_birth").checked = false;
    addrCount = Math.max(0, addrCount - 1); updateAddr();
  });
});

// Toast
var tt;
function toast(msg) {
  var t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 3200);
}

// Validation
function setBad(id, bad) {
  var el = $(id); el.classList.toggle("invalid", bad);
  var f = el.closest(".f"); if (f) f.classList.toggle("bad", bad);
  return bad;
}
function validate() {
  var bad = [];
  var checks = [
    ["name", val("name").length < 3],
    ["caste", val("caste").length < 2],
    ["father", val("father").length < 3],
    ["dob", !val("dob") || val("dob") > today() || val("dob") < "1900-01-01"],
    ["cnic", digits(val("cnic")).length !== 13],
    ["cnic_issue", !val("cnic_issue") || val("cnic_issue") > today() || val("cnic_issue") < "1900-01-01"],
    ["cnic_exp", !val("cnic_exp") || val("cnic_exp") > "2100-12-31" || (val("cnic_issue") && val("cnic_exp") <= val("cnic_issue"))],
    ["a5", val("a5").length < 5],
    ["mobile", digits(val("mobile")).length !== 11 || val("mobile").slice(0, 2) !== "03"]
  ];
  var depIds = [];
  for (var i = 1; i <= 2; i++) {
    var d = "d" + i + "_";
    checks.push([d + "name", val(d + "name").length < 3]);
    checks.push([d + "father", val(d + "father").length < 3]);
    checks.push([d + "cnic", digits(val(d + "cnic")).length !== 13]);
    checks.push([d + "mob", digits(val(d + "mob")).length !== 11 || val(d + "mob").slice(0, 2) !== "03"]);
    checks.push([d + "addr", val(d + "addr").length < 5]);
  }
  checks.forEach(function (c) { if (setBad(c[0], c[1])) { bad.push(c[0]); if (/^d[12]_/.test(c[0])) depIds.push(c[0]); } });
  for (var j = 1; j <= 2; j++) {
    var ok = !!document.querySelector('input[name="d' + j + '_rel"]:checked');
    $("d" + j + "_relbox").classList.toggle("bad-rel", !ok);
    if (!ok) { bad.push("d" + j + "_relbox"); depIds.push("rel" + j); }
  }
  $("depErr").style.display = depIds.length ? "block" : "none";
  var anyPurpose = ["p_visa", "p_imm", "p_gov", "p_pvt", "p_oth"].some(function (id) { return $(id).checked; });
  $("purposeErr").style.display = anyPurpose ? "none" : "block";
  if (!anyPurpose) bad.push("purposes");
  $("agreeErr").style.display = $("agree").checked ? "none" : "block";
  if (!$("agree").checked) bad.push("agree");
  if (bad.length) {
    var first = bad[0] === "purposes" ? $("purposes") : $(bad[0]);
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Please fix the highlighted fields.");
    return false;
  }
  return true;
}
document.getElementById("form").addEventListener("change", function (e) {
  var t = e.target;
  if (t.name && /_rel$/.test(t.name)) t.closest(".drel").classList.remove("bad-rel");
});
document.getElementById("form").addEventListener("input", function (e) {
  if (e.target.classList.contains("invalid")) setBad(e.target.id, false);
});
$("agree").addEventListener("change", function () { if (this.checked) $("agreeErr").style.display = "none"; });

// Actions
$("btnPrint").addEventListener("click", function () {
  if (!validate()) return;
  try { window.print(); } catch (e) { toast("Printing is not available here. Open the link in your browser."); }
});
$("btnClear").addEventListener("click", function () {
  if (!confirm("Clear everything you have entered?")) return;
  document.getElementById("form").reset();
  var img = $("photoBox").querySelector("img"); if (img) img.remove(); $("photoHint").style.display = "";
  ["a5_y", "a6_y", "a7_y"].forEach(function (id) { $(id).value = ""; });
  $("sigName").textContent = "";
  document.querySelectorAll(".invalid").forEach(function (e) { e.classList.remove("invalid"); });
  document.querySelectorAll(".bad").forEach(function (e) { e.classList.remove("bad"); });
  addrCount = 0; updateAddr(); updatePassport();
  $("depErr").style.display = "none";
  document.querySelectorAll(".bad-rel").forEach(function (e) { e.classList.remove("bad-rel"); });
  fitPage();
  toast("Form cleared.");
});

// ===== Keep the sheet exactly one A4 page =====
var USER_Z = 1;
var PAGE_H = 1123 - 46 - 14; // small safety gap so nothing spills to a 2nd page
function isMobile() { return document.documentElement.classList.contains("mob"); }
function setMode() { document.documentElement.classList.toggle("mob", window.matchMedia("(max-width: 700px), (pointer: coarse) and (max-width: 950px)").matches); }
setMode();
function fitScreen() {
  if (isMobile()) { $("scale").style.zoom = 1; return; }
  var w = document.documentElement.clientWidth - 16;
  $("scale").style.zoom = Math.min(1, w / 794) * USER_Z;
}
function growOne(t) {
  t.style.height = "auto";
  t.style.height = Math.max(t.scrollHeight, parseFloat(getComputedStyle(t).minHeight) || 0) + "px";
}
function growAll() { document.querySelectorAll("textarea").forEach(growOne); }
function fitPage() {
  var sc = $("scale"), page = $("page");
  if (isMobile()) { page.style.zoom = 1; page.style.minHeight = ""; growAll(); return; }
  var keep = sc.style.zoom;
  sc.style.zoom = 1; page.style.zoom = 1; page.style.minHeight = "";
  growAll();
  var h = page.offsetHeight;
  var z = h > PAGE_H ? Math.max(0.6, PAGE_H / h) : 1;
  z = Math.floor(z * 1000) / 1000;
  page.style.zoom = z;
  growAll(); // text re-wraps at the final width
  page.style.minHeight = (PAGE_H / z) + "px"; // frame fills the whole A4 sheet
  sc.style.zoom = keep;
}
var fitTimer;
function queueFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fitPage, 120); }
// Single-line inputs never change the page height, so only textareas need work while typing.
document.getElementById("form").addEventListener("input", function (e) {
  if (e.target.tagName !== "TEXTAREA") return;
  if (isMobile()) growOne(e.target); else queueFit();
});
document.getElementById("form").addEventListener("change", queueFit);
// Phones fire "resize" when the keyboard opens; only react when the width really changes.
var lastW = window.innerWidth;
window.addEventListener("resize", function () {
  if (window.innerWidth === lastW) return;
  lastW = window.innerWidth; setMode(); fitScreen(); fitPage();
});
function markDates() {
  document.querySelectorAll("input[type=date]").forEach(function (e) { e.classList.toggle("empty", !e.value); });
}
window.addEventListener("beforeprint", function () {
  markDates(); // blank dates must print as blank lines, not "mm/dd/yyyy"
  // always print the A4 layout, even from a phone
  document.documentElement.classList.remove("mob");
  fitPage();
});
window.addEventListener("afterprint", function () { setMode(); fitScreen(); fitPage(); });
updateAddr(); updatePassport();
fitScreen(); fitPage();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPage);
