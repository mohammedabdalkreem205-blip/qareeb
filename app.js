"use strict";
const C = window.QAREEB || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const db = (C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase) ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY) : null;

// المهن الافتراضية؛ أي مهنة جديدة يكتبها المسجّلون تُضاف تلقائياً
const DEFAULT_PROS = ["كهربائي", "سباك", "نجار", "حداد", "دهان", "ميكانيكي", "فني تكييف", "بنّاء", "فران", "خياط", "حلاق", "معلم خصوصي"];
const DEMO = [
  { id: "d1", name: "أحمد عثمان", profession: "كهربائي", phone: "249912000001", city: "الخرطوم", bio: "تأسيس وصيانة كهرباء المنازل", lat: 15.5007, lng: 32.5599, verified: true },
  { id: "d2", name: "محمد الطيب", profession: "سباك", phone: "249912000002", city: "أم درمان", bio: "تسليك وتمديدات وصيانة", lat: 15.6445, lng: 32.4777 },
  { id: "d3", name: "خالد إبراهيم", profession: "نجار", phone: "249912000003", city: "بحري", bio: "مطابخ وغرف نوم وأبواب", lat: 15.6339, lng: 32.534, verified: true },
  { id: "d4", name: "عمر السيد", profession: "فرّان", phone: "249912000004", city: "الخرطوم", bio: "خبز بلدي وكعك", lat: 15.588, lng: 32.5342 },
  { id: "d5", name: "يوسف حسن", profession: "ميكانيكي", phone: "249912000005", city: "أم درمان", bio: "صيانة عامة للسيارات", lat: 15.61, lng: 32.49 }
];

let rows = [], me = null, prof = "", user = null, pos = null, mine = null;

/* ---------- أدوات ---------- */
const norm = s => String(s || "").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();
const clean = s => String(s || "").replace(/\s+/g, " ").trim();
function toast(t) { const e = $("#toast"); e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 3000); }
function km(a, b, c, d) {
  const r = x => x * Math.PI / 180, x = r(c - a), y = r(d - b);
  const h = Math.sin(x / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(y / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const fmtD = d => d < 1 ? Math.round(d * 1000) + " م" : d.toFixed(1) + " كم";

/* ---------- الوضع الليلي ---------- */
function setTheme(t) { document.documentElement.dataset.theme = t; ls.set("q_theme", t); }
setTheme(ls.get("q_theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

/* ---------- تحميل البيانات ---------- */
async function load() {
  if (db) {
    const { data, error } = await db.from("providers").select("id,name,profession,phone,city,bio,lat,lng,verified").order("created_at", { ascending: false }).limit(1000);
    if (error) { toast("تعذّر تحميل البيانات"); rows = []; } else rows = data;
  } else rows = [...ls.get("qareeb_local", []), ...DEMO];
  const cities = [...new Set(rows.map(r => r.city))].sort();
  $("#city").innerHTML = '<option value="">كل المدن</option>' + cities.map(c => `<option>${esc(c)}</option>`).join("");
  const all = [...new Set([...DEFAULT_PROS, ...rows.map(r => r.profession)])];
  $("#plist").innerHTML = all.map(p => `<option value="${esc(p)}">`).join("");
  render();
}

/* ---------- العرض ---------- */
function render() {
  const q = norm($("#q").value), ct = $("#city").value;
  const counts = {};
  rows.forEach(r => counts[r.profession] = (counts[r.profession] || 0) + 1);
  const pros = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  $("#chips").innerHTML = `<button class="chip ${prof ? "" : "on"}" data-a="chip" data-v="">الكل<small>${rows.length}</small></button>` +
    pros.map(([p, n]) => `<button class="chip ${p === prof ? "on" : ""}" data-a="chip" data-v="${esc(p)}">${esc(p)}<small>${n}</small></button>`).join("");

  let L = rows.filter(r => (!prof || r.profession === prof) && (!ct || r.city === ct) &&
    (!q || norm(r.name + " " + r.profession + " " + (r.bio || "") + " " + r.city).includes(q)));
  if (me) L = L.map(r => ({ ...r, dist: km(me.lat, me.lng, r.lat, r.lng) })).sort((a, b) => a.dist - b.dist);
  $("#info").textContent = (me ? "مرتّبة من الأقرب إليك • " : "") + L.length + " نتيجة" + (db ? "" : " (بيانات تجريبية)");
  $("#list").innerHTML = L.length ? L.map(card).join("") : '<div class="empty">لا توجد نتائج مطابقة. جرّب مهنة أخرى أو مدينة أخرى.</div>';
  const rc = ls.get("q_recent", []);
  $("#recent").innerHTML = rc.length ? "بحثك السابق: " + rc.map(t => `<button data-a="rec" data-v="${esc(t)}">${esc(t)}</button>`).join("") + '<button class="x" data-a="clr">مسح</button>' : "";
}
function card(r) {
  const ph = String(r.phone).replace(/\D/g, "");
  const badge = r.verified ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--nile2)" aria-label="موثّق"><path d="M12 2l2.4 2 3.1-.2 1 3 2.6 1.7-1 3 1 3-2.6 1.7-1 3-3.1-.2L12 22l-2.4-2-3.1.2-1-3L3 15.5l1-3-1-3 2.6-1.7 1-3 3.1.2z"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>' : "";
  const d = r.dist != null && isFinite(r.dist) ? `<div class="dist">${fmtD(r.dist)}<br>منك</div>` : "";
  const msg = encodeURIComponent("السلام عليكم، وجدتك في منصة قريب وأحتاج خدمة " + r.profession);
  return `<article class="card"><div class="top"><div class="av">${esc(r.name[0])}</div><div><h3>${esc(r.name)}${badge}</h3><span class="tag">${esc(r.profession)}</span></div>${d}</div>
  <p class="bio">${esc(r.bio)}</p><p class="bio">${esc(r.city)}</p>
  <div class="acts"><a class="wa" target="_blank" rel="noopener noreferrer" href="https://wa.me/${ph}?text=${msg}">واتساب</a><a href="tel:+${ph}">اتصال</a><button class="sh" data-a="share" data-v="${esc(r.name)} – ${esc(r.profession)} – ${esc(r.city)}" aria-label="مشاركة">↗</button></div></article>`;
}

/* ---------- البحث وسجله ---------- */
let st;
function commitSearch() {
  const q = clean($("#q").value);
  if (q.length < 2) return;
  const rc = [q, ...ls.get("q_recent", []).filter(x => x !== q)].slice(0, 6);
  ls.set("q_recent", rc);
  // سجل مجهول للتحليلات (نص البحث والمهنة فقط، بلا أي معرّف شخصي)
  if (db) db.from("search_logs").insert({ q: q.slice(0, 60), profession: prof || null }).then(() => {});
  render();
}
function onType() { render(); clearTimeout(st); st = setTimeout(commitSearch, 1200); }

/* ---------- الموقع ---------- */
function getPos(ok, fail) {
  if (!navigator.geolocation) return toast("المتصفح لا يدعم تحديد الموقع");
  navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), fail || (() => toast("اسمح للموقع بالوصول إلى موقعك")), { enableHighAccuracy: true, timeout: 12000 });
}

/* ---------- الحساب ---------- */
async function initAuth() {
  if (!db) return;
  const { data } = await db.auth.getSession();
  user = data.session?.user || null;
  db.auth.onAuthStateChange((_e, s) => { user = s?.user || null; });
}
async function openReg() {
  if (db && !user) { $("#authDlg").showModal(); return; }
  mine = null; pos = null;
  if (db) { const { data } = await db.from("providers").select("id,name,profession,phone,city,bio,lat,lng").eq("user_id", user.id).maybeSingle(); mine = data; }
  const set = (id, v) => $(id).value = v || "";
  set("#rn", mine?.name); set("#rp", mine?.profession); set("#rt", mine?.phone); set("#rc", mine?.city); set("#rb", mine?.bio);
  if (mine) pos = { lat: mine.lat, lng: mine.lng };
  $("#rm").textContent = pos ? "الموقع محفوظ" : "لم يُحدَّد الموقع";
  $("#regTitle").textContent = mine ? "تعديل بياناتك" : "سجّل كصاحب خبرة";
  $("#delBtn").hidden = !mine;
  $("#regDlg").showModal();
}
async function sendLink() {
  const email = clean($("#email").value);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("بريد غير صحيح");
  const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  $("#authMsg").textContent = error ? "تعذّر الإرسال، حاول لاحقاً" : "أرسلنا الرابط إلى بريدك. افتحه ثم عُد إلى هنا.";
}
async function save() {
  const name = clean($("#rn").value), profession = clean($("#rp").value), city = clean($("#rc").value), bio = clean($("#rb").value);
  let phone = $("#rt").value.replace(/\D/g, "");
  if (/^0\d{9}$/.test(phone)) phone = "249" + phone.slice(1);
  if (name.length < 2) return toast("اكتب اسمك");
  if (!/^[\u0600-\u06FFa-zA-Z ]{2,30}$/.test(profession)) return toast("المهنة: حروف فقط (2 إلى 30)");
  if (!/^\d{9,15}$/.test(phone)) return toast("رقم واتساب غير صحيح");
  if (city.length < 2) return toast("اكتب المدينة أو الحي");
  if (!pos) return toast("حدّد موقعك ليظهر لمن حولك");
  const rec = { name, profession, phone, city, bio, lat: pos.lat, lng: pos.lng };
  if (db) {
    const { error } = mine ? await db.from("providers").update(rec).eq("user_id", user.id) : await db.from("providers").insert({ ...rec, user_id: user.id });
    if (error) return toast("تعذّر الحفظ، تحقق من البيانات");
  } else { const s = ls.get("qareeb_local", []); s.unshift({ ...rec, id: "l" + Date.now() }); ls.set("qareeb_local", s); }
  $("#regDlg").close(); toast("تم الحفظ"); load();
}
async function del() {
  if (!confirm("سيُحذف حسابك نهائياً. متأكد؟")) return;
  const { error } = await db.from("providers").delete().eq("user_id", user.id);
  if (error) return toast("تعذّر الحذف");
  $("#regDlg").close(); toast("تم الحذف"); load();
}

/* ---------- الأحداث (بدون inline handlers لأجل CSP) ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a, v = b.dataset.v;
  if (a === "theme") setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  else if (a === "reg") openReg();
  else if (a === "near") { b.textContent = "جارٍ التحديد…"; getPos(p => { me = p; b.textContent = "تم تحديد موقعك"; render(); }, () => { b.textContent = "الأقرب إليّ"; toast("اسمح للموقع بالوصول إلى موقعك"); }); }
  else if (a === "chip") { prof = v; render(); if (v) commitSearch(); }
  else if (a === "rec") { $("#q").value = v; render(); }
  else if (a === "clr") { ls.set("q_recent", []); render(); }
  else if (a === "close") b.closest("dialog").close();
  else if (a === "sendlink") sendLink();
  else if (a === "pos") getPos(p => { pos = p; $("#rm").textContent = "تم تحديد الموقع"; });
  else if (a === "save") save();
  else if (a === "del") del();
  else if (a === "share") { const t = v + " على منصة قريب"; navigator.share ? navigator.share({ title: "قريب", text: t, url: location.href }).catch(() => {}) : navigator.clipboard?.writeText(t + " " + location.href).then(() => toast("تم النسخ")); }
});
$("#q").addEventListener("input", onType);
$("#q").addEventListener("keydown", e => { if (e.key === "Enter") commitSearch(); });
$("#city").addEventListener("change", render);

initAuth().then(load);
