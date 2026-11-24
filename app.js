"use strict";
const C = window.QAREEB || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const db = (C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase) ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY) : null;

const DEFAULT_PROS = ["كهربائي", "سباك", "نجار", "حداد", "دهان", "ميكانيكي", "فني تكييف", "بنّاء", "فران", "خياط", "حلاق", "معلم خصوصي", "نجار ألمنيوم", "لحام"];
const DEMO = [
  { id:"d1", name:"أحمد عثمان", profession:"كهربائي", phone:"249912000001", city:"الخرطوم", bio:"تأسيس وصيانة كهرباء المنازل", lat:15.5007, lng:32.5599 },
  { id:"d2", name:"محمد الطيب", profession:"سباك", phone:"249912000002", city:"أم درمان", bio:"تسليك وتمديدات وصيانة", lat:15.6445, lng:32.4777 },
  { id:"d3", name:"خالد إبراهيم", profession:"نجار", phone:"249912000003", city:"بحري", bio:"مطابخ وغرف نوم وأبواب", lat:15.6339, lng:32.534 },
  { id:"d4", name:"عمر السيد", profession:"فرّان", phone:"249912000004", city:"الخرطوم", bio:"خبز بلدي وكعك", lat:15.588, lng:32.5342 },
  { id:"d5", name:"يوسف حسن", profession:"ميكانيكي", phone:"249912000005", city:"أم درمان", bio:"صيانة عامة للسيارات", lat:15.61, lng:32.49 }
];

let rows=[], me=null, prof="", user=null, pos=null, mine=null, authMode="login";

const norm=s=>String(s||"").toLowerCase().replace(/[\u064B-\u0652\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/\s+/g," ").trim();
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
function toast(t){const e=$("#toast");e.textContent=t;e.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display="none",3000)}
function km(a,b,c,d){const r=x=>x*Math.PI/180,x=r(c-a),y=r(d-b);const h=Math.sin(x/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(y/2)**2;return 12742*Math.asin(Math.sqrt(h))}
const fmtD=d=>d<1?Math.round(d*1000)+" م":d.toFixed(1)+" كم";

function setTheme(t){document.documentElement.dataset.theme=t;ls.set("q_theme",t)}
setTheme(ls.get("q_theme",matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));

async function load(){
  if(db){
    const {data,error}=await db.from("providers").select("id,name,profession,phone,city,bio,lat,lng,verified,hidden").eq("hidden",false).order("created_at",{ascending:false}).limit(1000);
    if(error){toast("تعذّر تحميل البيانات");rows=[]}else rows=data||[];
  }else rows=[...ls.get("qareeb_local",[]),...DEMO];
  const cities=[...new Set(rows.map(r=>r.city).filter(Boolean))].sort();
  $("#city").innerHTML='<option value="">كل المدن</option>'+cities.map(c=>`<option>${esc(c)}</option>`).join("");
  const all=[...new Set([...DEFAULT_PROS,...rows.map(r=>r.profession).filter(Boolean)])];
  $("#plist").innerHTML=all.map(p=>`<option value="${esc(p)}">`).join("");
  render();
}

function render(){
  const q=norm($("#q").value),ct=$("#city").value;
  const counts={};rows.forEach(r=>counts[r.profession]=(counts[r.profession]||0)+1);
  const pros=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  $("#chips").innerHTML=`<button class="chip ${prof?"":"on"}" data-a="chip" data-v="">الكل<small>${rows.length}</small></button>`+pros.map(([p,n])=>`<button class="chip ${p===prof?"on":""}" data-a="chip" data-v="${esc(p)}">${esc(p)}<small>${n}</small></button>`).join("");
  let L=rows.filter(r=>(!prof||r.profession===prof)&&(!ct||r.city===ct)&&(!q||norm(r.name+" "+r.profession+" "+(r.bio||"")+" "+r.city).includes(q)));
  if(me)L=L.map(r=>({...r,dist:km(me.lat,me.lng,r.lat,r.lng)})).sort((a,b)=>a.dist-b.dist);
  $("#info").textContent=(me?"مرتّبة من الأقرب إليك • ":"")+L.length+" نتيجة"+(db?"":" (بيانات تجريبية)");
  $("#list").innerHTML=L.length?L.map(card).join(""): '<div class="empty">لا توجد نتائج مطابقة.</div>';
  const rc=ls.get("q_recent",[]);
  $("#recent").innerHTML=rc.length?"بحثك السابق: "+rc.map(t=>`<button data-a="rec" data-v="${esc(t)}">${esc(t)}</button>`).join("")+'<button class="x" data-a="clr">مسح</button>':"";
}

function card(r){
  const ph=String(r.phone||"").replace(/\D/g,"");
  const badge=r.verified?' <span class="tag">موثّق</span>':"";
  const d=r.dist!=null&&isFinite(r.dist)?`<div class="dist">${fmtD(r.dist)}<br>منك</div>`:"";
  const msg=encodeURIComponent("السلام عليكم، وجدتك في منصة قريب وأحتاج خدمة "+r.profession);
  const name=esc(r.name||"صاحب حرفة");
  return `<article class="card"><div class="top"><div class="av">${esc(name[0])}</div><div><h3>${name}${badge}</h3><span class="tag">${esc(r.profession)}</span></div>${d}</div><p class="bio">${esc(r.bio||"")}</p><p class="bio">${esc(r.city||"")}</p><div class="acts">${ph?`<a class="wa" target="_blank" rel="noopener noreferrer" href="https://wa.me/${ph}?text=${msg}">واتساب</a><a href="tel:+${ph}">اتصال</a>`:""}</div></article>`;
}

let st;
function commitSearch(){
  const q=clean($("#q").value);if(q.length<2)return;
  const rc=[q,...ls.get("q_recent",[]).filter(x=>x!==q)].slice(0,6);ls.set("q_recent",rc);
  if(db)db.from("search_logs").insert({q:q.slice(0,60),profession:prof||null}).then(()=>{});
  render();
}
function onType(){render();clearTimeout(st);st=setTimeout(commitSearch,1200)}

function getPos(ok,fail){
  if(!navigator.geolocation)return toast("المتصفح لا يدعم تحديد الموقع");
  navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lng:p.coords.longitude}),fail||(()=>toast("اسمح للموقع بالوصول إلى موقعك")),{enableHighAccuracy:true,timeout:10000});
}

async function initAuth(){
  if(!db)return;
  const {data}=await db.auth.getSession();user=data.session?.user||null;
  db.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;updateAccountButton()});
  updateAccountButton();
}
function updateAccountButton(){
  $("#accountBtn").textContent=user?"حسابي":"تسجيل الدخول";
}

function usernameToEmail(username){return `${username.toLowerCase()}@qareeb.local`}
function validUsername(username){return /^[A-Za-z0-9_]{3,30}$/.test(username)}

function setAuthMode(mode){
  authMode=mode;
  $("#authTitle").textContent=mode==="signup"?"إنشاء حساب":"تسجيل الدخول";
  $("#authSubmit").textContent=mode==="signup"?"إنشاء الحساب":"دخول";
  $("#confirmPasswordLabel").hidden=mode!=="signup";
  $("#authPassword").autocomplete=mode==="signup"?"new-password":"current-password";
  $("#authMsg").textContent="";
}

async function openAccount(){
  if(!db)return toast("إعداد Supabase غير متاح");
  if(user){await openProfile();return}
  setAuthMode("login");$("#authUsername").value="";$("#authPassword").value="";$("#authPasswordConfirm").value="";$("#authDlg").showModal();
}

async function authSubmit(){
  if(!db)return;
  const username=clean($("#authUsername").value).toLowerCase();
  const password=$("#authPassword").value;
  const confirm=$("#authPasswordConfirm").value;
  $("#authMsg").textContent="";
  if(!validUsername(username))return $("#authMsg").textContent="اسم المستخدم غير صالح: 3 إلى 30 حرفًا إنجليزية وأرقام وشرطة سفلية.";
  if(password.length<8)return $("#authMsg").textContent="كلمة المرور يجب ألا تقل عن 8 أحرف.";
  if(authMode==="signup"&&password!==confirm)return $("#authMsg").textContent="كلمتا المرور غير متطابقتين.";

  const email=usernameToEmail(username);
  const result=authMode==="signup"
    ?await db.auth.signUp({email,password,options:{data:{username}}})
    :await db.auth.signInWithPassword({email,password});
  if(result.error){$("#authMsg").textContent=authMode==="signup"?"تعذّر إنشاء الحساب أو الاسم مستخدم مسبقًا.":"اسم المستخدم أو كلمة المرور غير صحيحة.";return}
  user=result.data.session?.user||null;
  if(!user){const session=await db.auth.getSession();user=session.data.session?.user||null}
  if(!user)return $("#authMsg").textContent="تمت العملية، افتح تسجيل الدخول مجددًا.";
  $("#authDlg").close();updateAccountButton();
  await openProfile();
}

async function openProfile(){
  mine=null;pos=null;
  const {data,error}=await db.from("providers").select("id,username,name,profession,phone,city,bio,lat,lng").eq("user_id",user.id).maybeSingle();
  if(error&&!mine)return toast("تعذّر تحميل بيانات حسابك");
  mine=data;
  const set=(id,v)=>$(id).value=v||"";
  set("#rn",mine?.name);set("#rp",mine?.profession);set("#rt",mine?.phone);set("#rc",mine?.city);set("#rb",mine?.bio);
  if(mine?.lat!=null&&mine?.lng!=null)pos={lat:mine.lat,lng:mine.lng};
  $("#rm").textContent=pos?"الموقع محفوظ":"لم يُحدَّد الموقع";
  $("#regTitle").textContent=mine?"تعديل بياناتك":"استكمال بياناتك";
  $("#delBtn").hidden=!mine;
  $("#regDlg").showModal();
}

async function save(){
  const name=clean($("#rn").value),profession=clean($("#rp").value),city=clean($("#rc").value),bio=clean($("#rb").value);
  let phone=$("#rt").value.replace(/\D/g,"");
  if(/^0\d{9}$/.test(phone))phone="249"+phone.slice(1);
  if(name.length<2)return toast("اكتب اسمك");
  if(!/^[\u0600-\u06FFa-zA-Z ]{2,30}$/.test(profession))return toast("المهنة: حروف فقط (2 إلى 30)");
  if(!/^\d{9,15}$/.test(phone))return toast("رقم واتساب غير صحيح");
  if(city.length<2)return toast("اكتب المدينة أو الحي");
  if(!pos)return toast("حدّد موقعك ليظهر لمن حولك");
  const {data:usernameData}=await db.from("providers").select("username").eq("user_id",user.id).maybeSingle();
  let username=usernameData?.username;
  if(!username){
    const metaUsername=user.user_metadata?.username;
    if(validUsername(metaUsername||""))username=metaUsername.toLowerCase();
  }
  const rec={name,profession,phone,city,bio,lat:pos.lat,lng:pos.lng,username};
  if(!mine){const existing=await db.from("providers").select("id").eq("username",username).maybeSingle();if(existing.data)return toast("اسم المستخدم مستخدم مسبقاً")}
  const result=mine
    ?await db.from("providers").update(rec).eq("user_id",user.id)
    :await db.from("providers").insert({...rec,user_id:user.id});
  if(result.error)return toast("تعذّر الحفظ: "+result.error.message);
  $("#regDlg").close();toast("تم الحفظ");await load();
}

async function del(){
  if(!confirm("سيُحذف حسابك نهائياً. متأكد؟"))return;
  const {error}=await db.from("providers").delete().eq("user_id",user.id);
  if(error)return toast("تعذّر الحذف");
  await db.auth.signOut();user=null;updateAccountButton();$("#regDlg").close();toast("تم حذف الحساب");await load();
}

async function logout(){await db.auth.signOut();user=null;mine=null;$("#regDlg").close();updateAccountButton();toast("تم تسجيل الخروج")}

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-a]");if(!b)return;
  const a=b.dataset.a,v=b.dataset.v;
  if(a==="theme")setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
  else if(a==="account")openAccount();
  else if(a==="show-login")setAuthMode("login");
  else if(a==="show-signup")setAuthMode("signup");
  else if(a==="auth-submit")authSubmit();
  else if(a==="near")getPos(p=>{me=p;b.textContent="تم تحديد موقعك";render()},()=>{b.textContent="الأقرب إليّ"});
  else if(a==="chip"){prof=v;render();if(v)commitSearch()}
  else if(a==="rec"){$("#q").value=v;render()}
  else if(a==="clr"){ls.set("q_recent",[]);render()}
  else if(a==="close")b.closest("dialog")?.close();
  else if(a==="pos")getPos(p=>{pos=p;$("#rm").textContent="تم تحديد الموقع"});
  else if(a==="save")save();
  else if(a==="del")del();
  else if(a==="logout")logout();
});

$("#q").addEventListener("input",onType);
$("#q").addEventListener("keydown",e=>{if(e.key==="Enter")commitSearch()});
$("#city").addEventListener("change",render);

initAuth().then(load);
