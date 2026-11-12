/* ============================================================
   NEXUS//AETHER — client-side
   ============================================================ */
(() => {
"use strict";

const LS_USERS     = "cf_users";
const LS_SESSION   = "cf_session";
const LS_CHAT      = "cf_chat";
const LS_AI        = "cf_ai_pos";
const LS_LOCK      = "cf_chat_locked";
const LS_DISAPPEAR = "cf_disappear_timer";
const LS_GLOBAL_PRIV = "cf_global_priv";

const ADMIN_EMAIL = "admin@nexus.dev";
const ADMIN_PASS  = "Jaccksallas#2025";
const COOLDOWN_MS = 3 * 60 * 60 * 1000;
const MAX_CHAT    = 300;

const DISAPPEAR_OPTS = { 
  off: 0, "24h": 864e5, "7d": 6048e5, "14d": 12096e5, 
  "30d": 2592e6, "60d": 5184e6, "90d": 7776e6 
};

const ACCESS     = { admin: "100%", partner: "60%", member: "50%" };
const ROLE_LABEL = { admin: "ADMIN", partner: "PARTNER", member: "MEMBER" };

/* ---------- util ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const pad = n => String(n).padStart(2, "0");
const fmtClock = ts => {
  const d = new Date(ts);
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
};
const uid4 = () => Math.random().toString(36).slice(2, 10);
const randDigits = n => String(Math.floor(Math.pow(10, n - 1) + Math.random() * 9 * Math.pow(10, n - 1)));
const randCode = () => {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += A[Math.floor(Math.random() * A.length)];
  return s.slice(0, 4) + "-" + s.slice(4);
};

/* ---------- storage ---------- */
const store = {
  users:   () => { try { return JSON.parse(localStorage.getItem(LS_USERS) || "[]"); } catch { return []; } },
  saveUsers: u => localStorage.setItem(LS_USERS, JSON.stringify(u)),
  chat:    () => { try { return JSON.parse(localStorage.getItem(LS_CHAT) || "[]"); } catch { return []; } },
  saveChat: c => localStorage.setItem(LS_CHAT, JSON.stringify(c.slice(-MAX_CHAT))),
  session: () => localStorage.getItem(LS_SESSION),
  setSession: id => id ? localStorage.setItem(LS_SESSION, id) : localStorage.removeItem(LS_SESSION),
  
  isLocked: () => localStorage.getItem(LS_LOCK) === "true",
  setLock: v => localStorage.setItem(LS_LOCK, v ? "true" : "false")
};

function currentUser() {
  const id = store.session();
  if (!id) return null;
  return store.users().find(u => u.id === id) || null;
}
function patchUser(id, patch) {
  const users = store.users();
  const i = users.findIndex(u => u.id === id);
  if (i < 0) return null;
  users[i] = Object.assign({}, users[i], patch);
  store.saveUsers(users);
  return users[i];
}

/* ---------- seed ---------- */
function seed() {
  if (localStorage.getItem(LS_USERS)) return;
  const now = Date.now();
  const users = [
    {
      id: "u_admin", name: "Aril Neverlow", email: ADMIN_EMAIL, provider: "System",
      role: "admin", isOriginalAdmin: true, level: 99, uid: "NX-0001", xp: 9940, premium: true, incognito: false,
      chatUnlocked: true, joinedAt: now - 864e5 * 30, secret: "GODT-ADMN",
      avatar: "", banner: "", showProvider: false
    },
    {
      id: "u_partner", name: "AETHER WARDEN", email: "partner@nexus.dev", provider: "Google",
      role: "partner", isOriginalAdmin: false, level: 42, uid: "NX-0042", xp: 4200, premium: false,
      chatUnlocked: false, joinedAt: now - 864e5 * 7, secret: "AETH-RW42",
      avatar: "", banner: "", showProvider: false
    },
    {
      id: "u_member", name: "NEON RUNNER", email: "member@nexus.dev", provider: "Email",
      role: "member", isOriginalAdmin: false, level: 12, uid: "NX-0120", xp: 1150, premium: false,
      chatUnlocked: false, joinedAt: now - 864e5 * 2, secret: "",
      avatar: "", banner: "", showProvider: false
    }
  ];
  store.saveUsers(users);
  store.saveChat([
    { id: uid4(), uid: "u_admin", name: "Aril Neverlow", role: "admin",
      text: "Selamat datang di NEXUS//AETHER. Akses inti hanya lewat #admin.", ts: now - 7200e3, deletedFor: [], deletedForAll: false },
    { id: uid4(), uid: "u_partner", name: "AETHER WARDEN", role: "partner",
      text: "Kode Rahasia chat Global dipegang Admin. Hubungi lewat panel kanan bawah.", ts: now - 3600e3, deletedFor: [], deletedForAll: false }
  ]);
  localStorage.setItem(LS_GLOBAL_PRIV, "false");
}

/* ---------- routing ---------- */
function show(which) {
  $("#screenLogin").classList.toggle("active", which === "login");
  $("#screenAdmin").classList.toggle("active", which === "admin");
  $("#screenApp").classList.toggle("active", which === "app");
}
function route() {
  const u = currentUser();
  if (u) {
    show("app");
    renderApp();
    if (location.hash === "#admin" && u.role === "admin") openCore();
  } else {
    document.body.dataset.role = "none";
    show(location.hash === "#admin" ? "admin" : "login");
  }
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, kind) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- XP Logic ---------- */
function getLevelAndXP(totalXp) {
    let level = 1;
    let xpForNext = 1000;
    let currentXp = Math.max(0, totalXp);
    while (currentXp >= xpForNext) {
        currentXp -= xpForNext;
        level++;
        xpForNext = level * 1000;
    }
    return { level, currentXp, xpForNext };
}

/* ---------- avatar default ---------- */
function defaultAvatar(name, role) {
  const color = role === "admin" ? "#ffcf5c" : role === "partner" ? "#4da3ff" : "#9fb3d1";
  const ini = (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#16253c"/></linearGradient></defs>
<rect width="160" height="160" fill="url(#g)"/>
<circle cx="80" cy="80" r="70" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="1"/>
<text x="80" y="84" fill="${color}" font-family="monospace" font-size="54" font-weight="700"
text-anchor="middle" dominant-baseline="middle">${ini}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- image compress ---------- */
function fileToDataURL(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("not image"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(maxW / img.width, maxH / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode fail")); };
    img.src = url;
  });
}

/* ---------- auth ---------- */
function createUser({ name, email, provider, role = "member" }) {
  const users = store.users();
  const u = {
    id: "u_" + uid4(),
    name: name || `${provider} Warden`,
    email: email || `${provider.toLowerCase()}-${uid4()}@nexus.local`,
    provider,
    role,
    isOriginalAdmin: false,
    level: 1,
    uid: "NX-" + randDigits(4),
    xp: 0,
    premium: false,
    incognito: false,
    chatUnlocked: false,
    joinedAt: Date.now(),
    secret: "", 
    avatar: "",
    banner: "",
    showProvider: false
  };
  users.push(u);
  store.saveUsers(users);
  return u;
}

function login(user) {
  store.setSession(user.id);
  if (location.hash === "#admin") history.replaceState(null, "", location.pathname);
  route();
  if (user.role !== "admin" && !user.chatUnlocked && !user.premium && !user.secret) {
    setTimeout(() => showNoSecretModal(), 400);
  }
}

function logout() {
  store.setSession(null);
  history.replaceState(null, "", location.pathname);
  route();
}

/* ---------- chat gate ---------- */
function canChat(u) {
  if (!u) return { ok: false, reason: "auth" };
  if (u.role === "admin" || u.role === "partner") return { ok: true };
  if (store.isLocked()) return { ok: false, reason: "locked" };
  if (u.premium || u.chatUnlocked) return { ok: true };
  
  const left = COOLDOWN_MS - (Date.now() - u.joinedAt);
  if (left > 0) return { ok: false, reason: "cooldown", left };
  return { ok: true };
}

/* ---------- XP ---------- */
function addXP(u, amount) {
  const users = store.users();
  const t = users.find(x => x.id === u.id);
  if (!t) return;
  t.xp += amount;
  store.saveUsers(users);
}

/* ============================================================
   BADGE SYSTEM
   ============================================================ */
function getBadgeHTML(user, isIncognito) {
  if (!user) return '';
  
  if (isIncognito) {
    if (user.isOriginalAdmin) return ''; // Hide completely
    if (user.role === 'admin') return `<span class="badge-icon badge-admin-buyer"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffcf5c" stroke="#ffab1f" stroke-width="2"/><path d="M8 12 L11 15 L16 9" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg></span>`;
    if (user.role === 'partner') return `<span class="badge-icon badge-partner"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2dffa8" stroke="#00a884" stroke-width="2"/><path d="M8 12 L11 15 L16 9" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg></span>`;
    if (user.premium) return `<span class="badge-icon badge-premium"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#c084fc" stroke="#9333ea" stroke-width="2"/><path d="M8 12 L11 15 L16 9" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg></span>`;
    return '';
  }

  if (user.isOriginalAdmin) {
    return `<span class="badge-icon badge-admin-original"><svg viewBox="0 0 24 24">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf5c"/><stop offset="1" stop-color="#ffab1f"/></linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dffa8"/><stop offset="1" stop-color="#00a884"/></linearGradient>
        <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4da3ff"/><stop offset="1" stop-color="#1a66ff"/></linearGradient>
        <linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4a4a"/><stop offset="1" stop-color="#cc0000"/></linearGradient>
      </defs>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="url(#g1)"/>
      <path d="M12 2 L22 12 L12 12 Z" fill="url(#g3)"/>
      <path d="M22 12 L12 22 L12 12 Z" fill="url(#g2)"/>
      <path d="M12 22 L2 12 L12 12 Z" fill="url(#g4)"/>
      <path d="M12 6 L14 12 L12 18 L10 12 Z" fill="#fff"/>
    </svg></span>`;
  }
  if (user.role === 'admin') {
    return `<span class="badge-icon badge-admin-buyer"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffcf5c" stroke="#ffab1f" stroke-width="2"/><path d="M8 12 L11 15 L16 9" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg></span>`;
  }
  if (user.role === 'partner') {
    return `<span class="badge-icon badge-partner"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2dffa8" stroke="#00a884" stroke-width="2"/><path d="M8 12 L11 15 L16 9" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg></span>`;
  }
  if (user.premium) {
    return `<span class="badge-icon badge-premium"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#c084fc" stroke="#9333ea" stroke-width="2"/><path d="M8 12 L11 15 L16 9" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg></span>`;
  }
  return '';
}

/* ============================================================
   RENDER
   ============================================================ */
function renderApp() {
  const u = currentUser();
  if (!u) return;

  document.body.dataset.role = u.role;

  const bannerEl = $("#bannerEl");
  if (u.banner) {
    bannerEl.style.backgroundImage = `linear-gradient(180deg,rgba(4,6,11,.15),rgba(4,6,11,.7)), url("${u.banner}")`;
  } else {
    bannerEl.style.backgroundImage = "";
  }

  $("#avatarImg").src = u.avatar || defaultAvatar(u.name, u.role);
  const isIncog = u.incognito;
  const badgeHtml = getBadgeHTML(u, isIncog);
  $("#profileName").innerHTML = `${esc(u.name)}${badgeHtml}`;
  $("#tagAccess").textContent = ACCESS[u.role] || "50%";
  $("#tagProvider").textContent = (u.provider || "Email").toUpperCase();
  $("#bRole").textContent = ROLE_LABEL[u.role] || "MEMBER";
  $("#bLevel").textContent = u.level;
  $("#bUid").textContent = u.uid;

  const xpData = getLevelAndXP(u.xp || 0);
  const pct = Math.round((xpData.currentXp / xpData.xpForNext) * 100);
  
  $("#xpLv").textContent = xpData.level;
  $("#xpPct").textContent = pct + "%";
  $("#xpFill").style.width = pct + "%";

  const premBtn = $("#btnPremium");
  if (u.premium || u.role === "admin") {
    $("#premState").textContent = "PREMIUM";
    $("#premNote").textContent = u.role === "admin" ? "Akses penuh otomatis" : "Chat instan aktif";
    premBtn.textContent = "PREMIUM AKTIF";
    premBtn.classList.add("done");
    premBtn.disabled = true;
  } else {
    $("#premState").textContent = "FREE";
    $("#premNote").textContent = "Berbayar — hubungi Admin";
    premBtn.textContent = "BELI PREMIUM";
    premBtn.classList.remove("done");
    premBtn.disabled = false;
  }

  $("#setCore").style.display = u.role === "admin" ? "block" : "none";

  const privacyBtn = $("#setPrivacy");
  if (u.role === "admin" || u.role === "partner") {
    privacyBtn.style.display = "block";
    privacyBtn.textContent = u.showProvider ? "SEMBUNYIKAN METODE LOGIN" : "TAMPILKAN METODE LOGIN";
  } else {
    privacyBtn.style.display = "none";
  }

  const lockBtn = $("#btnLockChat");
  if (u.role === "admin" || u.role === "partner") {
    lockBtn.style.display = "grid";
    const isLocked = store.isLocked();
    lockBtn.textContent = isLocked ? "🔒" : "🔓";
  } else {
    lockBtn.style.display = "none";
  }

  const incogBtn = $("#btnIncognito");
  if (u.role === "admin" || u.role === "partner") {
    incogBtn.style.display = "grid";
    incogBtn.classList.toggle("active", u.incognito);
    incogBtn.textContent = u.incognito ? "👻" : "🕵️";
  } else {
    incogBtn.style.display = "none";
  }

  renderChat();
  updateGate();
}

function renderChat() {
  const body = $("#chatBody");
  const u = currentUser();
  const users = store.users();
  
  let msgs = store.chat();
  
  if (u && u.role !== "admin") {
    msgs = msgs.filter(m => m.ts >= u.joinedAt || m.role === "system");
  }
  
  const timer = localStorage.getItem(LS_DISAPPEAR) || "off";
  if (timer !== "off" && DISAPPEAR_OPTS[timer]) {
    const cutoff = Date.now() - DISAPPEAR_OPTS[timer];
    msgs = msgs.filter(m => m.ts >= cutoff || m.role === 'system');
  }

  body.innerHTML = "";
  
  const divider = document.createElement("div");
  divider.className = "date-divider";
  divider.textContent = "Hari Ini";
  body.appendChild(divider);

  msgs.forEach(m => {
    if (m.deletedFor && u && m.deletedFor.includes(u.id)) return;

    if (m.role === "system") {
      const sys = document.createElement("div");
      sys.className = "system-msg";
      sys.textContent = m.text;
      body.appendChild(sys);
      return;
    }

    const isSelf = u && m.uid === u.id;
    const isViewerAdmin = u && u.role === 'admin';
    const msgUser = users.find(x => x.id === m.uid) || { ...m, id: m.uid };
    const isIncog = msgUser.role === "admin" && msgUser.incognito;
    const displayedRole = isIncog ? "member" : (m.role || "member");
    const displayedName = m.name; 
    const badgeHtml = getBadgeHTML(msgUser, isIncog);
    
    const avatarSrc = msgUser.avatar ? msgUser.avatar : defaultAvatar(displayedName, displayedRole);
    
    const row = document.createElement("div");
    row.className = `msg-row ${isSelf ? 'outgoing' : 'incoming'}`;
    
    let avatarHtml = "";
    if (!isSelf) {
      avatarHtml = `<img class="msg-avatar" src="${avatarSrc}" alt="${esc(displayedName)}" data-uid="${m.uid}">`;
    }

    let senderHtml = "";
    if (!isSelf) {
      senderHtml = `
        <div class="msg-sender ${displayedRole}" data-uid="${m.uid}">
          <span>${esc(displayedName)}</span>${badgeHtml}
        </div>`;
    }

    let replyHtml = "";
    if (m.replyTo) {
      replyHtml = `
        <div class="quoted-msg" data-reply-id="${m.replyTo}">
          <div class="quoted-name">${esc(m.replyName || 'User')}</div>
          <div class="quoted-text">${esc(m.replyText || '')}</div>
        </div>`;
    }

    let ticks = "";
    if (isSelf) {
      ticks = `<svg width="16" height="11" viewBox="0 0 16 11" fill="none" style="margin-left:2px"><path d="M11.5 1L5.5 7L2.5 4M15 1L9 7L7.5 5.5" stroke="#53bdeb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    let textContent = esc(m.text || "");
    if (m.deletedForAll) textContent = "Pesan ini telah dihapus";
    const textClass = m.deletedForAll ? "msg-text deleted" : "msg-text";

    let mediaHtml = "";
    if (!m.deletedForAll && m.mediaType) {
      const isViewed = m.viewOnce && m.viewedBy && m.viewedBy.includes(u.id);
      
      if (m.viewOnce) {
        const typeLabel = m.mediaType === 'image' ? 'Foto' : (m.mediaType === 'video' ? 'Video' : 'VN');
        
        if (isViewerAdmin) {
            mediaHtml = `
                <div class="vo-closed-bubble" data-media-id="${m.id}">
                  <div class="vo-icon-dashed">1</div>
                  <div class="vo-text">${typeLabel}</div>
                </div>`;
        } else if (isSelf) {
            mediaHtml = `
                <div class="vo-closed-bubble" data-media-id="${m.id}" style="cursor:default; opacity:0.8;">
                  <div class="vo-icon-dashed">1</div>
                  <div class="vo-text">${typeLabel}</div>
                </div>`;
        } else {
            if (isViewed) {
                mediaHtml = `
                    <div class="vo-closed-bubble opened" data-media-id="${m.id}">
                      <div class="vo-icon-dashed" style="opacity:0.5">1</div>
                      <div class="vo-text">Dibuka</div>
                    </div>`;
            } else {
                mediaHtml = `
                    <div class="vo-closed-bubble" data-media-id="${m.id}">
                      <div class="vo-icon-dashed">1</div>
                      <div class="vo-text">${typeLabel}</div>
                    </div>`;
            }
        }
      } else {
        if (m.mediaType === 'image') {
          mediaHtml = `<img class="msg-media-img" src="${m.mediaData}" />`;
        } else if (m.mediaType === 'sticker') {
          mediaHtml = `<img class="msg-media-sticker" src="${m.mediaData}" />`;
        } else if (m.mediaType === 'audio') {
          mediaHtml = `
            <div class="msg-media-vn">
               <div class="vn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
               <div class="vn-waveform"></div>
            </div>`;
        } else if (m.mediaType === 'video') {
          mediaHtml = `
            <div class="msg-media-video">
              <video src="${m.mediaData}" preload="metadata"></video>
              <div class="video-play-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
            </div>`;
        }
      }
    }

    row.innerHTML =
      `${avatarHtml}
       <div class="msg-bubble-wrap">
         <div class="msg-reply-icon" aria-hidden="true">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
           </svg>
         </div>
         <div class="msg-bubble" data-msg-id="${m.id}">
           ${senderHtml}
           ${replyHtml}
           ${mediaHtml}
           ${textContent ? `<div class="${textClass}">${textContent}</div>` : ''}
           <div class="msg-meta">
             ${fmtClock(m.ts)}
             ${ticks}
           </div>
         </div>
       </div>`;
       
    body.appendChild(row);

    const bubbleEl = row.querySelector('.msg-bubble');
    if (bubbleEl) initBubbleInteractions(bubbleEl, m);

    row.querySelectorAll('.vo-closed-bubble:not(.opened)').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleViewOnceClick(m, el);
      });
    });

    row.querySelectorAll('.msg-media-img:not(.vo-closed-bubble .msg-media-img)').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        openMediaViewer(m);
      });
    });
    row.querySelectorAll('.msg-media-vn:not(.vo-closed-bubble .msg-media-vn)').forEach(vn => {
      vn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMediaViewer(m);
      });
    });
    row.querySelectorAll('.msg-media-video').forEach(vid => {
      vid.addEventListener('click', (e) => {
        e.stopPropagation();
        openMediaViewer(m);
      });
    });
  });

  body.querySelectorAll('.msg-sender').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openProfileView(el.dataset.uid);
    });
  });
  
  body.querySelectorAll('.msg-avatar').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openProfileView(el.dataset.uid);
    });
  });

  const members = users.filter(x => x.id !== (u && u.id)).length;
  $("#chatOnline").textContent = (members + 1) + " Online";

  setTimeout(() => {
    body.scrollTop = body.scrollHeight;
  }, 50);
}

/* ============================================================
   VIEW ONCE LOGIC
   ============================================================ */
function handleViewOnceClick(m, el) {
  const u = currentUser();
  const isAdmin = u.role === 'admin';
  const isSelf = m.uid === u.id;

  if (isSelf && !isAdmin) {
      toast("Media 1x lihat tidak dapat dibuka oleh pengirim", "err");
      return;
  }

  if (isAdmin) {
      openMediaViewer(m);
      return;
  }

  const isDownloaded = m.downloadedBy && m.downloadedBy.includes(u.id);
  const isViewed = m.viewedBy && m.viewedBy.includes(u.id);

  if (isViewed) {
      toast("Media 1x lihat sudah dibuka", "err");
      return;
  }

  if (!isDownloaded) {
    el.innerHTML = `<div class="vo-loading"><div class="spinner"></div> Mengunduh...</div>`;
    setTimeout(() => {
      const msgs = store.chat();
      const msg = msgs.find(x => x.id === m.id);
      if (msg) {
        if (!msg.downloadedBy) msg.downloadedBy = [];
        if (!msg.downloadedBy.includes(u.id)) msg.downloadedBy.push(u.id);
        store.saveChat(msgs);
        renderChat();
        toast("Media berhasil diunduh. Ketuk untuk membuka.", "ok");
      }
    }, 1500);
  } else {
    openMediaViewer(m);
  }
}

/* ============================================================
   MEDIA PREVIEW & HANDLING
   ============================================================ */
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let pendingMediaBase64 = null;
let pendingMediaType = null;
let pendingIsViewOnce = false;

function initMediaHandlers() {
  $("#btnCamera").addEventListener("click", () => $("#filePhoto").click());
  $("#filePhoto").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await fileToDataURL(file, 800, 800, 0.7);
      openMediaPreview(base64, 'image');
    } catch { toast("Gagal memuat gambar", "err"); }
    e.target.value = "";
  });

  $("#btnVideo").addEventListener("click", () => $("#fileVideo").click());
  $("#fileVideo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        openMediaPreview(ev.target.result, 'video');
      };
      reader.readAsDataURL(file);
    } catch { toast("Gagal memuat video", "err"); }
    e.target.value = "";
  });

  const btnSticker = $("#btnSticker");
  if (btnSticker) {
    btnSticker.addEventListener("click", () => $("#fileSticker").click());
    $("#fileSticker").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const base64 = await fileToDataURL(file, 200, 200, 0.8);
        sendMediaMessage(base64, 'sticker', false, "");
      } catch { toast("Gagal memuat stiker", "err"); }
      e.target.value = "";
    });
  }

  $("#btnMic").addEventListener("click", async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            openMediaPreview(reader.result, 'audio');
          };
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        $("#btnMic").classList.add("active-recording");
        $("#chatInput").placeholder = "Merekam... (Ketuk Mic lagi untuk kirim)";
        $("#chatInput").disabled = true;
      } catch (err) {
        toast("Izin mikrofon ditolak", "err");
      }
    } else {
      mediaRecorder.stop();
      isRecording = false;
      $("#btnMic").classList.remove("active-recording");
      $("#chatInput").placeholder = "Ketik pesan";
      $("#chatInput").disabled = false;
    }
  });

  $("#previewBtnCancel").addEventListener("click", () => {
    $("#mediaPreviewModal").classList.remove("open");
    pendingMediaBase64 = null;
  });

  $("#previewBtnViewOnce").addEventListener("click", () => {
    pendingIsViewOnce = !pendingIsViewOnce;
    $("#previewBtnViewOnce").classList.toggle("active", pendingIsViewOnce);
  });

  $("#previewBtnSend").addEventListener("click", () => {
    if (!pendingMediaBase64) return;
    const caption = $("#previewCaption").value.trim();
    sendMediaMessage(pendingMediaBase64, pendingMediaType, pendingIsViewOnce, caption);
    $("#mediaPreviewModal").classList.remove("open");
    pendingMediaBase64 = null;
    $("#previewCaption").value = "";
    $("#previewBtnViewOnce").classList.remove("active");
    pendingIsViewOnce = false;
  });
}

function openMediaPreview(base64, type) {
  pendingMediaBase64 = base64;
  pendingMediaType = type;
  pendingIsViewOnce = false;
  
  const contentArea = $("#previewContentArea");
  contentArea.innerHTML = "";
  const voBtn = $("#previewBtnViewOnce");

  if (type === 'image') {
    const img = document.createElement("img");
    img.src = base64;
    img.style.maxWidth = "100%"; img.style.maxHeight = "100%"; img.style.objectFit = "contain";
    contentArea.appendChild(img);
    voBtn.style.display = "flex";
  } else if (type === 'audio') {
    const audio = document.createElement("audio");
    audio.src = base64;
    audio.controls = true;
    audio.style.width = "80%"; audio.style.margin = "auto";
    contentArea.appendChild(audio);
    voBtn.style.display = "flex";
  } else if (type === 'video') {
    const video = document.createElement("video");
    video.src = base64;
    video.controls = true;
    video.style.maxWidth = "100%"; video.style.maxHeight = "100%"; video.style.objectFit = "contain";
    contentArea.appendChild(video);
    voBtn.style.display = "flex";
  }

  $("#previewCaption").value = "";
  $("#previewBtnViewOnce").classList.remove("active");
  $("#mediaPreviewModal").classList.add("open");
}

function sendMediaMessage(mediaData, mediaType, isViewOnce, captionText = "") {
  const u = currentUser(); if (!u) return;
  const gate = canChat(u);
  if (!gate.ok) { toast("Chat terkunci", "err"); return; }

  const msgs = store.chat();
  const newMsg = {
    id: uid4(),
    uid: u.id,
    name: u.name,
    role: u.role,
    text: captionText,
    mediaType,
    mediaData,
    viewOnce: isViewOnce,
    viewedBy: [],
    downloadedBy: [],
    ts: Date.now(),
    deletedFor: [],
    deletedForAll: false
  };

  if (activeReply) {
    newMsg.replyTo = activeReply.id;
    newMsg.replyName = activeReply.name;
    newMsg.replyText = activeReply.deletedForAll ? "Pesan ini telah dihapus" : (activeReply.text || `[${activeReply.mediaType || 'Media'}]`);
  }

  msgs.push(newMsg);
  store.saveChat(msgs);
  clearReply();

  addXP(u, 5);
  renderApp();
}

/* ============================================================
   MEDIA VIEWER
   ============================================================ */
function openMediaViewer(m) {
  const u = currentUser();
  const isSelf = m.uid === u.id;
  const isAdmin = u.role === 'admin';
  
  if (m.viewOnce && !isAdmin) {
      if (isSelf) return;
      if (m.viewedBy && m.viewedBy.includes(u.id)) {
          toast("Media 1x lihat sudah dibuka", "err");
          return;
      }
  }

  const target = $("#mediaRenderTarget");
  target.innerHTML = "";
  $("#mediaViewer").classList.add("open");

  if (m.mediaType === 'image' || m.mediaType === 'sticker') {
    const img = document.createElement("img");
    img.src = m.mediaData;
    target.appendChild(img);
  } else if (m.mediaType === 'audio') {
    const audio = document.createElement("audio");
    audio.src = m.mediaData;
    audio.controls = true;
    audio.autoplay = true;
    audio.style.width = "100%";
    target.appendChild(audio);
    
    audio.onended = () => {
      closeMediaViewer(m);
    };
  } else if (m.mediaType === 'video') {
    const video = document.createElement("video");
    video.src = m.mediaData;
    video.controls = true;
    video.autoplay = true;
    video.style.maxWidth = "90vw";
    video.style.maxHeight = "80vh";
    target.appendChild(video);
  }

  if (m.viewOnce && !isAdmin) {
    const msgs = store.chat();
    const msg = msgs.find(x => x.id === m.id);
    if (msg) {
      if (!msg.viewedBy) msg.viewedBy = [];
      if (!msg.viewedBy.includes(u.id)) msg.viewedBy.push(u.id);
      store.saveChat(msgs);
      renderChat();
    }
  }
}

function closeMediaViewer(m) {
  $("#mediaViewer").classList.remove("open");
  const target = $("#mediaRenderTarget");
  target.innerHTML = "";
}

/* ============================================================
   SWIPE-TO-REPLY & CONTEXT MENU (LONG PRESS / RIGHT CLICK)
   ============================================================ */
function initBubbleInteractions(bubbleEl, msgData) {
  let state = null;
  let pressTimer = null;
  const icon = bubbleEl.parentElement.querySelector('.msg-reply-icon');
  
  bubbleEl.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    const msg = store.chat().find(x => x.id === msgData.id);
    if (msg) showContextMenu(e.clientX, e.clientY, msg);
  });

  bubbleEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('.msg-sender')) return;
    if (e.target.closest('.quoted-msg')) return;
    if (e.target.closest('.vo-closed-bubble')) return;
    if (e.target.closest('.msg-media-img')) return;
    if (e.target.closest('.msg-media-vn')) return;
    if (e.target.closest('.msg-media-video')) return;
    
    e.stopPropagation();
    
    state = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: 0,
      moved: false,
      pointerId: e.pointerId
    };
    
    bubbleEl.style.transition = 'none';
    bubbleEl.style.transform = 'translateX(0)';
    
    pressTimer = setTimeout(() => {
      if (state && !state.moved) {
        if (navigator.vibrate) navigator.vibrate(50);
        bubbleEl.style.transform = 'scale(0.95)';
        setTimeout(() => bubbleEl.style.transform = 'translateX(0)', 150);
        
        const msg = store.chat().find(x => x.id === msgData.id);
        if (msg) showContextMenu(e.clientX, e.clientY, msg);
        
        state.moved = true;
        state.pointerId = null;
        try { bubbleEl.releasePointerCapture(e.pointerId); } catch {}
      }
    }, 500);
    
    try { bubbleEl.setPointerCapture(e.pointerId); } catch {}
  });
  
  bubbleEl.addEventListener('pointermove', e => {
    if (!state || e.pointerId !== state.pointerId) return;
    
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    
    if (!state.moved) {
      if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
        clearTimeout(pressTimer);
      }
      
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        try { bubbleEl.releasePointerCapture(e.pointerId); } catch {}
        state = null;
        bubbleEl.style.transition = '';
        bubbleEl.style.transform = '';
        if (icon) { icon.style.opacity = '0'; icon.style.transform = ''; }
        return;
      }
      
      if (dx > 5) {
        state.moved = true;
      }
    }
    
    if (state.moved && state.pointerId) {
      if (dx > 0) {
        const clamped = Math.min(dx, 60);
        state.currentX = clamped;
        bubbleEl.style.transform = `translateX(${clamped}px)`;
        
        if (icon) {
          const p = Math.min(clamped / 50, 1);
          icon.style.opacity = String(p);
          icon.style.transform = `translateY(-50%) scale(${0.6 + p * 0.4})`;
        }
      }
    }
  });
  
  bubbleEl.addEventListener('pointerup', e => {
    clearTimeout(pressTimer);
    if (!state || e.pointerId !== state.pointerId) return;
    try { bubbleEl.releasePointerCapture(e.pointerId); } catch {}
    
    const s = state;
    state = null;
    
    const wasSwipe = s.currentX > 45;
    
    bubbleEl.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)';
    bubbleEl.style.transform = 'translateX(0)';
    if (icon) {
      icon.style.opacity = '0';
      icon.style.transform = 'translateY(-50%) scale(0.6)';
    }
    
    if (wasSwipe) {
      const msg = store.chat().find(x => x.id === msgData.id);
      if (msg && !msg.deletedForAll) setReply(msg);
    }
  });
  
  bubbleEl.addEventListener('pointercancel', e => {
    clearTimeout(pressTimer);
    if (!state) return;
    state = null;
    bubbleEl.style.transition = 'transform 0.2s ease';
    bubbleEl.style.transform = 'translateX(0)';
    if (icon) { icon.style.opacity = '0'; icon.style.transform = ''; }
  });
}

function openProfileView(id) {
  const users = store.users();
  let u = users.find(x => x.id === id);
  if (!u) return;
  
  const me = currentUser();
  const isViewerAdmin = me && me.role === 'admin';
  const isIncog = u.role === "admin" && u.incognito;
  
  let viewRole = u.role;
  if (isIncog && !isViewerAdmin) {
      viewRole = "member";
  }

  const modal = $("#profileViewModal");
  modal.dataset.role = viewRole;
  
  const bannerEl = $("#pvBanner");
  if (u.banner) {
    bannerEl.style.backgroundImage = `url("${u.banner}")`;
  } else {
    bannerEl.style.backgroundImage = "";
  }
  
  $("#pvAvatar").src = u.avatar || defaultAvatar(u.name, viewRole);
  const badgeHtml = getBadgeHTML(u, isIncog);
  $("#pvName").innerHTML = `${esc(u.name)}${badgeHtml}`;
  $("#pvAccess").textContent = ACCESS[viewRole] || "50%";

  let canSeeProvider = false;
  let hideAccessLevel = false;

  if (u.isOriginalAdmin && u.incognito && !isViewerAdmin) {
      hideAccessLevel = true;
      canSeeProvider = false;
  } else {
      canSeeProvider = isViewerAdmin || localStorage.getItem(LS_GLOBAL_PRIV) === "true";
  }

  if (hideAccessLevel) {
      $("#pvAccess").style.display = "none";
      $("#pvProvider").style.display = "none";
      $("#pvDot").style.display = "none";
      $(".profile-view-modal .profile-tagline").style.display = "none";
  } else {
      $("#pvAccess").style.display = "inline";
      $(".profile-view-modal .profile-tagline").style.display = "block";
      if (canSeeProvider) {
          $("#pvProvider").style.display = "inline";
          $("#pvDot").style.display = "inline";
          $("#pvProvider").textContent = (u.provider || "Email").toUpperCase();
      } else {
          $("#pvProvider").style.display = "none";
          $("#pvDot").style.display = "none";
      }
  }
  
  $("#pvRole").textContent = ROLE_LABEL[viewRole] || "MEMBER";
  $("#pvLevel").textContent = u.level;
  $("#pvUid").textContent = u.uid;
  
  $("#modalProfile").classList.add("open");
}

let gateTicker = null;
function updateGate() {
  const u = currentUser();
  if (!u) return;

  const gate = canChat(u);
  const gateEl = $("#chatGate");
  const formEl = $("#chatForm");
  const timerEl = $("#gateTimer");
  const secretRow = $("#gateSecretRow");
  const contact = $("#gateContact");
  const msgEl = $("#gateMessage");

  if (gate.ok) {
    gateEl.classList.remove("show");
    formEl.classList.remove("locked");
    $("#chatInput").disabled = false;
    clearInterval(gateTicker);
    gateTicker = null;
    return;
  }

  gateEl.classList.add("show");
  formEl.classList.add("locked");
  $("#chatInput").disabled = true;

  if (gate.reason === "locked") {
    msgEl.innerHTML = "⚠ <b>CHAT GLOBAL DIKUNCI</b><br>Partner telah menutup sementara Global Chat.";
    timerEl.style.display = "none";
    secretRow.style.display = "none";
    contact.style.display = "flex";
    return;
  }

  timerEl.style.display = "block";
  contact.style.display = "flex";

  if (!u.secret) {
    msgEl.textContent = "Minta code ke Admin untuk buka chat Global!";
    secretRow.style.display = "none";
  } else {
    msgEl.textContent = "Masukkan Kode Rahasia dari Admin untuk membuka chat.";
    secretRow.style.display = "flex";
  }

  const paint = () => {
    const g = canChat(currentUser());
    if (g.ok) { updateGate(); return; }
    const left = Math.max(0, g.left || 0);
    const h = Math.floor(left / 3600e3);
    const m = Math.floor((left % 3600e3) / 60e3);
    const s = Math.floor((left % 60e3) / 1000);
    timerEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  paint();
  if (!gateTicker) gateTicker = setInterval(paint, 1000);
}

/* ---------- no-secret modal ---------- */
function showNoSecretModal() {
  const u = currentUser();
  if (!u) return;
  $("#secretTitle").textContent = "KODE RAHASIA BELUM ADA";
  $("#secretDesc").innerHTML = "<b>Minta code ke Admin untuk buka chat Global!</b><br>Hubungi Admin lewat WhatsApp atau Telegram di bawah.";
  $("#secretValue").style.display = "none";
  $("#secretAlt").style.display = "grid";
  $("#modalSecret").classList.add("open");
}

function showSecretModal(u) {
  $("#secretTitle").textContent = "KODE RAHASIA KAMU";
  $("#secretDesc").textContent = "Simpan kode ini. Masukkan di panel chat untuk membuka kunci.";
  $("#secretValue").style.display = "block";
  $("#secretValue").textContent = u.secret;
  $("#secretAlt").style.display = "none";
  $("#modalSecret").classList.add("open");
}

/* ============================================================
   PREMIUM PACKAGES & PAYMENT
   ============================================================ */
const CATEGORIES = [
  { id: 'biasa', name: 'Paket Premium Biasa', icon: '👤', desc: 'Akses fitur dasar premium' },
  { id: 'partner', name: 'Paket Premium / Partner', icon: '🤝', desc: 'Akses fitur premium + Partner badge' },
  { id: 'admin', name: 'Paket Admin (Terbatas)', icon: '👑', desc: 'Akses admin terbatas + Gold Badge' }
];

const PKG_DATA = {
  biasa: [
    { id: '7d', title: 'Premium 7 Hari', price: 5000, days: 7, bonusExp: 2500, features: ['Akses semua fitur', 'Tanpa iklan', 'Pilih banner profil', 'Upload foto profil'] },
    { id: '1m', title: 'Premium 1 Bulan', price: 10000, days: 30, bonusExp: 10000, features: ['Akses semua fitur', 'Tanpa iklan', 'Pilih banner profil', 'Upload foto profil'] },
    { id: '3m', title: 'Premium 3 Bulan', price: 30000, days: 90, bonusExp: 50000, discount: '5%', features: ['Semua fitur 1 bulan', 'Diskon 5%'] },
    { id: '6m', title: 'Premium 6 Bulan', price: 60000, days: 180, bonusExp: 120000, discount: '15%', features: ['Semua fitur 3 bulan', 'Diskon 15%', 'Priority support'] },
    { id: '1y', title: 'Premium 1 Tahun', price: 110000, days: 365, bonusExp: 300000, discount: '8%', popular: true, features: ['Semua fitur premium', 'Diskon maksimal 5%', 'VIP Support', 'Uploads Custom Banner'] },
    { id: '3y', title: 'Premium 3 Tahun', price: 252000, days: 1095, bonusExp: 500000, discount: '30%', cheapest: true, features: ['Semua fitur premium', 'Diskon maksimal 30%', 'VIP Support', 'Pilih badge eksklusif', 'Uploads Custom Banner', 'Edit privasi akun', 'Warna nama di komentar'] }
  ],
  partner: [
    { id: '7d', title: 'Partner 7 Hari', price: 10000, days: 7, bonusExp: 2500, features: ['Akses semua fitur', 'Tanpa iklan', 'Pilih banner profil', 'Upload foto profil', 'Partner Badge'] },
    { id: '1m', title: 'Partner 1 Bulan', price: 15000, days: 30, bonusExp: 10000, features: ['Akses semua fitur', 'Tanpa iklan', 'Pilih banner profil', 'Upload foto profil', 'Partner Badge'] },
    { id: '3m', title: 'Partner 3 Bulan', price: 35000, days: 90, bonusExp: 50000, discount: '5%', features: ['Semua fitur 1 bulan', 'Diskon 5%', 'Partner Badge'] },
    { id: '6m', title: 'Partner 6 Bulan', price: 65000, days: 180, bonusExp: 120000, discount: '15%', features: ['Semua fitur 3 bulan', 'Diskon 15%', 'Priority support', 'Partner Badge'] },
    { id: '1y', title: 'Partner 1 Tahun', price: 160000, days: 365, bonusExp: 300000, discount: '8%', popular: true, features: ['Semua fitur premium', 'Diskon maksimal 5%', 'VIP Support', 'Uploads Custom Banner', 'Partner Badge'] },
    { id: '3y', title: 'Partner 3 Tahun', price: 367000, days: 1095, bonusExp: 500000, discount: '30%', cheapest: true, features: ['Semua fitur premium', 'Diskon maksimal 30%', 'VIP Support', 'Pilih badge eksklusif', 'Uploads Custom Banner', 'Edit privasi akun', 'Warna nama di komentar', 'Partner Badge'] }
  ],
  admin: [
    { id: '7d', title: 'Admin 7 Hari', price: 50000, days: 7, bonusExp: 2500, features: ['Akses fitur Admin', 'Gold Badge', 'Bisa incognito'] },
    { id: '1m', title: 'Admin 1 Bulan', price: 100000, days: 30, bonusExp: 10000, features: ['Akses fitur Admin', 'Gold Badge', 'Bisa incognito'] },
    { id: '1y', title: 'Admin 1 Tahun', price: 500000, days: 365, bonusExp: 300000, popular: true, features: ['Akses fitur Admin', 'Gold Badge', 'Bisa incognito', 'VIP Support'] }
  ]
};

let currentCategory = 'biasa';
let activePremiumModalStep = 'category';

window.selectCategory = function(id) {
  currentCategory = id;
  activePremiumModalStep = 'package';
  renderPremiumModal();
};

window.backToPremiumCategory = function() {
  activePremiumModalStep = 'category';
  renderPremiumModal();
};

window.selectPackage = function(categoryId, pkgId) {
  const pkg = PKG_DATA[categoryId].find(p => p.id === pkgId);
  if (!pkg) return;
  window._selectedPkg = pkg;
  window._selectedCat = categoryId;
  activePremiumModalStep = 'payment';
  renderPremiumModal();
};

window.startAIScanning = function() {
  activePremiumModalStep = 'scanning';
  renderPremiumModal();
  
  setTimeout(() => {
    const u = currentUser();
    if (!u) return;
    
    const pkg = window._selectedPkg;
    const cat = window._selectedCat;
    
    const patch = {
      premium: true,
      xp: (u.xp || 0) + pkg.bonusExp
    };
    
    if (cat === 'partner') {
      patch.role = 'partner';
    } else if (cat === 'admin') {
      patch.role = 'admin';
      patch.isOriginalAdmin = false;
    }
    
    patchUser(u.id, patch);
    addXP(u, 0);
    
    activePremiumModalStep = 'success';
    renderPremiumModal();
    renderApp();
    toast("Pembayaran berhasil diverifikasi!", "ok");
    
  }, 2500);
};

function openPremiumModal() {
  $("#modalPremium").classList.add("open");
  activePremiumModalStep = 'category';
  renderPremiumModal();
}

function renderPremiumModal() {
  const content = $("#premiumModalContent");
  const u = currentUser();
  
  if (activePremiumModalStep === 'category') {
    content.innerHTML = `
      <div class="prem-header">
        <span style="font-family:var(--mono);font-size:12px;color:var(--gold);letter-spacing:.2em;">— DASHBOARD</span>
        <h2>Upgrade akun lo</h2>
        <p>Pilih paket, bayar, aktivasi instan.</p>
      </div>
      <div class="prem-banner">
        <div class="prem-banner-icon">🎁</div>
        <div class="prem-banner-text">
          <b>Bonus decoration gratis</b>
          <span>Bonus otomatis untuk pembelian paket 1 bulan ke atas</span>
        </div>
      </div>
      <div class="prem-categories">
        ${CATEGORIES.map(cat => `
          <div class="prem-cat-card" onclick="selectCategory('${cat.id}')">
            <div style="font-size:32px;margin-bottom:10px">${cat.icon}</div>
            <b>${cat.name}</b>
            <span>${cat.desc}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else if (activePremiumModalStep === 'package') {
    const pkgs = PKG_DATA[currentCategory];
    const catName = CATEGORIES.find(c => c.id === currentCategory).name;
    content.innerHTML = `
      <div class="prem-header" style="display:flex;align-items:center;justify-content:space-between">
        <button class="btn" style="width:auto;padding:6px 12px;font-size:10px" onclick="backToPremiumCategory()">← Kembali</button>
        <h2 style="font-size:20px;margin:0">${catName}</h2>
        <div style="width:70px"></div>
      </div>
      <div class="prem-packages">
        ${pkgs.map(pkg => `
          <div class="prem-card ${pkg.popular ? 'popular' : ''} ${pkg.cheapest ? 'cheapest' : ''}">
            ${pkg.popular ? '<div style="position:absolute;top:0;right:0;background:var(--gold);color:#000;font-size:10px;font-weight:bold;padding:4px 12px;border-bottom-left-radius:8px">TERPOPULER</div>' : ''}
            ${pkg.cheapest ? '<div style="position:absolute;top:0;right:0;background:var(--gold);color:#000;font-size:10px;font-weight:bold;padding:4px 12px;border-bottom-left-radius:8px">TERMURAH</div>' : ''}
            <div class="prem-card-head">
              <div class="prem-icon">${pkg.popular ? '⭐' : pkg.cheapest ? '💎' : '⏱️'}</div>
              <div class="prem-title">${pkg.title}</div>
            </div>
            <div class="prem-price"><span class="curr">Rp</span>${pkg.price.toLocaleString('id-ID')}</div>
            <div class="prem-duration">${pkg.days} HARI</div>
            <div class="prem-desc">${pkg.discount ? `Diskon ${pkg.discount}!` : ''} Dapatkan bonus tambahan exp sebanyak ${(pkg.bonusExp/1000)}k.</div>
            <ul class="prem-features">
              ${pkg.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <button class="prem-btn" onclick="selectPackage('${currentCategory}', '${pkg.id}')">Pilih Paket</button>
          </div>
        `).join('')}
      </div>
    `;
  } else if (activePremiumModalStep === 'payment') {
    const pkg = window._selectedPkg;
    content.innerHTML = `
      <div class="prem-header">
        <h2>Pembayaran</h2>
        <p>${pkg.title} - Rp ${pkg.price.toLocaleString('id-ID')}</p>
      </div>
      <div class="payment-box">
        <div class="payment-qris">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#fff"/>
            <rect x="10" y="10" width="20" height="20" fill="#000"/>
            <rect x="70" y="10" width="20" height="20" fill="#000"/>
            <rect x="10" y="70" width="20" height="20" fill="#000"/>
            <rect x="40" y="40" width="20" height="20" fill="#000"/>
            <path d="M35 10 h30 v10 h-30 z M10 35 h10 v30 h-10 z M80 35 h10 v30 h-10 z M35 80 h30 v10 h-30 z" fill="#000"/>
            <rect x="40" y="10" width="5" height="5" fill="#000"/>
            <rect x="55" y="10" width="5" height="5" fill="#000"/>
            <rect x="10" y="40" width="5" height="5" fill="#000"/>
            <rect x="10" y="55" width="5" height="5" fill="#000"/>
            <rect x="85" y="40" width="5" height="5" fill="#000"/>
            <rect x="85" y="55" width="5" height="5" fill="#000"/>
            <rect x="40" y="85" width="5" height="5" fill="#000"/>
            <rect x="55" y="85" width="5" height="5" fill="#000"/>
          </svg>
        </div>
        <div class="payment-details">
          <p>Transfer ke E-Wallet:</p>
          <b>085242725765</b>
          <p>a.n. Aril Neverlow</p>
          <p style="font-size:11px;color:#6b7280;margin-top:8px">DANA / GoPay / OVO</p>
        </div>
        <div class="payment-actions">
          <button class="prem-btn" onclick="document.getElementById('filePayment').click()" id="btnUploadProof">Unggah Bukti Transfer</button>
          <button class="prem-btn" id="btnConfirmPay" style="display:none" onclick="startAIScanning()">Konfirmasi Bayar</button>
        </div>
        <button class="btn" style="width:auto;margin:16px auto 0;padding:6px 12px;font-size:10px;border:none;color:#9ca3af" onclick="backToPremiumCategory()">Batal</button>
      </div>
    `;
    
    $("#filePayment").onchange = () => {
      if ($("#filePayment").files.length > 0) {
        $("#btnUploadProof").textContent = "✓ Bukti Terunggah";
        $("#btnUploadProof").style.borderColor = "#2dffa8";
        $("#btnUploadProof").style.color = "#2dffa8";
        $("#btnConfirmPay").style.display = "block";
      }
    };
  } else if (activePremiumModalStep === 'scanning') {
    content.innerHTML = `
      <div class="prem-header">
        <h2>Memverifikasi</h2>
        <p>Mohon tunggu sebentar...</p>
      </div>
      <div class="scanning-container">
        <div class="scanning-line"></div>
        <div style="font-size:40px">🤖</div>
      </div>
      <div class="scanning-text">AI Scanning Payment...</div>
    `;
  } else if (activePremiumModalStep === 'success') {
    content.innerHTML = `
      <div class="prem-header" style="margin-top:40px">
        <div style="font-size:60px;margin-bottom:16px">🎉</div>
        <h2>Pembayaran Berhasil!</h2>
        <p>Paket <b>${window._selectedPkg.title}</b> telah aktif.</p>
      </div>
      <div style="text-align:center;margin-bottom:24px">
        <p style="color:#ffcf5c;font-size:18px;font-weight:bold">+${(window._selectedPkg.bonusExp/1000)}k EXP</p>
        <p style="font-size:13px;color:#9ca3af">Telah ditambahkan ke akunmu.</p>
      </div>
      <button class="prem-btn" style="max-width:300px;margin:0 auto" onclick="document.getElementById('modalPremium').classList.remove('open')">Tutup</button>
    `;
  }
}

/* ============================================================
   CORE SETTINGS
   ============================================================ */
function openCore() {
  const me = currentUser();
  if (!me || me.role !== "admin") return;
  
  const isOrig = me.isOriginalAdmin;
  const list = $("#coreList");
  
  if (!isOrig) {
    // Limited Core View for Admin Buyer
    list.innerHTML = `
      <div style="margin-bottom:20px;padding:12px;border:1px solid rgba(255,207,92,.3);background:rgba(255,171,31,.05)">
        <h4 style="margin:0 0 10px;font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--gold)">AKUN ADMIN TERBATAS</h4>
        <p style="font-size:11px;color:var(--muted);margin:0 0 10px">Anda hanya dapat mengubah status Anda sendiri dan tidak dapat mengakses fitur sistem inti secara penuh.</p>
        <div class="core-row">
          <div class="core-top">
            <div class="core-id"><b>${esc(me.name)}</b><span>${esc(me.uid)} · ${esc(me.email)}</span></div>
          </div>
          <div class="core-fields" style="grid-template-columns:1fr 1fr">
             <label><span>ROLE</span>
               <select id="selfRole">
                 <option value="admin" selected>admin (terbatas)</option>
                 <option value="member">member</option>
               </select>
             </label>
             <label class="toggle-switch" style="align-self:end;padding-bottom:7px">
               <input type="checkbox" id="selfIncog" ${me.incognito ? "checked" : ""}>
               <span class="slider"></span>
               <span class="toggle-label">MODE MENYAMAR</span>
             </label>
          </div>
        </div>
      </div>
    `;
    
    $("#selfRole").addEventListener("change", (e) => {
      const newRole = e.target.value;
      patchUser(me.id, { role: newRole, isOriginalAdmin: false });
      renderApp();
      toast(`Role berubah menjadi ${newRole}`, "ok");
      if (newRole === 'member') {
          $("#modalCore").classList.remove("open");
      }
    });
    
    $("#selfIncog").addEventListener("change", (e) => {
      patchUser(me.id, { incognito: e.target.checked });
      renderApp();
      toast(e.target.checked ? "Mode Menyamar: AKTIF" : "Mode Menyamar: NONAKTIF", "ok");
    });
    
    $("#coreReset").style.display = "none";
    $("#modalCore").classList.add("open");
    return;
  }

  // Full Core View for Original Admin
  list.innerHTML = `
    <div style="margin-bottom:20px;padding:12px;border:1px solid rgba(255,207,92,.3);background:rgba(255,171,31,.05)">
      <h4 style="margin:0 0 10px;font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--gold)">PENGATURAN GLOBAL</h4>
      <div style="display:flex;flex-direction:column;gap:12px">
        <label class="toggle-switch">
          <input type="checkbox" id="globalAdminIncog" ${me.incognito ? "checked" : ""}>
          <span class="slider"></span>
          <span class="toggle-label">MODE PENYAMARAN PROFIL ADMIN</span>
        </label>
        <label class="toggle-switch">
          <input type="checkbox" id="globalPrivacyToggle" ${localStorage.getItem(LS_GLOBAL_PRIV) === "true" ? "checked" : ""}>
          <span class="slider"></span>
          <span class="toggle-label">TAMPILKAN INFO LOGIN (SEMUA MEMBER)</span>
        </label>
      </div>
    </div>

    <div style="margin-bottom:20px;padding:12px;border:1px solid rgba(255,207,92,.3);background:rgba(255,171,31,.05)">
      <h4 style="margin:0 0 10px;font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--gold)">PESAN SEMENTARA</h4>
      <p style="font-size:11px;color:var(--muted);margin:0 0 10px">Pesan di Global Chat otomatis terhapus setelah waktu yang ditentukan.</p>
      <select id="coreDisappear" style="width:100%;padding:10px;background:rgba(6,11,20,.9);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);font-size:12px;outline:none">
        <option value="off">Mati</option>
        <option value="24h">24 Jam</option>
        <option value="7d">7 Hari</option>
        <option value="14d">14 Hari</option>
        <option value="30d">30 Hari</option>
        <option value="60d">60 Hari</option>
        <option value="90d">90 Hari</option>
      </select>
    </div>
  `;

  $("#globalAdminIncog").addEventListener("change", (e) => {
    patchUser(me.id, { incognito: e.target.checked });
    renderApp();
    toast(e.target.checked ? "Mode Penyamaran Admin: AKTIF" : "Mode Penyamaran Admin: NONAKTIF", "ok");
  });

  $("#globalPrivacyToggle").addEventListener("change", (e) => {
    const checked = e.target.checked;
    localStorage.setItem(LS_GLOBAL_PRIV, checked ? "true" : "false");
    toast(checked ? "Info Login Ditampilkan untuk Semua" : "Info Login Disembunyikan", "ok");
  });

  const sel = $("#coreDisappear");
  sel.value = localStorage.getItem(LS_DISAPPEAR) || "off";
  sel.addEventListener("change", () => {
    const val = sel.value;
    localStorage.setItem(LS_DISAPPEAR, val);
    
    const labels = { off: "Mati", "24h": "24 jam", "7d": "7 hari", "14d": "14 hari", "30d": "30 hari", "60d": "60 hari", "90d": "90 hari" };
    const msgs = store.chat();
    msgs.push({
      id: uid4(),
      role: "system",
      text: `Admin mengubah waktu pesan sementara menjadi ${labels[val]}.`,
      ts: Date.now()
    });
    store.saveChat(msgs);
    
    renderChat();
    toast("Pengaturan pesan sementara disimpan", "ok");
  });

  store.users().forEach(u => {
    const row = document.createElement("div");
    row.className = "core-row";
    row.innerHTML =
      `<div class="core-top">
         <div class="core-id"><b>${esc(u.name)}</b><span>${esc(u.uid)} · ${esc(u.email || u.provider)}</span></div>
         <button class="core-del" title="Hapus user">✕</button>
       </div>
       <div class="core-fields">
         <label><span>ROLE</span>
           <select data-f="role">
             <option value="member">member</option>
             <option value="partner">partner</option>
             <option value="admin">admin</option>
           </select>
         </label>
         <label><span>LEVEL</span>
           <input type="number" data-f="level" value="${u.level}">
         </label>
         <label><span>EXP</span>
           <input type="number" data-f="xp" value="${u.xp || 0}">
         </label>
         <label><span>UID</span>
           <input type="text" data-f="uid" value="${esc(u.uid)}" maxlength="12">
         </label>
       </div>
       <div class="core-fields" style="grid-template-columns:1fr">
         <label><span>KODE RAHASIA</span>
           <div class="core-secret">
             <input type="text" data-f="secret" value="${esc(u.secret || "")}" placeholder="(belum ada)" maxlength="16" style="text-transform:uppercase">
             <button type="button" class="core-gen">GEN</button>
           </div>
         </label>
       </div>
       <div class="core-fields" style="grid-template-columns:1fr; gap:10px; margin-top:6px;">
         <label class="toggle-switch">
           <input type="checkbox" data-f="premium" ${u.premium ? "checked" : ""}>
           <span class="slider"></span>
           <span class="toggle-label">PREMIUM</span>
         </label>
       </div>`;

    list.appendChild(row);
    row.querySelector('[data-f="role"]').value = u.role;

    row.querySelectorAll("[data-f]").forEach(el => {
      el.addEventListener("change", () => {
        const f = el.dataset.f;
        const patch = {};
        if (f === "premium") patch.premium = el.checked;
        else if (f === "level") patch.level = (parseInt(el.value, 10) || 0);
        else if (f === "xp") {
          patch.xp = (parseInt(el.value, 10) || 0);
        }
        else if (f === "role") {
            patch.role = el.value;
            if (el.value !== 'admin') patch.isOriginalAdmin = false;
        }
        else if (f === "secret") patch.secret = el.value.trim().toUpperCase();
        else patch[f] = el.value.trim();

        patchUser(u.id, patch);
        if (u.id === me.id) renderApp();
        renderChat();
        toast("Tersimpan: " + u.name, "ok");
      });
    });

    row.querySelector(".core-gen").addEventListener("click", () => {
      const code = randCode();
      const inp = row.querySelector('[data-f="secret"]');
      inp.value = code;
      patchUser(u.id, { secret: code });
      toast(`Kode untuk ${u.name}: ${code}`, "ok");
    });

    row.querySelector(".core-del").addEventListener("click", () => {
      if (u.id === me.id) { toast("Tidak bisa menghapus akun sendiri", "err"); return; }
      store.saveUsers(store.users().filter(x => x.id !== u.id));
      renderChat();
      openCore();
      toast("User dihapus", "ok");
    });
  });

  $("#modalCore").classList.add("open");
}

/* ============================================================
   AI WIDGET
   ============================================================ */
const AI_RULES = [
  [/halo|hai|hello|hi|hey/i, "Halo, Warden. Sistem siaga. Mau cek apa?"],
  [/premium|upgrade|beli|harga|bayar/i, "Premium berbayar dan hanya bisa diaktifkan Admin. Hubungi WhatsApp/Telegram di panel bantuan kanan bawah."],
  [/kode|secret|rahasia|code/i, "Kode Rahasia chat Global minta langsung ke Admin. Hubungi lewat panel 'Butuh bantuan!' di kanan bawah."],
  [/admin|core|inti/i, "Jalur admin ada di URL #admin. Kredensial demo tertera di halaman itu."],
  [/chat|cooldown|3 jam|kunci/i, "Chat Global terbuka jika Admin memberi Kode Rahasia. Tanpa kode, tunggu 3 jam atau upgrade Premium."],
  [/role|partner|akses/i, "Admin 100%, Partner 60%, Member 50%. Hanya Admin yang bisa mengubah role, level, dan UID."],
  [/tema|theme|sayap|wings/i, "Tema profil mengikuti role: God-Tier, Elite, atau Standar. Semua digambar CSS + SVG."],
  [/siapa|who|kamu/i, "Aku NEXUS AI — asisten lokal di dalam widget ini. Tidak ada backend."],
];
const AI_FALLBACK = [
  "Tercatat. Coba tanya soal premium, kode rahasia, role, atau cooldown chat.",
  "Aku belum punya jawaban spesifik. Coba kata kunci: premium / kode / role / admin.",
  "Signal lemah untuk pertanyaan itu. Coba kata kunci lain, Warden.",
];
function aiAnswer(text) {
  for (const [re, reply] of AI_RULES) if (re.test(text)) return reply;
  return AI_FALLBACK[Math.floor(Math.random() * AI_FALLBACK.length)];
}

function initAI() {
  const widget = $("#aiWidget");
  const ball = $("#aiBall");
  const panel = $("#aiPanel");
  const body = $("#aiBody");

  let pos = null;
  try { pos = JSON.parse(localStorage.getItem(LS_AI) || "null"); } catch { pos = null; }
  if (!pos || typeof pos.x !== "number") {
    pos = { x: 20, y: window.innerHeight - 160 };
  }

  const clampPos = p => ({
    x: Math.min(Math.max(8, p.x), window.innerWidth - 68),
    y: Math.min(Math.max(8, p.y), window.innerHeight - 68),
  });
  const apply = () => {
    const p = clampPos(pos);
    widget.style.left = p.x + "px";
    widget.style.top = p.y + "px";
    widget.style.right = "auto";
    widget.style.bottom = "auto";
    panel.classList.toggle("flip", p.y < 300);
  };
  apply();
  window.addEventListener("resize", apply);

  let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;

  ball.addEventListener("pointerdown", e => {
    e.preventDefault();
    ball.setPointerCapture(e.pointerId);
    dragging = true; moved = false;
    sx = e.clientX; sy = e.clientY;
    ox = widget.offsetLeft; oy = widget.offsetTop;
  });
  ball.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    if (!moved) return;
    pos = clampPos({ x: ox + dx, y: oy + dy });
    apply();
  });
  ball.addEventListener("pointerup", e => {
    if (!dragging) return;
    dragging = false;
    try { ball.releasePointerCapture(e.pointerId); } catch {}
    if (moved) {
      localStorage.setItem(LS_AI, JSON.stringify(pos));
    } else {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) setTimeout(() => $("#aiInput").focus(), 60);
    }
  });

  $("#aiClose").addEventListener("click", () => panel.classList.remove("open"));

  $("#aiForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("#aiInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    const me = document.createElement("div");
    me.className = "ai-msg me";
    me.textContent = text;
    body.appendChild(me);

    setTimeout(() => {
      const bot = document.createElement("div");
      bot.className = "ai-msg bot";
      bot.textContent = aiAnswer(text);
      body.appendChild(bot);
      body.scrollTop = body.scrollHeight;
    }, 260);

    body.scrollTop = body.scrollHeight;
  });
}

/* ============================================================
   HELP WIDGET
   ============================================================ */
function initHelp() {
  const trigger = $("#helpTrigger");
  const panel = $("#helpPanel");
  trigger.addEventListener("click", () => panel.classList.toggle("open"));
  document.addEventListener("click", e => {
    if (!panel.classList.contains("open")) return;
    if (panel.contains(e.target) || trigger.contains(e.target)) return;
    panel.classList.remove("open");
  });
}

/* ============================================================
   CHAT SWIPE / LOCK / INCOGNITO
   ============================================================ */
function initChatGestures() {
  const chatPanel = $("#chatPanel");
  const chatHeader = $("#chatHead");
  const app = $("#screenApp");

  let startX = 0, currentX = 0, isDragging = false;

  chatHeader.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    startX = e.clientX;
    currentX = startX;
    isDragging = true;
    chatPanel.style.transition = "none";
    chatHeader.setPointerCapture(e.pointerId);
  });

  chatHeader.addEventListener("pointermove", e => {
    if (!isDragging) return;
    currentX = e.clientX;
    const diff = currentX - startX;
    if (diff < 0) {
      chatPanel.style.transform = `translateX(${diff}px)`;
    }
  });

  chatHeader.addEventListener("pointerup", e => {
    if (!isDragging) return;
    isDragging = false;
    chatHeader.releasePointerCapture(e.pointerId);
    chatPanel.style.transition = "";
    chatPanel.style.transform = "";
    
    const diff = currentX - startX;
    if (diff < -80) {
      closeChat();
    }
  });

  function closeChat() {
    if (window.innerWidth > 1180) {
      app.classList.add("chat-closed");
    } else {
      app.classList.remove("chat-mobile-open");
    }
  }

  $("#chatCloseBtn").addEventListener("click", closeChat);
  $("#chatBackdrop").addEventListener("click", closeChat);
  
  window.addEventListener("resize", () => {
    if (!isDragging) {
      chatPanel.style.transform = "";
      chatPanel.style.transition = "";
    }
  });

  $("#btnLockChat").addEventListener("click", () => {
    const locked = !store.isLocked();
    store.setLock(locked);
    renderApp();
    toast(locked ? "Chat dikunci oleh Partner" : "Chat dibuka kembali", locked ? "err" : "ok");
  });

  $("#btnIncognito").addEventListener("click", () => {
    const u = currentUser();
    if (!u) return;
    patchUser(u.id, { incognito: !u.incognito });
    renderApp();
    toast(u.incognito ? "Mode Menyamar: NONAKTIF" : "Mode Menyamar: AKTIF", "ok");
  });
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
let promptResolve = null;
function askText(title, value) {
  return new Promise(resolve => {
    $("#promptTitle").textContent = title;
    $("#promptInput").value = value || "";
    $("#modalPrompt").classList.add("open");
    setTimeout(() => $("#promptInput").focus(), 60);
    promptResolve = resolve;
  });
}
function closePrompt(v) {
  $("#modalPrompt").classList.remove("open");
  if (promptResolve) { promptResolve(v); promptResolve = null; }
}

/* ============================================================
   REPLY & CONTEXT MENU LOGIC
   ============================================================ */
let activeReply = null;

function setReply(msg) {
  activeReply = msg;
  $("#replyName").textContent = msg.name;
  let rText = msg.deletedForAll ? "Pesan ini telah dihapus" : (msg.text || `[${msg.mediaType || 'Media'}]`);
  $("#replyText").textContent = rText;
  $("#replyPreview").style.display = "flex";
  $("#chatInput").focus();
}

function clearReply() {
  activeReply = null;
  $("#replyPreview").style.display = "none";
}

const ctxMenu = $("#msgContextMenu");
const ctxReply = $("#ctxReply");
const ctxDeleteMe = $("#ctxDeleteMe");
const ctxDeleteAll = $("#ctxDeleteAll");
let activeMenuMsg = null;

function showContextMenu(x, y, m) {
  const u = currentUser(); if (!u) return;
  activeMenuMsg = m;
  
  const menuW = 160;
  const menuH = 150;
  const posX = Math.min(x, window.innerWidth - menuW - 10);
  const posY = Math.min(y, window.innerHeight - menuH - 10);
  
  ctxMenu.style.left = posX + 'px';
  ctxMenu.style.top = posY + 'px';
  ctxMenu.classList.add('open');

  const isSelf = m.uid === u.id;
  const isDeleted = m.deletedForAll;

  ctxReply.style.display = isDeleted ? 'none' : 'block';
  ctxDeleteMe.style.display = 'block';
  ctxDeleteAll.style.display = (isSelf && !isDeleted) ? 'block' : 'none';
}

document.addEventListener('click', (e) => {
  if (!ctxMenu.contains(e.target) && !e.target.closest('.msg-bubble')) {
    ctxMenu.classList.remove('open');
  }
});

ctxReply.addEventListener('click', () => {
  if (activeMenuMsg) setReply(activeMenuMsg);
  ctxMenu.classList.remove('open');
});

ctxDeleteMe.addEventListener('click', () => {
  if (activeMenuMsg) deleteForMe(activeMenuMsg.id);
  ctxMenu.classList.remove('open');
});

ctxDeleteAll.addEventListener('click', () => {
  if (activeMenuMsg) deleteForAll(activeMenuMsg.id);
  ctxMenu.classList.remove('open');
});

function deleteForMe(msgId) {
  const u = currentUser(); if (!u) return;
  const msgs = store.chat();
  const msg = msgs.find(x => x.id === msgId);
  if (!msg) return;
  if (!msg.deletedFor) msg.deletedFor = [];
  if (!msg.deletedFor.includes(u.id)) msg.deletedFor.push(u.id);
  store.saveChat(msgs);
  renderChat();
}

function deleteForAll(msgId) {
  const u = currentUser(); if (!u) return;
  const msgs = store.chat();
  const msg = msgs.find(x => x.id === msgId);
  if (!msg) return;
  if (msg.uid !== u.id) return;
  msg.deletedForAll = true;
  msg.text = "";
  store.saveChat(msgs);
  renderChat();
}

/* ============================================================
   BINDINGS
   ============================================================ */
function bind() {
  let authTargetProvider = null;

  /* --- provider login --- */
  $$("#screenLogin .prov").forEach(btn => {
    btn.addEventListener("click", () => {
      authTargetProvider = btn.dataset.provider;
      $("#authChoiceTitle").textContent = `METODE ${authTargetProvider.toUpperCase()}`;
      $("#authChoiceDesc").textContent = "Pilih untuk mendaftar akun baru atau masuk ke akun yang sudah ada.";
      $("#modalAuthChoice").classList.add("open");
    });
  });

  $("#btnAuthCancel").addEventListener("click", () => {
    $("#modalAuthChoice").classList.remove("open");
    authTargetProvider = null;
  });

  $("#btnCreateNew").addEventListener("click", () => {
    $("#modalAuthChoice").classList.remove("open");
    if (!authTargetProvider) return;

    if (authTargetProvider === "Email") {
      $("#modalEmail").classList.add("open");
      setTimeout(() => $("#emailInput").focus(), 60);
    } else {
      const handle = `${authTargetProvider.replace(/[^A-Za-z]/g, "")}Warden`;
      const u = createUser({
        name: `${handle} #${randDigits(3)}`,
        email: `${authTargetProvider.toLowerCase()}-${uid4()}@nexus.local`,
        provider: authTargetProvider
      });
      login(u);
      $("#secretValue").textContent = u.secret;
      $("#modalSecret").classList.add("open");
    }
    authTargetProvider = null;
  });

  $("#btnLoginExisting").addEventListener("click", () => {
    $("#modalAuthChoice").classList.remove("open");
    $("#modalLoginExisting").classList.add("open");
    $("#loginExistingInput").value = "";
    setTimeout(() => $("#loginExistingInput").focus(), 60);
  });

  $("#loginExistingCancel").addEventListener("click", () => {
    $("#modalLoginExisting").classList.remove("open");
    authTargetProvider = null;
  });

  $("#loginExistingForm").addEventListener("submit", e => {
    e.preventDefault();
    const query = $("#loginExistingInput").value.trim().toLowerCase();
    if (!query) return;
    
    const users = store.users();
    const user = users.find(u => 
      (u.email && u.email.toLowerCase() === query) || 
      (u.name && u.name.toLowerCase() === query) || 
      (u.uid && u.uid.toLowerCase() === query)
    );
    
    if (user) {
      $("#modalLoginExisting").classList.remove("open");
      login(user);
      toast("Berhasil masuk", "ok");
    } else {
      toast("Akun tidak ditemukan. Periksa kembali Email/Username/UID.", "err");
    }
  });

  /* --- email form --- */
  $("#emailCancel").addEventListener("click", () => $("#modalEmail").classList.remove("open"));
  $("#emailForm").addEventListener("submit", e => {
    e.preventDefault();
    const email = $("#emailInput").value.trim();
    const name = $("#nameInput").value.trim();
    if (!email) return;
    const u = createUser({
      name: name || email.split("@")[0],
      email,
      provider: "Email"
    });
    $("#modalEmail").classList.remove("open");
    $("#emailInput").value = "";
    $("#nameInput").value = "";
    login(u);
  });

  $("#secretOk").addEventListener("click", () => $("#modalSecret").classList.remove("open"));
  $("#profileViewClose").addEventListener("click", () => $("#modalProfile").classList.remove("open"));
  $("#replyClose").addEventListener("click", clearReply);
  $("#mediaClose").addEventListener("click", () => closeMediaViewer(activeMedia));

  let activeMedia = null;
  const originalOpenMedia = openMediaViewer;
  window.openMediaViewer = function(m) {
    activeMedia = m;
    originalOpenMedia(m);
  };
  $("#mediaViewer").addEventListener("click", (e) => {
    if (e.target.id === "mediaViewer") closeMediaViewer(activeMedia);
  });

  /* --- admin login --- */
  $("#adminForm").addEventListener("submit", e => {
    e.preventDefault();
    const email = $("#adminEmail").value.trim();
    const pass = $("#adminPass").value;
    if (email !== ADMIN_EMAIL || pass !== ADMIN_PASS) {
      toast("Kredensial admin salah", "err");
      return;
    }
    
    let users = store.users();
    let admin = users.find(u => u.email === ADMIN_EMAIL);
    
    if (!admin) {
      admin = {
        id: "u_admin", name: "Aril Neverlow", email: ADMIN_EMAIL, provider: "System",
        role: "admin", isOriginalAdmin: true, level: 99, uid: "NX-0001", xp: 9940, premium: true, incognito: false,
        chatUnlocked: true, joinedAt: Date.now(), secret: "GODT-ADMN",
        avatar: "", banner: "", showProvider: false
      };
      users.push(admin);
      store.saveUsers(users);
    } else if (admin.role !== "admin") {
      admin.role = "admin";
      admin.isOriginalAdmin = true;
      patchUser(admin.id, { role: "admin", isOriginalAdmin: true });
    }
    
    $("#adminPass").value = "";
    login(admin);
    toast("Akses inti diberikan", "ok");
  });

  $("#adminBack").addEventListener("click", e => {
    e.preventDefault();
    history.replaceState(null, "", location.pathname);
    route();
  });

  /* --- sidebar --- */
  $("#btnLogout").addEventListener("click", logout);

  $$(".side-btn[data-nav]").forEach(b => {
    b.addEventListener("click", () => {
      $$(".side-btn[data-nav]").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      const nav = b.dataset.nav;
      if (nav === "chat") {
        const app = $("#screenApp");
        if (window.innerWidth > 1180) {
          app.classList.toggle("chat-closed");
        } else {
          app.classList.toggle("chat-mobile-open");
        }
      } else if (nav === "settings") {
        $("#modalSettings").classList.add("open");
      } else if (nav === "download") {
        toast("Folder unduhan kosong — demo build");
      } else {
        $(".profile-main").scrollTo({ top: 0, behavior: "smooth" });
        if (nav === "portfolio") toast("Kembali ke profil");
      }
    });
  });

  /* --- edit nama / avatar / banner --- */
  $("#btnName").addEventListener("click", async () => {
    const u = currentUser(); if (!u) return;
    const v = await askText("UBAH NAMA TAMPILAN", u.name);
    if (v === null) return;
    const name = String(v).trim().slice(0, 24);
    if (!name) { toast("Nama tidak boleh kosong", "err"); return; }
    patchUser(u.id, { name });
    renderApp();
    renderChat();
    toast("Nama diperbarui", "ok");
  });

  const pickImage = (maxW, maxH, field) => {
    const input = field === "avatar" ? $("#fileAvatar") : $("#fileBanner");
    input.value = "";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const data = await fileToDataURL(file, maxW, maxH, field === "avatar" ? 0.85 : 0.78);
        const u = currentUser(); if (!u) return;
        patchUser(u.id, { [field]: data });
        renderApp();
        toast((field === "avatar" ? "Foto profil" : "Banner") + " diperbarui", "ok");
      } catch {
        toast("Gagal memuat gambar", "err");
      }
    };
    input.click();
  };

  $("#btnAvatar").addEventListener("click", () => pickImage(320, 320, "avatar"));
  $("#btnBanner").addEventListener("click", () => pickImage(1280, 480, "banner"));

  /* --- premium --- */
  $("#btnPremium").addEventListener("click", () => {
    const u = currentUser(); if (!u) return;
    if (u.premium || u.role === "admin") return;
    openPremiumModal();
  });

  /* --- menu card --- */
  $$(".menu-links button").forEach(b => {
    b.addEventListener("click", () => {
      const m = b.dataset.menu;
      if (m === "discord") {
        window.open("https://discord.com", "_blank", "noopener");
      } else if (m === "download") {
        toast("Folder unduhan kosong — demo build");
      } else {
        $("#modalSettings").classList.add("open");
      }
    });
  });

  /* --- settings modal --- */
  $("#settingsClose").addEventListener("click", () => $("#modalSettings").classList.remove("open"));
  $$("#modalSettings [data-set]").forEach(b => {
    b.addEventListener("click", () => {
      const action = b.dataset.set;
      const u = currentUser(); if (!u) return;

      if (action === "name") {
        $("#modalSettings").classList.remove("open");
        $("#btnName").click();
      } else if (action === "avatar") {
        pickImage(320, 320, "avatar");
      } else if (action === "banner") {
        pickImage(1280, 480, "banner");
      } else if (action === "privacy") {
        patchUser(u.id, { showProvider: !u.showProvider });
        renderApp();
        toast("Privasi diperbarui", "ok");
      } else if (action === "secret") {
        $("#modalSettings").classList.remove("open");
        if (u.secret) showSecretModal(u);
        else showNoSecretModal();
      } else if (action === "core") {
        $("#modalSettings").classList.remove("open");
        openCore();
      } else if (action === "logout") {
        $("#modalSettings").classList.remove("open");
        logout();
      }
    });
  });

  /* --- chat gate secret --- */
  $("#secretBtn").addEventListener("click", () => {
    const u = currentUser(); if (!u) return;
    const val = $("#secretInput").value.trim().toUpperCase();
    if (!val) return;
    if (!u.secret) { toast("Belum ada kode — minta ke Admin", "err"); return; }
    if (val === String(u.secret).toUpperCase()) {
      patchUser(u.id, { chatUnlocked: true });
      $("#secretInput").value = "";
      renderApp();
      toast("Kode diterima — chat terbuka", "ok");
    } else {
      toast("Kode rahasia salah", "err");
    }
  });

  /* --- chat form & dynamic input --- */
  const chatInput = $("#chatInput");
  const btnSend = $("#btnSend");
  const btnMic = $("#btnMic");
  const waActionsEmpty = $("#waActionsEmpty");
  const waActionsTyping = $("#waActionsTyping");

  chatInput.addEventListener("input", () => {
    const hasText = chatInput.value.trim().length > 0;
    if (hasText) {
      btnMic.style.display = "none";
      waActionsEmpty.style.display = "none";
      waActionsTyping.style.display = "flex";
      btnSend.style.display = "grid";
    } else {
      btnMic.style.display = "grid";
      waActionsEmpty.style.display = "flex";
      waActionsTyping.style.display = "none";
      btnSend.style.display = "none";
    }
  });

  $("#chatForm").addEventListener("submit", e => {
    e.preventDefault();
    const u = currentUser(); if (!u) return;

    const gate = canChat(u);
    if (!gate.ok) { toast("Chat masih terkunci", "err"); return; }

    const text = chatInput.value.trim().slice(0, 400);
    if (!text) return;

    const isIncognito = u.role === "admin" && u.incognito;

    const msgs = store.chat();
    const newMsg = {
      id: uid4(),
      uid: u.id,
      name: u.name,
      role: isIncognito ? "member" : u.role,
      text,
      ts: Date.now(),
      deletedFor: [],
      deletedForAll: false
    };

    if (activeReply) {
      newMsg.replyTo = activeReply.id;
      newMsg.replyName = activeReply.name;
      newMsg.replyText = activeReply.deletedForAll ? "Pesan ini telah dihapus" : (activeReply.text || `[${activeReply.mediaType || 'Media'}]`);
    }

    msgs.push(newMsg);
    store.saveChat(msgs);
    chatInput.value = "";
    chatInput.dispatchEvent(new Event('input'));
    clearReply();

    addXP(u, 5);
    renderApp();
  });

  /* --- core modal --- */
  $("#coreClose").addEventListener("click", () => $("#modalCore").classList.remove("open"));
  $("#coreReset").addEventListener("click", () => {
    if (!currentUser().isOriginalAdmin) return;
    localStorage.removeItem(LS_USERS);
    localStorage.removeItem(LS_CHAT);
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_AI);
    localStorage.removeItem(LS_LOCK);
    localStorage.removeItem(LS_DISAPPEAR);
    localStorage.removeItem(LS_GLOBAL_PRIV);
    location.reload();
  });

  /* --- prompt modal --- */
  $("#promptOk").addEventListener("click", () => closePrompt($("#promptInput").value));
  $("#promptCancel").addEventListener("click", () => closePrompt(null));
  $("#promptInput").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); closePrompt($("#promptInput").value); }
    if (e.key === "Escape") { e.preventDefault(); closePrompt(null); }
  });

  /* --- backdrop close --- */
  $$(".modal-backdrop").forEach(bd => {
    bd.addEventListener("click", e => {
      if (e.target === bd && bd.id !== "modalPrompt") bd.classList.remove("open");
    });
  });

  /* --- storage sync --- */
  window.addEventListener("storage", e => {
    if (e.key === LS_CHAT || e.key === LS_LOCK || e.key === LS_GLOBAL_PRIV) renderChat();
    if (e.key === LS_USERS) { if (currentUser()) renderApp(); }
  });

  /* --- hash --- */
  window.addEventListener("hashchange", route);
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  seed();
  bind();
  initAI();
  initHelp();
  initChatGestures();
  initMediaHandlers();
  route();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

})();