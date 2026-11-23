"use strict";
(() => {
  const dialog = document.querySelector("#authDlg");
  const form = document.querySelector("#authForm");
  const phoneInput = document.querySelector("#authPhone");
  const passwordInput = document.querySelector("#authPassword");
  const confirmInput = document.querySelector("#authConfirm");
  const confirmWrap = document.querySelector("#confirmWrap");
  const title = document.querySelector("#authTitle");
  const intro = document.querySelector("#authIntro");
  const submit = document.querySelector("#authSubmit");
  const message = document.querySelector("#authMsg");
  const loginButton = document.querySelector('[data-auth-action="open"]');
  const logoutButton = document.querySelector('[data-auth-action="logout"]');
  const client = window.QAREEB && window.QAREEB.SUPABASE_URL && window.QAREEB.SUPABASE_KEY && window.supabase
    ? window.supabase.createClient(window.QAREEB.SUPABASE_URL, window.QAREEB.SUPABASE_KEY)
    : null;
  let mode = "login";
  let busy = false;

  function toast(text) {
    const el = document.querySelector("#toast");
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.style.display = "none"; }, 3200);
  }

  function normalizedPhone(value) {
    let phone = String(value || "").replace(/[٠-٩۰-۹]/g, digit => {
      const arabic = "٠١٢٣٤٥٦٧٨٩", persian = "۰۱۲۳۴۵۶۷۸۹";
      const index = arabic.indexOf(digit);
      return String(index >= 0 ? index : persian.indexOf(digit));
    }).replace(/\D/g, "");
    if (/^0\d{9}$/.test(phone)) phone = "249" + phone.slice(1);
    if (/^9\d{8}$/.test(phone)) phone = "249" + phone;
    if (!/^249\d{9}$/.test(phone)) return "";
    return phone;
  }

  // Supabase password auth needs an email identifier for accounts without phone OTP.
  // The alias is deterministic, never delivered as an email, and passwords remain in Supabase Auth.
  function authEmail(phone) { return `s${phone}@qareeb.local`; }

  function setMode(next) {
    mode = next;
    const signup = mode === "signup";
    title.textContent = signup ? "إنشاء حساب جديد" : "تسجيل الدخول";
    intro.textContent = signup ? "أنشئ حسابك برقم الهاتف وكلمة المرور. لا نرسل رسائل SMS." : "استخدم رقم هاتفك السوداني وكلمة المرور.";
    submit.textContent = signup ? "إنشاء الحساب" : "دخول";
    document.querySelector('[data-auth-action="toggle"]').textContent = signup ? "لدي حساب" : "إنشاء حساب";
    confirmWrap.hidden = !signup;
    confirmInput.required = signup;
    passwordInput.autocomplete = signup ? "new-password" : "current-password";
    passwordInput.value = "";
    confirmInput.value = "";
    message.textContent = "";
  }

  function showAuth(next = "login") {
    if (!dialog.open) dialog.showModal();
    setMode(next);
    phoneInput.focus();
  }

  function setSessionUI(session) {
    const signedIn = Boolean(session?.user);
    if (loginButton) loginButton.hidden = signedIn;
    if (logoutButton) logoutButton.hidden = !signedIn;
  }

  if (client) {
    client.auth.getSession().then(({ data }) => setSessionUI(data.session));
    client.auth.onAuthStateChange((_event, session) => setSessionUI(session));
  }

  // Capture these UI actions so the legacy email-link handler cannot run as well.
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-auth-action]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const action = button.dataset.authAction;
    if (action === "open") showAuth("login");
    else if (action === "toggle") setMode(mode === "login" ? "signup" : "login");
    else if (action === "close") dialog.close();
    else if (action === "logout") {
      if (!client) return toast("خدمة الحسابات غير متاحة حالياً");
      client.auth.signOut().then(({ error }) => {
        if (error) return toast("تعذّر تسجيل الخروج، حاول مرة أخرى");
        dialog.close();
        toast("تم تسجيل الخروج");
      });
    }
  }, true);

  document.addEventListener("click", event => {
    const register = event.target.closest('[data-a="reg"]');
    if (!register) return;
    if (!client) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast("تعذّر الاتصال بخدمة الحسابات حالياً");
      return;
    }
    client.auth.getSession().then(({ data }) => {
      if (!data.session) showAuth("signup");
    });
  }, true);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    if (!client) {
      message.textContent = "خدمة الحسابات غير متاحة. تحقق من إعدادات Supabase.";
      return;
    }
    const phone = normalizedPhone(phoneInput.value);
    const password = passwordInput.value;
    if (!phone) {
      message.textContent = "أدخل رقمًا سودانيًا صحيحًا مثل 0912345678 أو 249912345678.";
      phoneInput.focus();
      return;
    }
    if (password.length < 8) {
      message.textContent = "كلمة المرور يجب ألا تقل عن 8 أحرف.";
      passwordInput.focus();
      return;
    }
    if (mode === "signup" && password !== confirmInput.value) {
      message.textContent = "كلمتا المرور غير متطابقتين.";
      confirmInput.focus();
      return;
    }

    busy = true;
    submit.disabled = true;
    message.textContent = mode === "signup" ? "جارٍ إنشاء الحساب…" : "جارٍ تسجيل الدخول…";
    try {
      const email = authEmail(phone);
      const result = mode === "signup"
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) {
        message.textContent = mode === "signup"
          ? "تعذّر إنشاء الحساب. قد يكون الرقم مسجلاً أو يلزم تعطيل تأكيد البريد في إعدادات Supabase."
          : "رقم الهاتف أو كلمة المرور غير صحيحة.";
        return;
      }
      if (mode === "signup" && !result.data.session) {
        message.textContent = "الحساب أُنشئ لكن Supabase يطلب تأكيد البريد. عطّل تأكيد البريد في إعدادات Auth حتى يعمل الدخول دون بريد أو SMS.";
        return;
      }
      dialog.close();
      toast(mode === "signup" ? "تم إنشاء الحساب" : "تم تسجيل الدخول");
      if (mode === "signup") {
        setTimeout(() => document.querySelector('[data-a="reg"]')?.click(), 150);
      }
    } catch {
      message.textContent = "تعذّر الاتصال الآن. تحقق من اتصال الإنترنت وحاول مجدداً.";
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });

  setMode("login");
})();
