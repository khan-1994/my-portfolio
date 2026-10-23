/* ===================== DATA & STATE ===================== */
const STORAGE_KEY = "peerhipro_v2";
const HISTORY_KEY = "peerhipro_hist";

let members = []; // {id, en, ur, father, mother, spouse, gender, dead, dob, dod, phone, address, photo, notes, open}
let by = {};
let lang = "ur";
let page = "dash";
let q = "";
let filterStatus = "all"; // all | alive | dead
let sel = null;
let ra = "", rb = "";
let editId = null;
let form = blankForm();
let historyStack = [];
let treeZoom = 1, treePanX = 0, treePanY = 0;

function blankForm() {
  return {
    en: "", ur: "", father: "", mother: "", spouse: "", gender: "male",
    status: "alive", dob: "", dod: "", phone: "", address: "", notes: "", photo: ""
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      members = JSON.parse(raw);
    } else {
      // seed sample (father line)
      members = [
        {id:1, en:"Haji Jumo", ur:"حاجی جمو", father:0, mother:0, spouse:0, gender:"male", dead:true, dob:"", dod:"", phone:"", address:"", photo:"", notes:"پہلی نسل / First generation", open:true},
        {id:2, en:"Muhammad Ibrahim", ur:"محمد ابراہیم", father:1, mother:0, spouse:0, gender:"male", dead:true, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:true},
        {id:3, en:"Abdul Karim", ur:"عبدالکریم", father:2, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:true},
        {id:4, en:"Abdul Rehman", ur:"عبدالرحمٰن", father:2, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:true},
        {id:5, en:"Ali Raza", ur:"علی رضا", father:3, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:false},
        {id:6, en:"Hasan Ali", ur:"حسن علی", father:3, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:false},
        {id:7, en:"Imran", ur:"عمران", father:4, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:false},
        {id:8, en:"Kamran", ur:"کامران", father:4, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:false},
        {id:9, en:"Bilal", ur:"بلال", father:5, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:false},
        {id:10, en:"Daniyal", ur:"دانیال", father:7, mother:0, spouse:0, gender:"male", dead:false, dob:"", dod:"", phone:"", address:"", photo:"", notes:"", open:false}
      ];
      save();
    }
    rebuild();
  } catch (e) {
    members = [];
    rebuild();
  }
  try {
    historyStack = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { historyStack = []; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function pushHistory() {
  historyStack.push(JSON.stringify(members));
  if (historyStack.length > 30) historyStack.shift();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyStack));
}

function undo() {
  if (historyStack.length < 2) { toast(t("Nothing to undo", "کچھ واپس نہیں ہو سکتا")); return; }
  historyStack.pop();
  members = JSON.parse(historyStack[historyStack.length - 1]);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyStack));
  save();
  rebuild();
  sel = null; editId = null;
  toast(t("Undone", "واپس کر دیا گیا"));
  render();
}

function rebuild() {
  by = {};
  members.forEach(m => {
    by[m.id] = { ...m, kids: [], open: m.open !== false };
  });
  members.forEach(m => {
    if (m.father && by[m.father]) by[m.father].kids.push(by[m.id]);
  });
  // sort kids by id for stable order
  Object.values(by).forEach(n => n.kids.sort((a, b) => a.id - b.id));
  // generations (paternal)
  const gen = n => (n.father && by[n.father]) ? gen(by[n.father]) + 1 : 1;
  Object.values(by).forEach(n => n.gen = gen(n));
}

function t(en, ur) { return lang === "ur" ? ur : en; }
function nm(n) { return lang === "ur" ? (n.ur || n.en) : (n.en || n.ur); }
function roots() { return Object.values(by).filter(n => !n.father); }

function ageOf(n) {
  if (!n.dob) return null;
  const b = new Date(n.dob);
  const end = n.dead && n.dod ? new Date(n.dod) : new Date();
  let a = end.getFullYear() - b.getFullYear();
  const m = end.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2500);
}

/* ===================== RELATION ENGINE ===================== */
function chain(id) {
  const c = [];
  for (let n = by[id]; n; n = by[n.father]) c.push(n);
  return c;
}
function chainM(id) {
  const c = [];
  for (let n = by[id]; n; n = n.mother && by[n.mother] ? by[n.mother] : null) c.push(n);
  return c;
}

function describe(idA, idB, da, db) {
  const nA = by[idA], nB = by[idB];
  const A = nm(nA), B = nm(nB);
  const gA = nA.gender, gB = nB.gender;
  if (!da && !db) return t(`${A} and ${B} are the same person`, `${A} اور ${B} ایک ہی شخص ہیں`);
  if (!da || !db) {
    const [upId, dnId, n] = da ? [idB, idA, da] : [idA, idB, db];
    const up = nm(by[upId]), dn = nm(by[dnId]);
    const upG = by[upId].gender;
    if (n === 1) {
      if (upG === "female") return t(`${up} is the mother of ${dn}`, `${up}، ${dn} کی والدہ ہیں`);
      return t(`${up} is the father of ${dn}`, `${up}، ${dn} کے والد ہیں`);
    }
    if (n === 2) {
      if (upG === "female") return t(`${up} is the grandmother of ${dn}`, `${up}، ${dn} کی دادی ہیں`);
      return t(`${up} is the grandfather of ${dn}`, `${up}، ${dn} کے دادا ہیں`);
    }
    return t(`${up} is ${n} generations above ${dn}`, `${up}، ${dn} سے ${n} پشت اوپر ہیں`);
  }
  if (da === 1 && db === 1) {
    if (gA === "female" && gB === "female")
      return t(`${A} and ${B} are sisters (same father)`, `${A} اور ${B} سگی بہنیں ہیں`);
    if (gA !== gB)
      return t(`${A} and ${B} are siblings (same father)`, `${A} اور ${B} سگے بھائی بہن ہیں`);
    return t(`${A} and ${B} are brothers (same father)`, `${A} اور ${B} سگے بھائی ہیں`);
  }
  if (Math.min(da, db) === 1) {
    const [uId, neId, n] = da === 1 ? [idA, idB, db] : [idB, idA, da];
    const u = nm(by[uId]), ne = nm(by[neId]), uG = by[uId].gender;
    if (n === 2) {
      if (uG === "female") return t(`${u} is the aunt of ${ne}`, `${u}، ${ne} کی پھوپھی ہیں`);
      return t(`${u} is the uncle of ${ne}`, `${u}، ${ne} کے چچا ہیں`);
    }
    return t(`${u} is ${n - 1} generations above as uncle/aunt of ${ne}`,
      `${u}، ${ne} کے ${n > 2 ? (n - 1) + " پشت اوپر " : ""}${uG === "female" ? "پھوپھی" : "چچا"} ہیں`);
  }
  const k = Math.min(da, db) - 1;
  const r = Math.abs(da - db);
  if (lang === "ur") {
    let s = `${A} اور ${B} درجہ ${k} کے کزن (چچازاد) ہیں`;
    if (r) s += `، ${r} پشت کے فرق کے ساتھ`;
    return s;
  }
  const ord = n => {
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${A} and ${B} are ${ord(k)} cousins${r ? `, ${r} time${r > 1 ? "s" : ""} removed` : ""}`;
}

function findRelation(idA, idB) {
  if (!idA || !idB) return "";
  const ca = chain(+idA), cb = chain(+idB);
  const ia = ca.findIndex(n => cb.includes(n));
  if (ia < 0) {
    // try maternal briefly
    return `<div class="note">${t("No common paternal ancestor recorded", "کوئی مشترک پدری جدّ درج نہیں")}</div>`;
  }
  const lca = ca[ia];
  const ib = cb.indexOf(lca);
  return `<div class="note"><b>${describe(+idA, +idB, ia, ib)}</b>
    <div class="mut">${t("Common ancestor", "مشترک جدّ")}: ${nm(lca)}</div></div>`;
}

/* ===================== TREE SVG ===================== */
function treeSVG() {
  let leaf = 0, maxD = 0;
  const place = (n, d) => {
    n._y = d; maxD = Math.max(maxD, d);
    const k = n.open ? n.kids : [];
    if (!k.length) n._x = leaf++;
    else {
      k.forEach(c => place(c, d + 1));
      n._x = (k[0]._x + k[k.length - 1]._x) / 2;
    }
  };
  roots().forEach(r => place(r, 0));
  if (!roots().length) return `<div class="empty">${t("No members yet. Add someone!", "ابھی کوئی فرد نہیں۔ پہلے شامل کریں!")}</div>`;

  const W = 140, H = 100;
  const w = Math.max(leaf * W + 60, 320);
  const h = (maxD + 1) * H + 70;
  const hit = n => q && (n.en.toLowerCase().includes(q.toLowerCase()) || n.ur.includes(q));

  let lines = "", dots = "";
  const draw = n => {
    const x = n._x * W + W / 2 + 20;
    const y = n._y * H + 40;
    (n.open ? n.kids : []).forEach(c => {
      const cx = c._x * W + W / 2 + 20, cy = c._y * H + 40;
      lines += `<path d="M${x} ${y + 18}V${y + H / 2}H${cx}V${cy - 18}" fill="none" stroke="#0F9D58" stroke-opacity=".45" stroke-width="2"/>`;
      draw(c);
    });
    const fill = n.dead ? "#9ca3af" : (n.gender === "female" ? "#db2777" : "#0F9D58");
    const stroke = hit(n) ? "#FFD700" : "#fff";
    const sw = hit(n) ? 5 : 2;
    dots += `<g>
      <circle data-t="${n.id}" cx="${x}" cy="${y}" r="18" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      ${n.kids.length && !n.open ? `<text x="${x}" y="${y + 5}" text-anchor="middle" fill="#fff" font-size="12" pointer-events="none">+${n.kids.length}</text>` : ""}
      <text data-s="${n.id}" x="${x}" y="${y + 38}" text-anchor="middle" font-size="13">${nm(n)}</text>
      ${n.gen ? `<text x="${x}" y="${y + 52}" text-anchor="middle" font-size="10" fill="#6b7280">G${n.gen}</text>` : ""}
    </g>`;
  };
  roots().forEach(draw);
  return `<svg id="tree" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines}${dots}</svg>`;
}

function expandMatches() {
  if (!q) return;
  members.forEach(m => {
    const n = by[m.id];
    if (n.en.toLowerCase().includes(q.toLowerCase()) || n.ur.includes(q)) {
      for (let p = by[n.father]; p; p = by[p.father]) p.open = true;
    }
  });
}

/* ===================== PAGES ===================== */
const tabs = [
  ["dash", "Dashboard", "ڈیش بورڈ", "🏠"],
  ["tree", "Tree", "شجرہ", "🌳"],
  ["add", "Add", "شامل", "➕"],
  ["search", "Search", "تلاش", "🔍"],
  ["rel", "Relation", "رشتہ", "🔗"],
  ["more", "More", "مزید", "⚙️"]
];

function detailsCard() {
  if (!sel || !by[sel]) return "";
  const n = by[sel];
  const age = ageOf(n);
  const parentLink = (id, label) => {
    if (!id || !by[id]) return `<div class="mut">${label}: —</div>`;
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0">
      <span>${label}: <b>${nm(by[id])}</b></span>
      <button class="btn btn-sm btn-sec" data-e="${id}" style="padding:3px 10px;font-size:.8rem">${t("Edit", "ترمیم")}</button>
    </div>`;
  };
  const spouseLabel = n.gender === "female" ? t("Husband", "شوہر") : t("Wife", "بیوی");
  const kids = n.kids || [];
  return `<div class="card">
    <div style="display:flex;gap:12px;align-items:flex-start">
      ${n.photo ? `<img class="avatar-lg" src="${n.photo}" alt="">` : `<div class="avatar-lg" style="display:flex;align-items:center;justify-content:center;font-size:2rem;background:var(--prl)">${n.gender === "female" ? "👩" : "👨"}</div>`}
      <div style="flex:1">
        <h2 style="margin:0">${nm(n)}</h2>
        <div class="mut">${n.en !== n.ur ? (lang === "ur" ? n.en : n.ur) : ""}</div>
        <div style="margin-top:4px">
          <span class="badge ${n.dead ? "dead" : ""}">${n.dead ? t("Deceased", "مرحوم") : t("Alive", "حیات")}</span>
          <span class="badge">${t("Gen", "نسل")} ${n.gen}</span>
          ${age !== null ? `<span class="badge">${age} ${t("yrs", "سال")}</span>` : ""}
        </div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:.92rem">
      ${parentLink(n.father, t("Father", "والد"))}
      ${parentLink(n.mother, t("Mother", "والدہ"))}
      ${parentLink(n.spouse, spouseLabel)}
      ${n.dob ? `<div>${t("Born", "پیدائش")}: ${n.dob}</div>` : ""}
      ${n.dead && n.dod ? `<div>${t("Passed", "وفات")}: ${n.dod}</div>` : ""}
      ${n.phone ? `<div dir="ltr">${n.phone}</div>` : ""}
      ${n.address ? `<div>${n.address}</div>` : ""}
      ${n.notes ? `<div class="note" style="margin-top:8px">${n.notes}</div>` : ""}
    </div>
    ${kids.length ? `<div style="margin-top:12px">
      <h2 style="font-size:1rem">${t("Children", "اولاد")} (${kids.length})</h2>
      ${kids.map(c => `<div class="row" style="cursor:pointer" data-goto="${c.id}">
        <span>${nm(c)}</span>
        <span class="mut">G${c.gen} · ${c.dead ? t("Deceased", "مرحوم") : t("Alive", "حیات")}</span>
      </div>`).join("")}
    </div>` : ""}
    <div class="actions-row">
      <button class="btn btn-sm" data-e="${n.id}">${t("Edit this person", "اس فرد کی ترمیم")}</button>
      <button class="btn btn-sm btn-danger" data-del="${n.id}">${t("Delete", "حذف")}</button>
    </div>
  </div>`;
}

function opts(selected, skipFn) {
  return `<option value="">—</option>` + members
    .filter(m => !(skipFn && skipFn(by[m.id])))
    .map(m => `<option value="${m.id}" ${+selected === m.id ? "selected" : ""}>${nm(by[m.id])} (G${by[m.id].gen})</option>`)
    .join("");
}

function under(n, id) {
  for (let p = n; p; p = by[p.father]) if (p.id === id) return true;
  return false;
}

function genNote() {
  const el = document.getElementById("gn");
  if (!el) return;
  const f = by[form.father];
  el.textContent = t("This person will be in Generation", "یہ فرد نسل نمبر") + " " + (f ? f.gen + 1 : 1) + (lang === "ur" ? " میں ہوگا" : "");
}

const pages = {
  dash() {
    const total = members.length;
    const gens = total ? Math.max(...members.map(m => by[m.id].gen)) : 0;
    const alive = members.filter(m => !m.dead).length;
    const recent = [...members].reverse().slice(0, 6);
    return `
      <div class="grid3">
        <div class="card stat"><b>${total}</b>${t("Members", "افراد")}</div>
        <div class="card stat g"><b>${gens}</b>${t("Gens", "نسلیں")}</div>
        <div class="card stat"><b>${alive}</b>${t("Alive", "حیات")}</div>
      </div>
      <div class="card">
        <h2>${t("Recently added", "حال ہی میں شامل")}</h2>
        ${recent.length ? recent.map(m => {
          const n = by[m.id];
          return `<div class="row">
            <span>${nm(n)}</span>
            <span class="mut">G${n.gen} · ${n.dead ? t("Deceased", "مرحوم") : t("Alive", "حیات")}</span>
          </div>`;
        }).join("") : `<p class="mut">${t("No members yet", "ابھی کوئی فرد نہیں")}</p>`}
      </div>
      <div class="card">
        <h2>${t("Quick actions", "فوری کام")}</h2>
        <div class="actions-row">
          <button class="btn btn-sm" data-p="add">${t("Add member", "فرد شامل کریں")}</button>
          <button class="btn btn-sm btn-sec" data-p="tree">${t("View tree", "شجرہ دیکھیں")}</button>
          <button class="btn btn-sm btn-sec" id="undoBtn">${t("Undo", "واپس")}</button>
        </div>
      </div>`;
  },

  tree() {
    expandMatches();
    return `
      <input id="q" placeholder="${t("Search in tree…", "شجرے میں تلاش…")}" value="${q}" style="margin-bottom:10px">
      <div class="tree-toolbar">
        <button type="button" class="btn btn-sm btn-sec" id="zoomIn">＋</button>
        <button type="button" class="btn btn-sm btn-sec" id="zoomOut">－</button>
        <button type="button" class="btn btn-sm btn-sec" id="zoomReset">${t("Reset", "ری سیٹ")}</button>
        <button type="button" class="btn btn-sm btn-sec" id="printTree">${t("Print", "پرنٹ")}</button>
        <button type="button" class="btn btn-sm btn-sec" id="saveTreeImg">${t("Save image", "تصویر محفوظ")}</button>
      </div>
      <div id="tree-wrap"><div id="tree-inner" style="transform-origin:0 0;transform:translate(${treePanX}px,${treePanY}px) scale(${treeZoom})">${treeSVG()}</div></div>
      <p class="mut" style="margin:8px 0">${t("Scroll/drag to pan · buttons to zoom · tap circle expand · tap name for details", "کھینچیں = حرکت · بٹن = زوم · دائرہ = کھولیں · نام = تفصیل")}</p>
      <div id="det">${detailsCard()}</div>`;
  },


  add() {
    const isEdit = !!editId;
    return `
      <div class="card">
        <h2>${isEdit ? t("Edit member", "فرد کی ترمیم") : t("Add member", "فرد شامل کریں")}</h2>
        <div style="text-align:center;margin-bottom:12px">
          <img id="photoPrev" class="photo-preview" src="${form.photo || ""}" style="${form.photo ? "" : "display:none"}" alt="">
          <div id="photoPlaceholder" style="${form.photo ? "display:none" : ""};font-size:2.5rem;margin-bottom:6px">${form.gender === "female" ? "👩" : "👨"}</div>
          <button type="button" class="btn btn-sm btn-sec" id="pickPhoto">${t("Photo", "تصویر")}</button>
          <input type="file" accept="image/*" id="photoInput" class="hidden-file">
        </div>
        <div class="two">
          <label>${t("Name (English)", "نام (انگریزی)")}<input data-f="en" value="${esc(form.en)}" placeholder="Full name" dir="ltr"></label>
          <label>${t("Name (Urdu)", "نام (اردو)")}<input data-f="ur" value="${esc(form.ur)}" placeholder="پورا نام"></label>
        </div>
        <div class="two">
          <label>${t("Father (select / change)", "والد (منتخب / تبدیل کریں)")}
            <select data-f="father">${opts(form.father, n => editId && under(n, editId))}</select>
          </label>
          <label>${t("Mother (select / change)", "والدہ (منتخب / تبدیل کریں)")}
            <select data-f="mother">${opts(form.mother, n => editId && under(n, editId))}</select>
          </label>
        </div>
        <label>${t("Spouse (Wife / Husband)", "بیوی / شوہر")}
          <select data-f="spouse">${opts(form.spouse, n => editId && n.id === editId)}</select>
        </label>
        <p class="mut" style="margin:-4px 0 10px">${t("You can change father, mother or spouse anytime from these lists.", "والد، والدہ یا بیوی/شوہر یہاں سے کسی بھی وقت تبدیل کر سکتے ہیں۔")}</p>
        <div class="note" id="gn" style="margin-bottom:10px"></div>
        <div class="three">
          <label>${t("Gender", "جنس")}
            <select data-f="gender">
              <option value="male" ${form.gender === "male" ? "selected" : ""}>${t("Male", "مرد")}</option>
              <option value="female" ${form.gender === "female" ? "selected" : ""}>${t("Female", "عورت")}</option>
            </select>
          </label>
          <label>${t("Status", "حالت")}
            <select data-f="status">
              <option value="alive" ${form.status === "alive" ? "selected" : ""}>${t("Alive", "حیات")}</option>
              <option value="deceased" ${form.status === "deceased" ? "selected" : ""}>${t("Deceased", "مرحوم")}</option>
            </select>
          </label>
          <label>${t("Born", "پیدائش")}<input type="date" data-f="dob" value="${form.dob}"></label>
        </div>
        <label id="dodWrap" style="${form.status === "deceased" ? "" : "display:none"}">${t("Date of death", "تاریخ وفات")}<input type="date" data-f="dod" value="${form.dod}"></label>
        <label>${t("Phone", "فون")}<input dir="ltr" data-f="phone" value="${esc(form.phone)}"></label>
        <label>${t("Address", "پتہ")}<input data-f="address" value="${esc(form.address)}"></label>
        <label>${t("Notes / Story", "نوٹس / کہانی")}<textarea data-f="notes">${esc(form.notes)}</textarea></label>
        <div id="msg" style="color:var(--danger);margin-bottom:8px;font-size:.9rem"></div>
        <button class="btn" id="save">${t("Save", "محفوظ کریں")}</button>
        ${isEdit ? `<button class="btn btn-sec" style="margin-top:8px" id="cancelEdit">${t("Cancel", "منسوخ")}</button>` : ""}
      </div>`;
  },

  search() {
    const s = q.trim().toLowerCase();
    let list = members.map(m => by[m.id]);
    if (s) list = list.filter(n => n.en.toLowerCase().includes(s) || n.ur.includes(q.trim()));
    if (filterStatus === "alive") list = list.filter(n => !n.dead);
    if (filterStatus === "dead") list = list.filter(n => n.dead);

    return `
      <input id="q" autofocus placeholder="${t("Search by name…", "نام سے تلاش…")}" value="${q}" style="margin-bottom:10px">
      <div class="filters">
        <span class="chip ${filterStatus === "all" ? "on" : ""}" data-fs="all">${t("All", "سب")}</span>
        <span class="chip ${filterStatus === "alive" ? "on" : ""}" data-fs="alive">${t("Alive", "حیات")}</span>
        <span class="chip ${filterStatus === "dead" ? "on" : ""}" data-fs="dead">${t("Deceased", "مرحوم")}</span>
      </div>
      <div id="res">
        ${list.length ? list.map(n => {
          const age = ageOf(n);
          return `<div class="card" style="display:flex;gap:12px;align-items:center;cursor:pointer" data-goto="${n.id}">
            ${n.photo ? `<img class="avatar" src="${n.photo}">` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center">${n.gender === "female" ? "👩" : "👨"}</div>`}
            <div style="flex:1">
              <b style="color:var(--pr)">${nm(n)}</b>
              <div class="mut">${t("Gen", "نسل")} ${n.gen}${age !== null ? ` · ${age} ${t("yrs", "سال")}` : ""} · ${n.dead ? t("Deceased", "مرحوم") : t("Alive", "حیات")}</div>
              ${n.father && by[n.father] ? `<div class="mut">${t("Father", "والد")}: ${nm(by[n.father])}</div>` : ""}
            </div>
          </div>`;
        }).join("") : `<p class="empty">${t("No one found", "کوئی نہیں ملا")}</p>`}
      </div>`;
  },

  rel() {
    return `
      <div class="card">
        <h2>${t("Find relation", "رشتہ معلوم کریں")}</h2>
        <label>${t("First person", "پہلا فرد")}<select id="ra">${opts(ra)}</select></label>
        <label>${t("Second person", "دوسرا فرد")}<select id="rb">${opts(rb)}</select></label>
        <div id="rr">${findRelation(ra, rb)}</div>
      </div>
      <p class="mut">${t("Try Bilal and Daniyal", "بلال اور دانیال آزمائیں")}</p>`;
  },

  more() {
    return `
      <div class="card">
        <h2>${t("Data", "ڈیٹا")}</h2>
        <div class="actions-row">
          <button class="btn btn-sm" id="exportBtn">${t("Export JSON", "ایکسپورٹ JSON")}</button>
          <button class="btn btn-sm btn-sec" id="importBtn">${t("Import JSON", "امپورٹ JSON")}</button>
          <input type="file" accept=".json,application/json" id="importFile" class="hidden-file">
        </div>
        <p class="mut" style="margin-top:8px">${t("Backup your family tree or move it to another device.", "اپنا شجرہ محفوظ کریں یا دوسرے آلے پر لے جائیں۔")}</p>
      </div>
      <div class="card">
        <h2>${t("Actions", "اعمال")}</h2>
        <div class="actions-row">
          <button class="btn btn-sm btn-sec" id="undoBtn2">${t("Undo last change", "آخری تبدیلی واپس")}</button>
          <button class="btn btn-sm btn-danger" id="clearBtn">${t("Clear all data", "تمام ڈیٹا صاف")}</button>
        </div>
      </div>
      <div class="card">
        <h2>${t("About", "تعارف")}</h2>
        <p class="mut">${t("PeerhiPro — offline family tree. Data stays on your device (LocalStorage).", "PeerhiPro — آف لائن شجرہ۔ ڈیٹا آپ کے آلے پر محفوظ رہتا ہے۔")}</p>
        <p class="mut">v2 · ${members.length} ${t("members", "افراد")}</p>
      </div>`;
  }
};

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ===================== SAVE MEMBER ===================== */
function saveMember() {
  const msg = document.getElementById("msg");
  const en = form.en.trim();
  const ur = form.ur.trim();
  if (!en && !ur) {
    msg.textContent = t("Name is required (English or Urdu)", "نام ضروری ہے (انگریزی یا اردو)");
    return;
  }
  const f = +form.father || 0;
  const mo = +form.mother || 0;
  const sp = +form.spouse || 0;
  if (editId && f && under(by[f], editId)) {
    msg.textContent = t("Cannot place under own descendant", "اپنی اولاد کے نیچے نہیں رکھ سکتے");
    return;
  }
  if (editId && mo && under(by[mo], editId)) {
    msg.textContent = t("Cannot place under own descendant", "اپنی اولاد کے نیچے نہیں رکھ سکتے");
    return;
  }
  if (editId && sp === editId) {
    msg.textContent = t("Cannot set self as spouse", "خود کو بیوی/شوہر نہیں بنا سکتے");
    return;
  }

  pushHistory();

  // clear old spouse link if changed
  if (editId && by[editId] && by[editId].spouse && by[editId].spouse !== sp) {
    const oldSp = members.find(m => m.id === by[editId].spouse);
    if (oldSp && oldSp.spouse === editId) oldSp.spouse = 0;
  }

  if (editId) {
    const n = by[editId];
    n.en = en || ur;
    n.ur = ur || en;
    n.father = f;
    n.mother = mo;
    n.spouse = sp;
    n.gender = form.gender;
    n.dead = form.status === "deceased";
    n.dob = form.dob;
    n.dod = form.dod;
    n.phone = form.phone;
    n.address = form.address;
    n.notes = form.notes;
    n.photo = form.photo;
    const idx = members.findIndex(m => m.id === editId);
    if (idx >= 0) members[idx] = { ...n, kids: undefined, open: n.open, gen: undefined };
  } else {
    const id = members.length ? Math.max(...members.map(m => m.id)) + 1 : 1;
    const neu = {
      id, en: en || ur, ur: ur || en, father: f, mother: mo, spouse: sp,
      gender: form.gender, dead: form.status === "deceased",
      dob: form.dob, dod: form.dod, phone: form.phone,
      address: form.address, notes: form.notes, photo: form.photo, open: true
    };
    members.push(neu);
  }

  // bidirectional spouse
  if (sp) {
    const other = members.find(m => m.id === sp);
    if (other) other.spouse = editId || members[members.length - 1].id;
  }

  // clean open flags into members
  members.forEach(m => {
    if (by[m.id]) m.open = by[m.id].open;
  });

  save();
  rebuild();
  // open path to new member
  const target = editId || members[members.length - 1].id;
  for (let p = by[by[target]?.father]; p; p = by[p.father]) p.open = true;
  members.forEach(m => { if (by[m.id]) m.open = by[m.id].open; });
  save();

  sel = target;
  editId = null;
  form = blankForm();
  page = "tree";
  toast(t("Saved successfully", "کامیابی سے محفوظ ہو گیا"));
  render();
}

function deleteMember(id) {
  if (!confirm(t("Delete this person and keep children as orphans?", "اس فرد کو حذف کریں؟ اولاد یتیم رہ جائیں گی۔"))) return;
  pushHistory();
  members.forEach(m => {
    if (m.father === id) m.father = 0;
    if (m.mother === id) m.mother = 0;
    if (m.spouse === id) m.spouse = 0;
  });
  members = members.filter(m => m.id !== id);
  save();
  rebuild();
  sel = null;
  toast(t("Deleted", "حذف ہو گیا"));
  render();
}

/* ===================== RENDER ===================== */
function render() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  document.getElementById("lang").textContent = lang === "ur" ? "English" : "اردو";

  // desktop nav
  document.getElementById("nav").innerHTML = tabs.map(([k, e, u]) =>
    `<a data-p="${k}" class="${k === page ? "on" : ""}">${t(e, u)}</a>`
  ).join("");

  // bottom nav
  document.getElementById("bnav").innerHTML = tabs.map(([k, e, u, icon]) =>
    `<a data-p="${k}" class="${k === page ? "on" : ""}"><span>${icon}</span>${t(e, u)}</a>`
  ).join("");

  document.getElementById("app").innerHTML = pages[page]();
  if (page === "add") genNote();
}

/* ===================== EVENTS ===================== */
document.addEventListener("click", e => {
  const d = e.target.dataset;

  if (d.p) {
    if (d.p === "add" && page !== "add") { editId = null; form = blankForm(); }
    page = d.p;
    render();
    return;
  }
  if (d.t) {
    const n = by[+d.t];
    if (n && n.kids.length) {
      n.open = !n.open;
      members.forEach(m => { if (m.id === n.id) m.open = n.open; });
      save();
      const wrap = document.getElementById("tree-wrap");
      if (wrap) wrap.innerHTML = `<div id="tree-inner" style="transform-origin:0 0;transform:translate(${treePanX}px,${treePanY}px) scale(${treeZoom})">${treeSVG()}</div>`;
    }
    return;
  }
  if (d.s) {
    sel = +d.s;
    document.getElementById("det").innerHTML = detailsCard();
    return;
  }
  if (d.e) {
    editId = +d.e;
    const n = by[editId];
    form = {
      en: n.en || "", ur: n.ur || "", father: n.father || "", mother: n.mother || "",
      spouse: n.spouse || "", gender: n.gender || "male", status: n.dead ? "deceased" : "alive",
      dob: n.dob || "", dod: n.dod || "", phone: n.phone || "",
      address: n.address || "", notes: n.notes || "", photo: n.photo || ""
    };
    page = "add";
    render();
    return;
  }
  if (d.del) {
    deleteMember(+d.del);
    return;
  }
  if (d.goto) {
    sel = +d.goto;
    page = "tree";
    // open path
    for (let p = by[by[sel]?.father]; p; p = by[p.father]) p.open = true;
    members.forEach(m => { if (by[m.id]) m.open = by[m.id].open; });
    save();
    render();
    return;
  }
  if (d.fs) {
    filterStatus = d.fs;
    render();
    return;
  }

  if (e.target.id === "lang") {
    lang = lang === "ur" ? "en" : "ur";
    render();
    return;
  }
  if (e.target.id === "themeBtn") {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : cur === "light" ? "" : "dark";
    if (next) document.documentElement.setAttribute("data-theme", next);
    else document.documentElement.removeAttribute("data-theme");
    return;
  }
  if (e.target.id === "save") { saveMember(); return; }
  if (e.target.id === "cancelEdit") { editId = null; form = blankForm(); page = "tree"; render(); return; }
  if (e.target.id === "undoBtn" || e.target.id === "undoBtn2") { undo(); return; }
  if (e.target.id === "pickPhoto") { document.getElementById("photoInput").click(); return; }
  if (e.target.id === "zoomIn") { treeZoom = Math.min(2.5, treeZoom + 0.15); applyTreeTransform(); return; }
  if (e.target.id === "zoomOut") { treeZoom = Math.max(0.4, treeZoom - 0.15); applyTreeTransform(); return; }
  if (e.target.id === "zoomReset") { treeZoom = 1; treePanX = 0; treePanY = 0; applyTreeTransform(); return; }
  if (e.target.id === "printTree") { window.print(); return; }
  if (e.target.id === "saveTreeImg") { exportTreeImage(); return; }
  if (e.target.id === "exportBtn") {
    const blob = new Blob([JSON.stringify(members, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "peerhipro-shajra.json";
    a.click();
    toast(t("Exported", "ایکسپورٹ ہو گیا"));
    return;
  }
  if (e.target.id === "importBtn") { document.getElementById("importFile").click(); return; }
  if (e.target.id === "clearBtn") {
    if (!confirm(t("Delete ALL data permanently?", "تمام ڈیٹا مستقل طور پر حذف کریں؟"))) return;
    pushHistory();
    members = [];
    save();
    rebuild();
    sel = null;
    toast(t("Cleared", "صاف ہو گیا"));
    render();
    return;
  }
});

document.addEventListener("input", e => {
  if (e.target.id === "q") {
    q = e.target.value;
    if (page === "tree") {
      expandMatches();
      const wrap = document.getElementById("tree-wrap");
      if (wrap) wrap.innerHTML = `<div id="tree-inner" style="transform-origin:0 0;transform:translate(${treePanX}px,${treePanY}px) scale(${treeZoom})">${treeSVG()}</div>`;
    } else if (page === "search") {
      render();
      // keep focus
      const inp = document.getElementById("q");
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
    return;
  }
  const k = e.target.dataset.f;
  if (k) {
    form[k] = e.target.value;
    if (k === "father") genNote();
    if (k === "status") {
      const wrap = document.getElementById("dodWrap");
      if (wrap) wrap.style.display = form.status === "deceased" ? "" : "none";
    }
    if (k === "gender") {
      const ph = document.getElementById("photoPlaceholder");
      if (ph) ph.textContent = form.gender === "female" ? "👩" : "👨";
    }
  }
  if (e.target.id === "ra" || e.target.id === "rb") {
    if (e.target.id === "ra") ra = e.target.value;
    else rb = e.target.value;
    document.getElementById("rr").innerHTML = findRelation(ra, rb);
  }
});

document.addEventListener("change", e => {
  if (e.target.id === "photoInput" && e.target.files[0]) {
    const file = e.target.files[0];
    if (file.size > 800000) { toast(t("Image too large (max ~800KB)", "تصویر بڑی ہے")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      form.photo = reader.result;
      const prev = document.getElementById("photoPrev");
      const ph = document.getElementById("photoPlaceholder");
      if (prev) { prev.src = form.photo; prev.style.display = ""; }
      if (ph) ph.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
  if (e.target.id === "importFile" && e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Invalid");
        pushHistory();
        members = data.map(m => ({
          id: m.id, en: m.en || "", ur: m.ur || m.en || "",
          father: m.father || 0, mother: m.mother || 0, spouse: m.spouse || 0,
          gender: m.gender || "male", dead: !!m.dead,
          dob: m.dob || "", dod: m.dod || "", phone: m.phone || "",
          address: m.address || "", notes: m.notes || "", photo: m.photo || "",
          open: m.open !== false
        }));
        save();
        rebuild();
        toast(t("Imported successfully", "امپورٹ کامیاب"));
        page = "dash";
        render();
      } catch {
        toast(t("Invalid file", "غلط فائل"));
      }
    };
    reader.readAsText(e.target.files[0]);
  }
});

/* ===================== TREE ZOOM / PAN / EXPORT ===================== */
function applyTreeTransform() {
  const inner = document.getElementById("tree-inner");
  if (inner) inner.style.transform = `translate(${treePanX}px,${treePanY}px) scale(${treeZoom})`;
}

function exportTreeImage() {
  const svg = document.querySelector("#tree-wrap svg");
  if (!svg) { toast(t("No tree to save", "شجرہ نہیں ملا")); return; }
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // force readable colors for export
  clone.querySelectorAll("text").forEach(t => t.setAttribute("fill", "#1f2937"));
  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "peerhipro-shajra.png";
      a.click();
      toast(t("Image saved", "تصویر محفوظ ہو گئی"));
    }, "image/png");
  };
  img.onerror = () => {
    // fallback: download SVG
    const a = document.createElement("a");
    a.href = url;
    a.download = "peerhipro-shajra.svg";
    a.click();
    toast(t("SVG saved", "SVG محفوظ ہو گئی"));
  };
  img.src = url;
}

// Pan (drag) on tree
let dragging = false, lastX = 0, lastY = 0;
document.addEventListener("pointerdown", e => {
  const wrap = document.getElementById("tree-wrap");
  if (!wrap || !wrap.contains(e.target)) return;
  if (e.target.closest("circle") || e.target.closest("text")) return;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  wrap.setPointerCapture?.(e.pointerId);
});
document.addEventListener("pointermove", e => {
  if (!dragging) return;
  treePanX += e.clientX - lastX;
  treePanY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  applyTreeTransform();
});
document.addEventListener("pointerup", () => { dragging = false; });
document.addEventListener("pointercancel", () => { dragging = false; });

// Wheel zoom
document.addEventListener("wheel", e => {
  const wrap = document.getElementById("tree-wrap");
  if (!wrap || !wrap.contains(e.target)) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  treeZoom = Math.min(2.5, Math.max(0.4, treeZoom + delta));
  applyTreeTransform();
}, { passive: false });

/* ===================== INIT ===================== */
load();
pushHistory(); // initial snapshot
render();
