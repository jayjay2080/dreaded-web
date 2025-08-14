// ====== Creator Carousel (no dependencies) ======
const stage = document.getElementById("carouselStage");
const dotsWrap = document.getElementById("carouselDots");
const prevBtn = document.querySelector(".nav.prev");
const nextBtn = document.querySelector(".nav.next");

// Get creators from the HTML <script id="creatorData" type="application/json">
let creators = [];
try {
  const creatorsEl = document.getElementById("creatorData");
  if (creatorsEl) {
    creators = JSON.parse(creatorsEl.textContent.trim());
  }
} catch (err) {
  console.warn("No creator data or invalid JSON", err);
}

let index = 0;
let timer = null;
let paused = false;

/* ========== SIDEBAR MENU ========== */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const openBtn = document.querySelector(".menu-btn");
const closeBtn = document.getElementById("closeSidebar");
const menuList = document.getElementById("menuList");
let pagesData = [];
try {
  pagesData = JSON.parse(document.getElementById("sitePages").textContent.trim());
} catch (err) {
  console.warn("No site pages data or invalid JSON", err);
}
const currentPage = (document.body.getAttribute("data-page") || "").toLowerCase();

function buildMenu() {
  if (!menuList) return;
  menuList.innerHTML = "";
  pagesData.forEach(p => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = p.href;
    a.textContent = p.title;
    if (p.external) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const ext = document.createElement("span");
      ext.className = "ext";
      ext.textContent = "↗";
      a.append(ext);
    }
    if (p.title.toLowerCase() === currentPage) {
      a.setAttribute("aria-current", "page");
    }
    li.appendChild(a);
    menuList.appendChild(li);
  });
}
buildMenu();

let lastFocus = null;
function openSidebar() {
  if (!sidebar) return;
  if (sidebar.classList.contains("open")) return;
  lastFocus = document.activeElement;
  document.body.classList.add("sidebar-open");
  sidebar.classList.add("open");
  sidebar.setAttribute("aria-hidden", "false");
  if (overlay) overlay.hidden = false;
  if (openBtn) openBtn.setAttribute("aria-expanded", "true");
  const firstLink = menuList ? menuList.querySelector("a") : null;
  (firstLink || closeBtn || openBtn)?.focus();
}
function closeSidebar() {
  if (!sidebar) return;
  if (!sidebar.classList.contains("open")) return;
  document.body.classList.remove("sidebar-open");
  sidebar.classList.remove("open");
  sidebar.setAttribute("aria-hidden", "true");
  if (overlay) overlay.hidden = true;
  if (openBtn) openBtn.setAttribute("aria-expanded", "false");
  (lastFocus || openBtn)?.focus();
}
if (openBtn) openBtn.addEventListener("click", openSidebar);
if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
if (overlay) overlay.addEventListener("click", closeSidebar);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
    e.preventDefault();
    closeSidebar();
  }
});
if (sidebar) {
  sidebar.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const foci = sidebar.querySelectorAll("a,button,[tabindex]:not([tabindex='-1'])");
    const list = Array.from(foci).filter(el => !el.hasAttribute("disabled"));
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

/* ========== TWITCH API HELPERS ========== */
const TWITCH_CLIENT_ID = "kepxt7g525qaqik9hjmujft89nr68v";
const TWITCH_APP_TOKEN = "rbunfutslxt5u9aqnhr8iaqf2624mj";

function twitchHiRes(url) {
  const m = url && url.match(/(.*-profile_image-)(\d+)x\2(\.(?:png|jpe?g|webp))/i);
  if (!m) return { src: url, srcset: "" };
  const base = m[1], ext = m[3];
  return {
    src: `${base}300x300${ext}`,
    srcset: `${base}300x300${ext} 1x, ${base}600x600${ext} 2x`
  };
}
async function fetchTwitchAvatars(usernames) {
  if (!TWITCH_CLIENT_ID || !TWITCH_APP_TOKEN) return {};
  const url = `https://api.twitch.tv/helix/users?` + usernames.map(u => `login=${encodeURIComponent(u)}`).join("&");
  const res = await fetch(url, {
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${TWITCH_APP_TOKEN}`
    }
  });
  if (!res.ok) return {};
  const payload = await res.json();
  const map = {};
  (payload.data || []).forEach(user => {
    map[user.login.toLowerCase()] = user.profile_image_url;
  });
  return map;
}
async function fetchLiveUsers(usernames) {
  if (!TWITCH_CLIENT_ID || !TWITCH_APP_TOKEN) return new Set();
  const url = `https://api.twitch.tv/helix/streams?` + usernames.map(u => `user_login=${encodeURIComponent(u)}`).join("&");
  const res = await fetch(url, {
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${TWITCH_APP_TOKEN}`
    }
  });
  if (!res.ok) return new Set();
  const payload = await res.json();
  return new Set((payload.data || []).map(s => (s.user_login || "").toLowerCase()));
}

/* ========== CAROUSEL (only run if elements exist) ========== */
let cards = [];
if (stage && dotsWrap && prevBtn && nextBtn && creators.length) {
  async function initCarousel() {
    const logins = creators.map(c => (c.twitch || c.name || "").toLowerCase());
    const [avatarMap, liveSet] = await Promise.all([
      fetchTwitchAvatars(logins),
      fetchLiveUsers(logins)
    ]);
    stage.innerHTML = "";
    dotsWrap.innerHTML = "";
    cards = creators.map((c, i) => createCardWithTwitch(c, i, avatarMap, liveSet));
    cards.forEach(c => stage.appendChild(c));
    creators.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", `Go to slide ${i + 1}`);
      b.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(b);
    });
    render();
    startAuto();
  }
  function createCardWithTwitch({ name, twitch, avatar }, i, avatarMap, liveSet) {
    const login = (twitch || name || "").toLowerCase();
    const a = document.createElement("a");
    a.className = "card";
    a.href = `https://twitch.tv/${twitch || name}`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.setAttribute("role", "group");
    a.setAttribute("aria-roledescription", "slide");
    a.setAttribute("aria-label", `${name} – twitch.tv/${twitch || name}`);
    a.tabIndex = 0;
    const frame = document.createElement("div");
    frame.className = "frame";
    const twitchAvatar = avatarMap[login];
    if (twitchAvatar) {
      const img = document.createElement("img");
      img.alt = `${name} avatar`;
      img.loading = "lazy";
      const hi = twitchHiRes(twitchAvatar);
      img.src = hi.src;
      if (hi.srcset) img.srcset = hi.srcset;
      img.sizes = "(max-width: 700px) 90vw, 280px";
      frame.appendChild(img);
    } else if (avatar) {
      const img = document.createElement("img");
      img.alt = `${name} avatar`;
      img.loading = "lazy";
      img.src = avatar;
      frame.appendChild(img);
    } else {
      const mono = document.createElement("div");
      mono.className = "monogram";
      const span = document.createElement("span");
      span.textContent = initials(name);
      mono.appendChild(span);
      frame.appendChild(mono);
    }
    if (liveSet.has(login)) {
      const badge = document.createElement("div");
      badge.className = "live-badge";
      badge.textContent = "LIVE";
      a.classList.add("live");
      a.appendChild(badge);
    }
    const meta = document.createElement("div");
    meta.className = "meta";
    const nm = document.createElement("div");
    nm.className = "name";
    nm.textContent = name;
    const url = document.createElement("div");
    url.className = "url";
    url.textContent = `twitch.tv/${twitch || name}`;
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "(click to focus)";
    meta.append(nm, url, hint);
    a.append(frame, meta);
    a.addEventListener("click", (e) => {
      if (i !== index) {
        e.preventDefault();
        goTo(i);
      }
    });
    a.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    });
    return a;
  }
  function initials(name) {
    return name.split(" ").map(s => s[0] ? s[0].toUpperCase() : "").slice(0, 2).join("");
  }
  function render() {
    const len = creators.length;
    const order = [index - 2, index - 1, index, index + 1, index + 2]
      .map(n => (n % len + len) % len);
    const depths = {
      "-2": { x: -220, rot: -8, scale: 0.72, z: -140, blur: 2, op: .75, idx: 1 },
      "-1": { x: -120, rot: -5, scale: 0.86, z: -70, blur: 1, op: .9, idx: 2 },
      "0" : { x: 0, rot: 0, scale: 1.00, z: 0, blur: 0, op: 1, idx: 3 },
      "1" : { x: 120, rot: 5, scale: 0.86, z: -70, blur: 1, op: .9, idx: 2 },
      "2" : { x: 220, rot: 8, scale: 0.72, z: -140, blur: 2, op: .75, idx: 1 }
    };
    cards.forEach(c => {
      c.classList.remove("center", "blur-1", "blur-2");
      const hintEl = c.querySelector(".hint");
      if (hintEl) hintEl.style.visibility = "visible";
    });
    order.forEach((id, layerIdx) => {
      const offset = layerIdx - 2;
      const cfg = depths[offset.toString()];
      const card = cards[id];
      card.style.transition = "transform .45s cubic-bezier(.22,.72,.22,1), opacity .3s ease, filter .2s ease";
      card.style.transform = `translate(-50%, -50%) translateX(${cfg.x}px) rotateY(${cfg.rot}deg) scale(${cfg.scale})`;
      card.style.zIndex = cfg.idx;
      card.style.opacity = cfg.op;
      if (cfg.blur === 1) card.classList.add("blur-1");
      if (cfg.blur === 2) card.classList.add("blur-2");
      if (offset === 0) {
        card.classList.add("center");
        const hintEl = card.querySelector(".hint");
        if (hintEl) hintEl.style.visibility = "hidden";
      }
    });
    [...dotsWrap.children].forEach((d, i) => {
      d.setAttribute("aria-selected", i === index ? "true" : "false");
    });
  }
  function prev() { index = (index - 1 + creators.length) % creators.length; render(); }
  function next() { index = (index + 1) % creators.length; render(); }
  function goTo(i) { index = (i % creators.length + creators.length) % creators.length; render(); }
  function startAuto() { stopAuto(); timer = setInterval(next, 6000); }
  function stopAuto() { if (timer) clearInterval(timer); timer = null; }
  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  stage.addEventListener("mouseenter", () => { paused = true; stopAuto(); });
  stage.addEventListener("mouseleave", () => { paused = false; startAuto(); });
  stage.addEventListener("focusin", () => { paused = true; stopAuto(); });
  stage.addEventListener("focusout", () => { if (!paused) startAuto(); });
  initCarousel();
}

