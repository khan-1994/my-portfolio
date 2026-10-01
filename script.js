// Optional: put the number that should receive the WhatsApp message, in international format
// without + or spaces, e.g. "923001234567". Leave empty to let the sender pick a contact.
var OWNER_WHATSAPP = "";

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
    ["dob", !val("dob") || val("dob") > today()],
    ["cnic", digits(val("cnic")).length !== 13],
    ["cnic_issue", !val("cnic_issue")],
    ["cnic_exp", !val("cnic_exp")],
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

// Build plain-text summary
function fmtDate(iso) { if (!iso) return ""; var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
function line(label, v) { return label + ": " + (v || "-"); }
function summary() {
  renumber();
  var purposes = [];
  if ($("p_visa").checked) purposes.push("Visa Issuing Authority");
  if ($("p_imm").checked) purposes.push("Immigration Authorities (" + (val("p_imm_t") || "-") + ")");
  if ($("p_gov").checked) purposes.push("Government employment (" + (val("p_gov_t") || "-") + ")");
  if ($("p_pvt").checked) purposes.push("Private employment (" + (val("p_pvt_t") || "-") + ")");
  if ($("p_oth").checked) purposes.push("Other: " + (val("p_oth_t") || "-"));
  var L = [];
  L.push("POLICE CLEARANCE CERTIFICATE - APPLICATION");
  L.push("Police Facilitation Centre, Shaheed Benazir Abad", "");
  L.push(line("Purpose", purposes.join("; ")));
  L.push(line(num(1) + ". Name", val("name").toUpperCase()), line("   Caste", val("caste")));
  L.push(line(num(2) + ". S/o, D/o", val("father")), line("   W/o", val("husband")));
  L.push(line("   Date of birth", fmtDate(val("dob"))), line("   Place of birth", val("pob")));
  L.push(line(num(3) + ". CNIC No", val("cnic")), line("   Issue", fmtDate(val("cnic_issue"))), line("   Expiry", fmtDate(val("cnic_exp"))));
  if (passportOn()) L.push(line(num(4) + ". Passport No", val("pass")), line("   Issue", fmtDate(val("pass_issue"))), line("   Expiry", fmtDate(val("pass_exp"))));
  L.push(line(num(5) + ". Address (SBA)", val("a5")), "   Residing " + (fmtDate(val("a5_from")) || "-") + " to " + (fmtDate(val("a5_to")) || "-") + " (" + (val("a5_y") || "-") + " years)");
  if (val("a6")) L.push(line(num(6) + ". Address 01 as per CNIC", val("a6")), "   Residing " + (fmtDate(val("a6_from")) || "-") + " to " + (fmtDate(val("a6_to")) || "-") + " (" + (val("a6_y") || "-") + " years)");
  if (val("a7")) L.push(line(num(7) + ". Address 02 as per CNIC", val("a7")), "   Residing " + (fmtDate(val("a7_from")) || "-") + " to " + (fmtDate(val("a7_to")) || "-") + " (" + (val("a7_y") || "-") + " years)");
  L.push(line(num(8) + ". Mobile (applicant)", val("mobile")), line("   Mobile bearer", val("mobile_b")));
  L.push(line(num(9) + ". Reason if going abroad", val("reason")), line("   Proposed stay", val("stay")));
  L.push(line(num(10) + ". Police station 1", val("ps1")), line("    Police station 2", val("ps2")));
  L.push(line(num(11) + ". Current profession/job", val("job")), num(12) + ". Deponents:");
  for (var i = 1; i <= 2; i++) {
    var rel = document.querySelector('input[name="d' + i + '_rel"]:checked');
    L.push("  #" + i + " " + (val("d" + i + "_name") || "-") + ", S/o D/o W/o " + (val("d" + i + "_father") || "-") +
      ", CNIC " + (val("d" + i + "_cnic") || "-") + ", Mobile " + (val("d" + i + "_mob") || "-") +
      ", Address " + (val("d" + i + "_addr") || "-") + ", " + (rel ? rel.value : "-"));
  }
  L.push(line("Case registered (if any)", val("case") ? val("case") + " at PS " + val("case_ps") : "None"));
  L.push("", "Applicant confirms the statement of affirmation.");
  return L.join("\n");
}

// Actions
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(t).catch(function () { return legacyCopy(t); });
  }
  return legacyCopy(t);
}
function legacyCopy(t) {
  return new Promise(function (res, rej) {
    var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); } ta.remove();
  });
}
$("btnPrint").addEventListener("click", function () {
  if (!validate()) return;
  try { window.print(); } catch (e) { toast("Printing is not available here. Open the link in your browser."); }
});
$("btnCopy").addEventListener("click", function () {
  if (!validate()) return;
  copyText(summary()).then(function () { toast("Details copied. Paste them anywhere."); },
    function () { toast("Could not copy. Try the Print / Save as PDF button."); });
});
$("btnWA").addEventListener("click", function () {
  if (!validate()) return;
  var url = "https://wa.me/" + OWNER_WHATSAPP + "?text=" + encodeURIComponent(summary());
  var w = null; try { w = window.open(url, "_blank"); if (w) w.opener = null; } catch (e) {}
  if (!w) copyText(summary()).then(function () { toast("Details copied. Paste them into WhatsApp."); }, function () { toast("Could not open WhatsApp."); });
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
window.addEventListener("beforeprint", function () {
  // always print the A4 layout, even from a phone
  document.documentElement.classList.remove("mob");
  fitPage();
});
window.addEventListener("afterprint", function () { setMode(); fitScreen(); fitPage(); });
$("zIn").addEventListener("click", function () { USER_Z = Math.min(2, USER_Z + 0.15); fitScreen(); });
$("zOut").addEventListener("click", function () { USER_Z = Math.max(0.5, USER_Z - 0.15); fitScreen(); });
updateAddr(); updatePassport();
fitScreen(); fitPage();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPage);
