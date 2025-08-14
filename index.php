<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dreaded Dragons – Home</title>
  <link rel="stylesheet" href="styles.css" />
</head>

<!-- Mark the current page here -->
<body data-page="Home">
  <header class="site-header">
    <button class="menu-btn" aria-label="Open menu" aria-haspopup="dialog" aria-controls="sidebar" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" fill="none" stroke-width="2"/></svg>
    </button>
    <h1 class="logo">Dreaded <span>Dragons</span></h1>
  </header>

  <!-- Server Status Widget (fixed top-right of page) -->
<section class="server-status" id="serverStatus"
         data-host="ddragon.net" data-port="">
  <div class="status-card">
    <div class="status-top">
      <span class="dot" id="srvDot" aria-hidden="true"></span>
      <span class="state" id="srvState">Checking…</span>
    </div>
    <div class="status-grid">
      <div class="row">
        <span class="label">Players</span>
        <span class="value" id="srvPlayers">–</span>
      </div>
      <div class="row">
        <span class="label">IP</span>
        <button class="ip-btn" id="srvIpBtn" type="button" title="Click to copy">
          <code id="srvIp">ddragon.net</code>
          <span class="copy-hint" aria-hidden="true">Copy</span>
        </button>
      </div>
    </div>
  </div>
</section>

  <!-- Sidebar + overlay -->
  <div class="overlay" id="overlay" hidden></div>
  <aside class="sidebar" id="sidebar" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="sidebarTitle">
    <div class="sidebar-head">
      <h2 class="sidebar-title" id="sidebarTitle">Menu</h2>
      <button class="close-btn" id="closeSidebar" aria-label="Close menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" fill="none" stroke-width="2"/></svg>
      </button>
    </div>
    <nav class="side-nav">
      <ul id="menuList" class="menu-list"></ul>
    </nav>
  </aside>

  <main class="container">
    <section class="hero">
      <p>Check out the <strong>creators</strong> you play with!</p>
    </section>

    <!-- Carousel -->
    <section class="carousel-section">
      <div class="carousel" id="creatorCarousel" aria-roledescription="carousel">
        <button class="nav prev" aria-label="Previous">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" fill="none" stroke-width="2.2"/></svg>
        </button>

        <div class="stage" id="carouselStage" tabindex="0">
          <!-- Cards injected by JS -->
        </div>

        <button class="nav next" aria-label="Next">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" stroke-width="2.2"/></svg>
        </button>
      </div>

      <div class="dots" id="carouselDots" role="tablist" aria-label="Carousel Pagination"></div>
    </section>

    <section class="cta">
      <p>Tip: Click a creator to jump straight to their <strong class="accent">Twitch</strong> channel.</p>
    </section>
  </main>



  <!-- Site pages menu data -->
  <script id="sitePages" type="application/json">
  [
    { "title": "Home",      "href": "index.html" },
    { "title": "Updates",      "href": "updates.html" },
    { "title": "Store",   "href": "https://store.ddragon.net", "external": true },
    { "title": "Discord",   "href": "https://discord.gg/QEj9WFUAbm", "external": true }
  ]
  </script>

  <!-- Creators: add/edit rows below. avatar is optional. -->
  <script id="creatorData" type="application/json">
  [
    { "name": "MarioGuy34",        "twitch": "marioguy34",        "avatar": "images/profiles/marioguy34.png" },
    { "name": "DJUShorts",  "twitch": "djushorts",  "avatar": "images/profiles/djushorts.png" },
    { "name": "JayJay2080",  "twitch": "jayjay2080",  "avatar": "images/profiles/jayjay2080.png" }
  ]
  </script>

  <script src="script.js" defer></script>
</body>
</html>