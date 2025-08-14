// ====== Creator Carousel (no dependencies) ======

const dataEl = document.getElementById("creatorData");
const stage = document.getElementById("carouselStage");
const dotsWrap = document.getElementById("carouselDots");
const prevBtn = document.querySelector(".nav.prev");
const nextBtn = document.querySelector(".nav.next");

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
    // mark current page
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
  // focus first link
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
  // restore focus
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

/* ========== TWITCH API LIVE STATUS ========== */
async function getLiveStatus(usernames) {
  const clientId = "kepxt7g525qaqik9hjmujft89nr68v";
  const token = "rbunfutslxt5u9aqnhr8iaqf2624mj";

  if (!clientId || !token) {
    console.warn("Twitch Client ID and Access Token are required to check live status.");
    return [];
  }

  const url = `https://api.twitch.tv/helix/streams?` + usernames.map(u => `user_login=${u}`).join('&');

  const res = await fetch(url, {
    headers: {
      "Client-ID": clientId,
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await res.json();
  return data.data.map(stream => stream.user_login.toLowerCase());
}

/* ========== CREATOR LIST ========== */
const creators = [
  { name: "DJUShorts", twitch: "djushorts", image: "images/profiles/djushorts.png" },
  { name: "MarioGuy34", twitch: "marioguy34", image: "images/profiles/marioguy34.png" },
  { name: "JayJay2080", twitch: "jayjay2080", image: "images/profiles/jayjay2080.png" }
];

/* ========== BUILD CARDS ========== */
let cards = [];

async function initCarousel() {
  const liveUsers = await getLiveStatus(creators.map(c => c.twitch));
  stage.innerHTML = '';
  cards = creators.map((c, i) => createCardWithLive(c, i, liveUsers));
  cards.forEach(c => stage.appendChild(c));

  // Dots
  dotsWrap.innerHTML = '';
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

function createCardWithLive({ name, twitch, image }, i, liveUsers) {
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

  if (image) {
    const img = document.createElement("img");
    img.alt = `${name} avatar`;
    img.loading = "lazy";
    img.src = image;
    frame.appendChild(img);
  } else {
    const mono = document.createElement("div");
    mono.className = "monogram";
    const span = document.createElement("span");
    span.textContent = initials(name);
    mono.appendChild(span);
    frame.appendChild(mono);
  }

  if (liveUsers.includes(twitch.toLowerCase())) {
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
