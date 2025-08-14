// ====== Creator Carousel (no dependencies) ======

const stage = document.getElementById("carouselStage");
const dotsWrap = document.getElementById("carouselDots");
const prevBtn = document.querySelector(".nav.prev");
const nextBtn = document.querySelector(".nav.next");

// Get creators from the HTML <script id="creatorData" type="application/json">
const creators = JSON.parse(document.getElementById("creatorData").textContent.trim());

let index = 0;
let timer = null;
let paused = false;

/* ========== SIDEBAR MENU ========== */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const openBtn = document.querySelector(".menu-btn");
const closeBtn = document.getElementById("closeSidebar");
const menuList = document.getElementById("menuList");
const pagesData = JSON.parse(document.getElementById("sitePages").textContent.trim());
const currentPage = (document.body.getAttribute("data-page") || "").toLowerCase();

function buildMenu(){
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

// Open/close helpers with focus management
let lastFocus = null;
function openSidebar(){
  if (sidebar.classList.contains("open")) return;
  lastFocus = document.activeElement;
  document.body.classList.add("sidebar-open");
  sidebar.classList.add("open");
  sidebar.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  openBtn.setAttribute("aria-expanded", "true");
  const firstLink = menuList.querySelector("a");
  (firstLink || closeBtn).focus();
}
function closeSidebar(){
  if (!sidebar.classList.contains("open")) return;
  document.body.classList.remove("sidebar-open");
  sidebar.classList.remove("open");
  sidebar.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  openBtn.setAttribute("aria-expanded", "false");
  (lastFocus || openBtn).focus();
}
openBtn.addEventListener("click", openSidebar);
closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar.classList.contains("open")) {
    e.preventDefault(); closeSidebar();
  }
});
// Simple focus trap
sidebar.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const foci = sidebar.querySelectorAll("a,button,[tabindex]:not([tabindex='-1'])");
  const list = Array.from(foci).filter(el => !el.hasAttribute("disabled"));
  if (!list.length) return;
  const first = list[0], last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ========== TWITCH API HELPERS ========== */
/** IMPORTANT: Fill these in */
const TWITCH_CLIENT_ID = "kepxt7g525qaqik9hjmujft89nr68v";
const TWITCH_APP_TOKEN = "rbunfutslxt5u9aqnhr8iaqf2624mj";

/** Upgrade Twitch avatar URL to sharp sizes (300/600) if it matches Twitch's pattern */
function twitchHiRes(url) {
  const m = url && url.match(/(.*-profile_image-)(\d+)x\2(\.(?:png|jpe?g|webp))/i);
  if (!m) return { src: url, srcset: "" };
  const base = m[1], ext = m[3];
  return {
    src:    `${base}300x300${ext}`,
    srcset: `${base}300x300${ext} 1x, ${base}600x600${ext} 2x`
  };
}

/** Fetch Twitch user profiles to get profile_image_url */
async function fetchTwitchAvatars(usernames) {
  if (!TWITCH_CLIENT_ID || !TWITCH_APP_TOKEN) {
    console.warn("Missing TWITCH_CLIENT_ID / TWITCH_APP_TOKEN. Skipping Twitch avatar fetch.");
    return {};
  }
  // Twitch allows multiple logins in one call: ?login=a&login=b...
  const url = `https://api.twitch.tv/helix/users?` + usernames.map(u => `login=${encodeURIComponent(u)}`).join("&");
  const res = await fetch(url, {
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${TWITCH_APP_TOKEN}`
    }
  });
  if (!res.ok) {
    console.warn("Twitch users fetch failed:", res.status, await res.text());
    return {};
  }
  const payload = await res.json();
  const map = {};
  (payload.data || []).forEach(user => {
    map[user.login.toLowerCase()] = user.profile_image_url;
  });
  return map;
}

/** Fetch live status for logins */
async function fetchLiveUsers(usernames) {
  if (!TWITCH_CLIENT_ID || !TWITCH_APP_TOKEN) {
    console.warn("Missing TWITCH_CLIENT_ID / TWITCH_APP_TOKEN. Skipping live status fetch.");
    return new Set();
  }
  // Twitch: /helix/streams?user_login=a&user_login=b...
  const url = `https://api.twitch.tv/helix/streams?` + usernames.map(u => `user_login=${encodeURIComponent(u)}`).join("&");
  const res = await fetch(url, {
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${TWITCH_APP_TOKEN}`
    }
  });
  if (!res.ok) {
    console.warn("Twitch streams fetch failed:", res.status, await res.text());
    return new Set();
  }
  const payload = await res.json();
  const lives = new Set((payload.data || []).map(s => (s.user_login || "").toLowerCase()));
  return lives;
}

/* ========== BUILD CARDS (with Twitch avatars + LIVE badge) ========== */
let cards = [];

async function initCarousel() {
  // Who are we querying on Twitch?
  const logins = creators.map(c => (c.twitch || c.name || "").toLowerCase());

  // Get avatars + live status in parallel
  const [avatarMap, liveSet] = await Promise.all([
    fetchTwitchAvatars(logins),
    fetchLiveUsers(logins)
  ]);

  // Clear stage & dots and rebuild
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

  // Prefer Twitch avatar; fallback to provided avatar; fallback to monogram
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

  // LIVE badge + highlight
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

  // Non-center click focuses first
  a.addEventListener("click", (e) => {
    if (i !== index) {
      e.preventDefault();
      goTo(i);
    }
  });
  // Keyboard nav
  a.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  });

  return a;
}

function initials(name) {
  return name
    .split(" ")
    .map(s => s[0] ? s[0].toUpperCase() : "")
    .slice(0, 2)
    .join("");
}

/* ========== RENDER & CONTROLS ========== */
function render() {
  const len = creators.length;
  const order = [index - 2, index - 1, index, index + 1, index + 2]
    .map(n => (n % len + len) % len);

  const depths = {
    "-2": { x: -220, rot: -8, scale: 0.72, z: -140, blur: 2, op: .75, idx: 1 },
    "-1": { x: -120, rot: -5, scale: 0.86, z:  -70, blur: 1, op: .9,  idx: 2 },
    "0" : { x:    0, rot:  0, scale: 1.00, z:    0, blur: 0, op: 1,   idx: 3 },
    "1" : { x:  120, rot:  5, scale: 0.86, z:  -70, blur: 1, op: .9,  idx: 2 },
    "2" : { x:  220, rot:  8, scale: 0.72, z: -140, blur: 2, op: .75, idx: 1 }
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

function prev(){ index = (index - 1 + creators.length) % creators.length; render(); }
function next(){ index = (index + 1) % creators.length; render(); }
function goTo(i){ index = (i % creators.length + creators.length) % creators.length; render(); }

function startAuto(){
  stopAuto();
  timer = setInterval(next, 6000);
}
function stopAuto(){
  if (timer) clearInterval(timer);
  timer = null;
}

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

stage.addEventListener("mouseenter", () => { paused = true; stopAuto(); });
stage.addEventListener("mouseleave", () => { paused = false; startAuto(); });
stage.addEventListener("focusin", () => { paused = true; stopAuto(); });
stage.addEventListener("focusout", () => { if (!paused) startAuto(); });

/* ========== STARTUP ========== */
initCarousel();

/* ========== UPDATES PAGE LOADER (JSON → HTML) ========== */
(async function loadUpdatesIfPresent() {
  const list = document.getElementById("updatesList");
  if (!list) return;

  const loadingEl = document.getElementById("updatesLoading");
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

  try {
    // Build a safe absolute URL and add a cache-busting query
    const updatesUrl = new URL("updates.json", location.href).toString() + `?v=${Date.now()}`;
    const res = await fetch(updatesUrl, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Failed to fetch updates.json (${res.status} ${res.statusText}) at ${res.url}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("updates.json is not valid JSON. Check for trailing commas or smart quotes.");
    }

    if (!Array.isArray(data)) {
      throw new Error("updates.json should be a JSON array (e.g., [ { ... }, { ... } ]).");
    }

    // Sort newest first
    data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Render
    list.innerHTML = "";
    data.forEach(entry => {
      const art = document.createElement("article");
      art.className = "update";

      const title = entry.title || "Update";
      const dateStr = entry.date ? fmt.format(new Date(entry.date)) : "";

      const h3 = document.createElement("h3");
      h3.textContent = title;

      const date = document.createElement("div");
      date.className = "date";
      date.textContent = dateStr;

      art.append(h3, date);

      const groups = [
        ["added",   "Added",   "added"],
        ["changed", "Changed", "changed"],
        ["fixed",   "Fixed",   "fixed"],
        ["removed", "Removed", "removed"]
      ];

      let renderedAnyGroup = false;

      groups.forEach(([key, label, cls]) => {
        const items = entry[key];
        if (Array.isArray(items) && items.length) {
          renderedAnyGroup = true;

          const gt = document.createElement("div");
          gt.className = "group-title";
          const badge = document.createElement("span");
          badge.className = `badge ${cls}`;
          badge.textContent = label;
          gt.appendChild(badge);
          art.appendChild(gt);

          const ul = document.createElement("ul");
          items.forEach(t => {
            const li = document.createElement("li");
            li.textContent = t;
            ul.appendChild(li);
          });
          art.appendChild(ul);
        }
      });

      if (!renderedAnyGroup && Array.isArray(entry.changes)) {
        const ul = document.createElement("ul");
        entry.changes.forEach(t => {
          const li = document.createElement("li");
          li.textContent = t;
          ul.appendChild(li);
        });
        art.appendChild(ul);
      }

      list.appendChild(art);
    });

    // If the JSON was empty
    if (!list.children.length) {
      list.innerHTML = `<div class="updates-error" role="status">No updates yet. Check back soon!</div>`;
    }

  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="updates-error" role="alert">${String(err.message || err)}</div>`;
  } finally {
    if (loadingEl) loadingEl.remove();
  }
})();
