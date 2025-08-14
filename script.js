// ====== Creator Carousel (no dependencies) ======

const dataEl = document.getElementById("creatorData");
const creators = JSON.parse(dataEl.textContent.trim());
const stage = document.getElementById("carouselStage");
const dotsWrap = document.getElementById("carouselDots");
const prevBtn = document.querySelector(".nav.prev");
const nextBtn = document.querySelector(".nav.next");

let index = 0;
let timer = null;
let paused = false;

// Build cards from data
const cards = creators.map((c, i) => createCard(c, i));
cards.forEach(c => stage.appendChild(c));

// Build dots
creators.forEach((_, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("role", "tab");
  b.setAttribute("aria-label", `Go to slide ${i + 1}`);
  b.addEventListener("click", () => goTo(i));
  dotsWrap.appendChild(b);
});

function createCard({ name, twitch, avatar }, i) {
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

  if (avatar) {
    const img = document.createElement("img");
    img.alt = `${name} avatar`;
    img.loading = "lazy";
    img.src = avatar;
    frame.appendChild(img);
  } else {
    // Monogram if no image
    const mono = document.createElement("div");
    mono.className = "monogram";
    const span = document.createElement("span");
    span.textContent = initials(name);
    mono.appendChild(span);
    frame.appendChild(mono);
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

  // When non-center card is clicked, focus it first instead of leaving the page
  a.addEventListener("click", (e) => {
    if (i !== index) {
      e.preventDefault();
      goTo(i);
    }
  });

  // Keyboard support: left/right to navigate
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

// Position cards with a coverflow look
function render() {
  const len = creators.length;

  // order: center, two left, two right
  const order = [index - 2, index - 1, index, index + 1, index + 2]
    .map(n => (n % len + len) % len);

  // base transforms by offset
  const depths = {
    "-2": { x: -220, rot: -8, scale: 0.72, z: -140, blur: 2, op: .75, idx: 1 },
    "-1": { x: -120, rot: -5, scale: 0.86, z:  -70, blur: 1, op: .9,  idx: 2 },
    "0" : { x:    0, rot:  0, scale: 1.00, z:    0, blur: 0, op: 1,   idx: 3 },
    "1" : { x:  120, rot:  5, scale: 0.86, z:  -70, blur: 1, op: .9,  idx: 2 },
    "2" : { x:  220, rot:  8, scale: 0.72, z: -140, blur: 2, op: .75, idx: 1 }
  };

  // reset classes
  cards.forEach(c => {
    c.classList.remove("center", "blur-1", "blur-2");
    c.querySelector(".hint").style.visibility = "visible";
  });

  // apply transforms
  order.forEach((id, layerIdx) => {
    const offset = layerIdx - 2; // -2..2
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
      card.querySelector(".hint").style.visibility = "hidden";
    }
  });

  // dots
  [...dotsWrap.children].forEach((d, i) => {
    d.setAttribute("aria-selected", i === index ? "true" : "false");
  });
}

function prev(){ index = (index - 1 + creators.length) % creators.length; render(); }
function next(){ index = (index + 1) % creators.length; render(); }
function goTo(i){ index = (i % creators.length + creators.length) % creators.length; render(); }

// Auto-advance
function startAuto(){
  stopAuto();
  timer = setInterval(next, 6000);
}
function stopAuto(){
  if (timer) clearInterval(timer);
  timer = null;
}

// Controls
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

// Pause on hover/focus
stage.addEventListener("mouseenter", () => { paused = true; stopAuto(); });
stage.addEventListener("mouseleave", () => { paused = false; startAuto(); });
stage.addEventListener("focusin", () => { paused = true; stopAuto(); });
stage.addEventListener("focusout", () => { if (!paused) startAuto(); });

// Kick off
render();
startAuto();
