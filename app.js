"use strict";
const C = window.QAREEB || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const db = (C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase) ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY) : null;

// قائمة الولايات السودانية لتغذية القوائم المنسدلة
const SUDAN_STATES = ["الخرطوم", "الجزيرة", "البحر الأحمر", "كسلا", "القضارف", "سنار", "النيل الأزرق", "النيل الأبيض", "الشمالية", "نهر النيل", "شمال كردفان", "جنوب كردفان", "غرب كردفان", "شمال دارفور", "جنوب دارفور", "شرق دارفور", "غرب دارفور", "وسط دارفور"];
const DEFAULT_PROS = ["كهربائي", "سباك", "نجار", "حداد", "دهان", "ميكانيكي", "فني تكييف", "بنّاء", "فران", "خياط", "حلاق", "معلم خصوصي", "نجار ألمنيوم", "لحام"];

let rows=[], me=null, prof="", user=null, pos=null, mine=null, authMode="login", selectedFile=null;

const norm=s=>String(s||"").toLowerCase().replace(/[\u064B-\u0652\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/\s+/g," ").trim();
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
function toast(t){const e=$("#toast");e.textContent=t;e.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display="none",3000)}
function km(a,b,c,d){const r=x=>x*Math.PI/180,x=r(c-a),y=r(d-b);const h=Math.sin(x/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(y/2)**2;return 12742*Math.asin(Math.sqrt(h))}
const fmtD=d=>d<1?Math.round(d*1000)+" م":d.toFixed(1)+" كم";

function setTheme(t){document.documentElement.dataset.theme=t;ls.set("q_theme",t)}
setTheme(ls.get("q_theme",matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));

async function load(){
  if(db){
    // جلب البيانات مع الحقول الجديدة (الولاية، المنطقة، الصورة)
    const {data,error}=await db.from("providers").select("id,name,profession,phone,city,state,area,bio,lat,lng,avatar_url,verified,hidden").eq("hidden",false).order("created_at",{ascending:false}).limit(1000);
    if(error){toast("تعذّر تحميل البيانات");rows=[]}else rows=data||[];
  }else rows=[]; // مسح البيانات الوهمية لفرض استخدام قاعدة البيانات
  
  // تعبئة فلتر الولايات
  $("#state").innerHTML = '<option value="">كل الولايات</option>' + SUDAN_STATES.map(s => `<option>${esc(s)}</option>`).join("");
  
  // تعبئة فلتر المدن بناءً على البيانات الموجودة
  const cities=[...new Set(rows.map(r=>r.city).filter(Boolean))].sort();
  $("#city").innerHTML='<option value="">كل المدن</option>'+cities.map(c=>`<option>${esc(c)}</option>`).join("");
  render();
}

function render(){
  const q=norm($("#q").value);
  const state=$("#state").value;
  const city=$("#city").value;
  
  const counts={};rows.forEach(r=>counts[r.profession]=(counts[r.profession]||0)+1);
  const pros=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  $("#chips").innerHTML=`<button class="chip ${prof?"":"on"}" data-a="chip" data-v="">الكل<small>${rows.length}</small></button>`+pros.map(([p,n])=>`<button class="chip ${p===prof?"on":""}" data-a="chip" data-v="${esc(p)}">${esc(p)}<small>${n}</small></button>`).join("");
  
  // فلترة دقيقة وسريعة
  let L=rows.filter(r=>
      (!prof||r.profession===prof) && 
      (!state||r.state===state) && 
      (!city||r.city===city) && 
      (!q||norm(r.name+" "+r.profession+" "+(r.bio||"")+" "+r.city+" "+(r.area||"")).includes(q))
  );
  
  if(me)L=L.map(r=>({...r,dist:km(me.lat,me.lng,r.lat,r.lng)})).sort((a,b)=>a.dist-b.dist);
  
  $("#info").textContent=(me?"مرتّبة من الأقرب إليك • ":"")+L.length+" نتيجة";
  $("#list").innerHTML=L.length?L.map(card).join(""): '<div class="empty">لا توجد نتائج مطابقة.</div>';
}

function card(r){
  const ph=String(r.phone||"").replace(/\D/g,"");
  const badge=r.verified?' <span class="tag">موثّق</span>':"";
  const d=r.dist!=null&&isFinite(r.dist)?`<div class="dist">${fmtD(r.dist)}<br>منك</div>`:"";
  const msg=encodeURIComponent("السلام عليكم، وجدتك في منصة قريب وأحتاج خدمة "+r.profession);
  const name=esc(r.name||"صاحب حرفة");
  
  // عرض الصورة أو الحرف الأول
  const avatarHtml = r.avatar_url 
    ? `<img src="${esc(r.avatar_url)}" class="av" loading="lazy" alt="${name}">` 
    : `<div class="av">${esc(name[0])}</div>`;

  // عرض الولاية والمنطقة إن وجدت
  const locationStr = [r.state, r.city, r.area].filter(Boolean).join(' - ');

  return `<article class="card"><div class="top">${avatarHtml}<div><h3>${name}${badge}</h3><span class="tag">${esc(r.profession)}</span></div>${d}</div><p class="bio">${esc(r.bio||"")}</p><p class="bio">📍 ${esc(locationStr)}</p><div class="acts">${ph?`<a class="wa" target="_blank" rel="noopener noreferrer" href="https://wa.me/${ph}?text=${msg}">واتساب</a><a href="tel:+${ph}">اتصال</a>`:""}</div></article>`;
}

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
  
  if(!validUsername(username))return $("#authMsg").textContent="اسم المستخدم غير صالح.";
  if(password.length<8)return $("#authMsg").textContent="كلمة المرور يجب ألا تقل عن 8 أحرف.";
  if(authMode==="signup"&&password!==confirm)return $("#authMsg").textContent="كلمتا المرور غير متطابقتين.";

  const email=usernameToEmail(username);
  const btn = $("#authSubmit");
  const originalText = btn.textContent;
  btn.disabled = true; btn.textContent = "جاري المعالجة...";

  const result=authMode==="signup"
    ?await db.auth.signUp({email,password,options:{data:{username}}})
    :await db.auth.signInWithPassword({email,password});

  btn.disabled = false; btn.textContent = originalText;

  if(result.error){ console.error(result.error); $("#authMsg").textContent = result.error.message; return; }

  user=result.data.session?.user || result.data.user || null;
  if(!user){ const session=await db.auth.getSession(); user=session.data.session?.user||null; }
  if(!user)return $("#authMsg").textContent="تمت العملية، يرجى المحاولة مجددًا.";
  
  $("#authDlg").close(); updateAccountButton(); toast("تم تسجيل الدخول!"); await openProfile();
}

async function openProfile(){
  mine=null;pos=null;selectedFile=null;
  // تعبئة قائمة الولايات في نافذة التسجيل
  $("#rs").innerHTML = '<option value="">اختر الولاية</option>' + SUDAN_STATES.map(s => `<option>${esc(s)}</option>`).join("");
  
  const {data,error}=await db.from("providers").select("*").eq("user_id",user.id).maybeSingle();
  if(error){ console.error(error); return toast("خطأ: " + error.message); }
  
  mine=data;
  const set=(id,v)=>$(id).value=v||"";
  set("#rn",mine?.name); set("#rp",mine?.profession); set("#rt",mine?.phone);
  set("#rs",mine?.state); set("#rc",mine?.city); set("#ra",mine?.area); set("#rb",mine?.bio);
  
  if(mine?.lat!=null&&mine?.lng!=null)pos={lat:mine.lat,lng:mine.lng};
  $("#rm").textContent=pos?"الموقع محفوظ":"لم يُحدَّد الموقع";
  $("#regTitle").textContent=mine?"تعديل بياناتك":"استكمال بياناتك";
  $("#delBtn").hidden=!mine;
  
  // عرض الصورة الحالية إن وجدت
  const prev = $("#avatarPreview");
  if(mine?.avatar_url){ prev.innerHTML = `<img src="${mine.avatar_url}">`; }
  else { prev.innerHTML = "صورة"; }
  
  $("#regDlg").showModal();
}

async function save(){
  const name=clean($("#rn").value), profession=clean($("#rp").value), state=$("#rs").value, city=clean($("#rc").value), area=clean($("#ra").value), bio=clean($("#rb").value);
  let phone=$("#rt").value.replace(/\D/g,"");
  if(/^0\d{9}$/.test(phone))phone="249"+phone.slice(1);
  
  if(name.length<2)return toast("اكتب اسمك");
  if(profession.length<2)return toast("اكتب مهنتك");
  if(!/^\d{9,15}$/.test(phone))return toast("رقم واتساب غير صحيح");
  if(!state)return toast("اختر الولاية");
  if(city.length<2)return toast("اكتب المدينة");
  if(!pos)return toast("حدّد موقعك ليظهر لمن حولك");

  const btn = $("[data-a='save']");
  btn.disabled = true; btn.textContent = "جاري الحفظ...";

  let avatar_url = mine?.avatar_url || null;

  // رفع الصورة إذا تم اختيارها
  if(selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await db.storage.from('avatars').upload(fileName, selectedFile);
      
      if(uploadError) {
          toast("فشل رفع الصورة: " + uploadError.message);
          btn.disabled = false; btn.textContent = "حفظ";
          return;
      }
      const { data: publicUrlData } = db.storage.from('avatars').getPublicUrl(fileName);
      avatar_url = publicUrlData.publicUrl;
  }

  const {data:usernameData}=await db.from("providers").select("username").eq("user_id",user.id).maybeSingle();
  let username=usernameData?.username;
  if(!username){ const metaUsername=user.user_metadata?.username; if(validUsername(metaUsername||""))username=metaUsername.toLowerCase(); }
  
  const rec={name,profession,phone,state,city,area,bio,lat:pos.lat,lng:pos.lng,avatar_url,username};
  
  const result=mine
    ?await db.from("providers").update(rec).eq("user_id",user.id)
    :await db.from("providers").insert({...rec,user_id:user.id});
    
  btn.disabled = false; btn.textContent = "حفظ";
  
  if(result.error){ console.error(result.error); return toast("تعذّر الحفظ: "+result.error.message); }
  
  $("#regDlg").close();toast("تم الحفظ بنجاح");await load();
}

async function del(){
  if(!confirm("سيُحذف حسابك نهائياً. متأكد؟"))return;
  const {error}=await db.from("providers").delete().eq("user_id",user.id);
  if(error)return toast("تعذّر الحذف");
  await db.auth.signOut();user=null;updateAccountButton();$("#regDlg").close();toast("تم حذف الحساب");await load();
}

async function logout(){await db.auth.signOut();user=null;mine=null;$("#regDlg").close();updateAccountButton();toast("تم تسجيل الخروج")}

// مستمع لحدث اختيار الصورة
document.addEventListener("change", e => {
    if(e.target.id === "rf") {
        const file = e.target.files[0];
        if(file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => { $("#avatarPreview").innerHTML = `<img src="${ev.target.result}">`; };
            reader.readAsDataURL(file);
        }
    }
    if(e.target.id === "state") render();
    if(e.target.id === "city") render();
});

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-a]");if(!b)return;
  const a=b.dataset.a,v=b.dataset.v;
  if(a==="theme")setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
  else if(a==="account")openAccount();
  else if(a==="show-login")setAuthMode("login");
  else if(a==="show-signup")setAuthMode("signup");
  else if(a==="auth-submit")authSubmit();
  else if(a==="near")getPos(p=>{me=p;b.textContent="تم تحديد موقعك";render()},()=>{b.textContent="الأقرب إليّ"});
  else if(a==="chip"){prof=v;render();}
  else if(a==="close")b.closest("dialog")?.close();
  else if(a==="pos")getPos(p=>{pos=p;$("#rm").textContent="تم تحديد الموقع"});
  else if(a==="save")save();
  else if(a==="del")del();
  else if(a==="logout")logout();
});

$("#q").addEventListener("input",render);
$("#q").addEventListener("keydown",e=>{if(e.key==="Enter")render()});
$("#city").addEventListener("change",render);

initAuth().then(load);
