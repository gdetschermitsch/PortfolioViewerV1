const MANIFEST_PATH = "portfolio.json";

const state = {
  data: { models: [], modelDownloads: [], images: [], videos: [], audio: [] },
  adultConfirmed: sessionStorage.getItem("cruxtainAdultConfirmed") === "yes",
  censorshipOff: sessionStorage.getItem("cruxtainCensorshipOff") === "yes",
  revealedMatureImages: new Set(JSON.parse(sessionStorage.getItem("cruxtainRevealedMatureImages") || "[]")),
  modelPreviewersLoaded: false
};

const grids = {
  home: document.getElementById("homeCategoryGrid"),
  models: document.getElementById("modelsGrid"),
  modelDownloads: document.getElementById("modelDownloadsGrid"),
  images: document.getElementById("imagesGrid"),
  videos: document.getElementById("videosGrid"),
  audio: document.getElementById("audioGrid")
};

const views = Array.from(document.querySelectorAll(".view"));
const routeLinks = Array.from(document.querySelectorAll("[data-route-link]"));
const yearEl = document.getElementById("year");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxVideo = document.getElementById("lightboxVideo");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");
const censorshipToggle = document.getElementById("censorshipToggle");
const modelLoadToggle = document.getElementById("modelLoadToggle");

if (yearEl) yearEl.textContent = new Date().getFullYear();


function wireUiImageFallbacks() {
  document.querySelectorAll("img[data-fallback-src]").forEach(img => {
    const fallbacks = String(img.dataset.fallbackSrc || "").split(",").map(value => value.trim()).filter(Boolean);
    if (!fallbacks.length) return;
    img.addEventListener("error", () => {
      const next = fallbacks.shift();
      if (!next) return;
      img.dataset.fallbackSrc = fallbacks.join(",");
      img.src = next;
    });
  });
}

wireUiImageFallbacks();

const CENSORED_NAME_PATTERNS = [
  "demon banker",
  "demonbanker",
  "demon merchant",
  "demonmerchant",
  "reptileactionscene",
  "reptile action scene",
  "zombie",
  "convicts",
  "death by back",
  "deathbyback",
  "death by thought",
  "deathbythought",
  "demonantix",
  "demon anti x",
  "demonharlot",
  "demon harlot",
  "demonthought",
  "demonofthought",
  "DemonAquatic",
  "DemonAlice",
  "Demonflesh",
  "Spawnnomask",
  "PennyWiseInspiration",
  "Spawn300Inspiration",
  "tormented"
];


const MODEL_GROUPS = [
  { key: "characterEnemy", title: "Character / Enemy", aliases: ["charactersandenemies", "characterenemy", "character", "enemy"] },
  { key: "objectItem", title: "Object / Item", aliases: ["objectsanditems", "objectitem", "object", "item"] }
];

const IMAGE_GROUPS = [
  { key: "original", title: "Original", aliases: ["origionalart", "originalart", "original"] },
  { key: "sketches", title: "Sketches", aliases: ["sketches", "sketch"] },
  { key: "customFanArt", title: "CustomFanArt", aliases: ["fanart", "customfanart", "custom fan art"] }
];

const CATEGORY_CARDS = [
  { route: "models", title: "3D Models", eyebrow: "Interactive", description: "Load GLB/GLTF model previews on demand.", key: "models" },
  { route: "images", title: "Images", eyebrow: "Illustration", description: "Finished artwork and sketches with mature-preview protection.", key: "images" },
  { route: "videos", title: "Video", eyebrow: "Clips", description: "Video previews and portfolio reels.", key: "videos" },
  { route: "audio", title: "Audio", eyebrow: "Music / Voice", description: "Audio samples that play one at a time.", key: "audio" }
];

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[_\-\.]+/g, " ").replace(/\s+/g, " ").trim();
}

function searchableName(item = {}) {
  return normalize([item.title, item.src, item.description, item.tag].filter(Boolean).join(" "));
}


function matureImageKey(item = {}) {
  return String(item.src || item.title || "").toLowerCase();
}

function saveRevealedMatureImages() {
  sessionStorage.setItem("cruxtainRevealedMatureImages", JSON.stringify(Array.from(state.revealedMatureImages)));
}

function isCensoredImage(item = {}) {
  if (item.censored === true || item.adult === true || item.mature === true) return true;
  const haystack = searchableName(item).replace(/\s+/g, " ");
  const compactHaystack = haystack.replace(/\s+/g, "");
  return CENSORED_NAME_PATTERNS.some(pattern => {
    const normalized = normalize(pattern);
    return haystack.includes(normalized) || compactHaystack.includes(normalized.replace(/\s+/g, ""));
  });
}

function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

function cardBody(item) {
  return `<div class="card-body"><h3>${esc(item.title)}</h3><p>${esc(item.description || "")}</p>${item.tag ? `<span class="badge">${esc(item.tag)}</span>` : ""}</div>`;
}

function routeFromHash() {
  const route = (location.hash || "#home").replace("#", "").trim().toLowerCase();
  return ["home", "models", "images", "videos", "audio"].includes(route) ? route : "home";
}

function setRoute(route) {
  views.forEach(view => view.classList.toggle("active-view", view.dataset.view === route));
  routeLinks.forEach(link => link.classList.toggle("active", link.dataset.routeLink === route));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function renderHome() {
  grids.home.innerHTML = CATEGORY_CARDS.map(card => {
    const count = (state.data[card.key] || []).length;
    const preview = firstPreviewFor(card.key);
    const style = preview && !["models", "audio"].includes(card.key) ? ` style="background-image:url('${esc(preview)}')"` : "";
    return `<article class="category-card home-category-card" data-home-card="${esc(card.key)}">
      ${homePreviewMarkup(card, style)}
      <a class="home-category-link" href="#${esc(card.route)}" aria-label="Open ${esc(card.title)} category">
        <div class="card-body"><h3>${esc(card.title)}</h3><p>${esc(card.description)}</p><span class="badge">${count} listed</span></div>
      </a>
    </article>`;
  }).join("");
  wireHomePreviewControls();
}

function homePreviewMarkup(card, style = "") {
  if (card.key === "models") {
    const model = (state.data.models || [])[0];
    if (!model) return `<div class="category-thumb"><span>${esc(card.eyebrow)}</span></div>`;
    return `<button class="category-thumb home-model-thumb" type="button" data-home-model-index="0" aria-label="Load ${esc(model.title)} 3D model preview">
      <span>${esc(card.eyebrow)}</span>
      <strong>Load GLB/GLTF preview</strong>
      <small>${esc(model.title)}</small>
    </button>`;
  }

  if (card.key === "audio") {
    const audio = (state.data.audio || [])[0];
    if (!audio) return `<div class="category-thumb"><span>${esc(card.eyebrow)}</span></div>`;
    return `<div class="category-thumb home-audio-thumb">
      <span>${esc(card.eyebrow)}</span>
      <div class="home-audio-preview">
        <strong>${esc(audio.title)}</strong>
        <audio controls preload="metadata" data-home-audio="true"><source src="${esc(audio.src)}">Your browser does not support embedded audio.</audio>
      </div>
    </div>`;
  }

  if (card.key === "images") {
    const image = firstPreviewItemFor("images");
    if (!image) return `<div class="category-thumb"><span>${esc(card.eyebrow)}</span></div>`;
    return `<button class="category-thumb home-media-thumb home-image-thumb" type="button" data-home-media="image" aria-label="Open ${esc(image.title || card.title)} full image"${style}>
      <span>${esc(card.eyebrow)}</span>
    </button>`;
  }

  if (card.key === "videos") {
    const video = firstPreviewItemFor("videos");
    if (!video) return `<div class="category-thumb"><span>${esc(card.eyebrow)}</span></div>`;
    return `<button class="category-thumb home-media-thumb home-video-thumb" type="button" data-home-media="video" aria-label="Open ${esc(video.title || card.title)} video preview"${style}>
      <span>${esc(card.eyebrow)}</span>
      <strong class="home-play-label">Play video preview</strong>
    </button>`;
  }

  return `<div class="category-thumb"${style}><span>${esc(card.eyebrow)}</span></div>`;
}

function wireHomePreviewControls() {
  grids.home.querySelectorAll(".home-model-thumb").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const item = (state.data.models || [])[Number(button.dataset.homeModelIndex || 0)];
      if (!item) return;
      const wrapper = document.createElement("div");
      wrapper.className = "home-model-preview";
      wrapper.innerHTML = modelViewerMarkup(item);
      button.replaceWith(wrapper);
    });
  });

  grids.home.querySelectorAll("[data-home-media]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const type = button.dataset.homeMedia;
      const item = firstPreviewItemFor(type === "video" ? "videos" : "images");
      if (!item) return;
      if (type === "video") openVideoLightbox(item);
      else openLightbox(item);
    });
  });

  wireExclusiveAudioPlayers();
}

function firstPreviewItemFor(key) {
  const list = state.data[key] || [];
  if (key === "images") return list.find(item => !isCensoredImage(item)) || null;
  return list.find(entry => entry.poster || entry.src) || null;
}

function firstPreviewFor(key) {
  const item = firstPreviewItemFor(key);
  if (!item) return "";
  if (key === "videos") return item.poster || "";
  return item.poster || item.src || "";
}

function groupMatches(item = {}, group) {
  const value = normalize([item.category, item.tag, item.description, item.src, item.title].filter(Boolean).join(" ")).replace(/\s+/g, "");
  return group.aliases.some(alias => value.includes(normalize(alias).replace(/\s+/g, "")));
}

function groupedItems(items = [], groups = []) {
  const used = new Set();
  const buckets = groups.map(group => {
    const bucketItems = items.filter((item, index) => {
      if (used.has(index)) return false;
      if (!groupMatches(item, group)) return false;
      used.add(index);
      return true;
    });
    return { ...group, items: bucketItems };
  });
  const uncategorized = items.filter((_, index) => !used.has(index));
  if (uncategorized.length) buckets.push({ key: "uncategorized", title: "Uncategorized", items: uncategorized });
  return buckets;
}


function imageGroupKey(item = {}) {
  const src = normalize(item.src || "").replace(/\s+/g, "");
  const tag = normalize(item.tag || item.category || item.description || "").replace(/\s+/g, "");
  const title = normalize(item.title || "").replace(/\s+/g, "");
  const joined = [src, tag, title].join(" ");

  // Hard folder precedence prevents Sketches/SOrigionalArt from leaking into Original,
  // and prevents Sketches/SFanArt from leaking into CustomFanArt.
  if (src.includes("src/images/sketches/") || src.includes("/sketches/")) return "sketches";
  if (src.includes("src/images/fanart/") || src.includes("/fanart/") || src.includes("customfanart") || tag.includes("fanart")) return "customFanArt";
  if (src.includes("src/images/origionalart/") || src.includes("src/images/originalart/") || src.includes("/origionalart/") || src.includes("/originalart/") || tag.includes("origionalart") || tag.includes("originalart")) return "original";

  if (joined.includes("sketch")) return "sketches";
  if (joined.includes("fanart") || joined.includes("customfanart")) return "customFanArt";
  if (joined.includes("origional") || joined.includes("original")) return "original";
  return "uncategorized";
}

function groupedImageItems(items = []) {
  const buckets = IMAGE_GROUPS.map(group => ({ ...group, items: [] }));
  const lookup = Object.fromEntries(buckets.map(bucket => [bucket.key, bucket]));
  const uncategorized = [];
  items.forEach(item => {
    const key = imageGroupKey(item);
    if (lookup[key]) lookup[key].items.push(item);
    else uncategorized.push(item);
  });
  if (uncategorized.length) buckets.push({ key: "uncategorized", title: "Uncategorized", items: uncategorized });
  return buckets;
}

function collapsibleSection(title, innerHtml, options = {}) {
  const count = options.count ?? 0;
  const open = options.open === false ? "" : " open";
  return `<details class="portfolio-group"${open}>
    <summary><span>${esc(title)}</span><span class="group-count">${count} listed</span></summary>
    ${innerHtml}
  </details>`;
}

function modelViewerMarkup(item = {}) {
  return `<model-viewer src="${esc(item.src)}"${item.poster ? ` poster="${esc(item.poster)}"` : ""} camera-controls auto-rotate shadow-intensity="1" alt="${esc(item.title || "3D model")}"></model-viewer>`;
}

function updateModelLoadButton() {
  if (!modelLoadToggle) return;
  modelLoadToggle.textContent = state.modelPreviewersLoaded ? "Load all: On" : "Load all: Off";
  modelLoadToggle.setAttribute("aria-pressed", state.modelPreviewersLoaded ? "true" : "false");
}

function renderModelCard(item, index, bucketKey) {
  const preview = state.modelPreviewersLoaded
    ? modelViewerMarkup(item)
    : `<button class="load-model" type="button" data-model-bucket="${esc(bucketKey)}" data-model-index="${index}">Load 3D model<br><small>${esc(item.title)}</small></button>`;
  return `<article class="card">${preview}${cardBody(item)}</article>`;
}

function renderModels(items = []) {
  updateModelLoadButton();
  if (!items.length) {
    grids.models.innerHTML = empty("No GLB/GLTF models listed.");
    return;
  }
  const buckets = groupedItems(items, MODEL_GROUPS);
  const bucketLookup = {};
  grids.models.innerHTML = buckets.map(bucket => {
    bucketLookup[bucket.key] = bucket.items;
    const grid = bucket.items.length ? `<div class="grid model-grid">${bucket.items.map((item, index) => renderModelCard(item, index, bucket.key)).join("")}</div>` : empty(`No ${bucket.title} models listed.`);
    return collapsibleSection(bucket.title, grid, { count: bucket.items.length });
  }).join("");
  document.querySelectorAll(".load-model").forEach(button => button.addEventListener("click", () => {
    const bucketItems = bucketLookup[button.dataset.modelBucket] || [];
    const item = bucketItems[Number(button.dataset.modelIndex)];
    if (!item) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = modelViewerMarkup(item);
    button.replaceWith(wrapper.firstElementChild);
  }));
}

function renderDownloads(items = []) {
  grids.modelDownloads.innerHTML = items.length ? items.map(item => `<article class="card"><div class="card-body"><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><a class="badge" href="${esc(item.src)}" download>Download ${esc(item.tag || "file")}</a></div></article>`).join("") : "";
}

function updateCensorshipButton() {
  if (!censorshipToggle) return;
  censorshipToggle.textContent = state.censorshipOff ? "Censorship: Off" : "Censorship: On";
  censorshipToggle.setAttribute("aria-pressed", state.censorshipOff ? "true" : "false");
}

function revealAllMaturePreviews() {
  state.adultConfirmed = true;
  state.censorshipOff = true;
  sessionStorage.setItem("cruxtainAdultConfirmed", "yes");
  sessionStorage.setItem("cruxtainCensorshipOff", "yes");
  updateCensorshipButton();
  renderImages(state.data.images || []);
}

function revealOneMatureImage(item = {}) {
  state.adultConfirmed = true;
  sessionStorage.setItem("cruxtainAdultConfirmed", "yes");
  state.revealedMatureImages.add(matureImageKey(item));
  saveRevealedMatureImages();
  renderImages(state.data.images || []);
}

function enableCensorship() {
  state.censorshipOff = false;
  state.adultConfirmed = false;

  // Surgical fix: turning censorship back ON must revoke every temporary
  // reveal permission too. This ensures the Viewer note censorship button
  // always asks for age confirmation before disabling censorship again.
  state.revealedMatureImages.clear();
  sessionStorage.removeItem("cruxtainAdultConfirmed");
  sessionStorage.removeItem("cruxtainCensorshipOff");
  sessionStorage.removeItem("cruxtainRevealedMatureImages");

  updateCensorshipButton();
  renderImages(state.data.images || []);
}

function renderImageCard(item, index, bucketKey) {
  const censored = isCensoredImage(item);
  const locked = censored && !state.censorshipOff && !state.revealedMatureImages.has(matureImageKey(item));
  if (locked) {
    return `<article class="card censored-card" data-image-index="${index}">
      <div class="censor-panel">
        <span class="censor-label">18+ hidden preview</span>
        <h3>${esc(item.title)}</h3>
        <p>This image is hidden by default due to mature, sexual-theme, bloody, or violent content risk.</p>
        <button class="confirm-adult mature-confirm" type="button" data-mature-confirm="true" data-image-bucket="${esc(bucketKey)}" data-image-index="${index}">I am 18+- reveal this image</button>
      </div>
      ${cardBody(item)}
    </article>`;
  }
  return `<article class="card image-card${censored ? " mature-card" : ""}">
    <button class="image-open" type="button" data-image-bucket="${esc(bucketKey)}" data-image-index="${index}" aria-label="Open ${esc(item.title)} full image">
      <img src="${esc(item.src)}" alt="${esc(item.title)}" loading="lazy">
    </button>
    ${cardBody(item)}
  </article>`;
}

function renderImages(items = []) {
  updateCensorshipButton();
  if (!items.length) {
    grids.images.innerHTML = empty("No images listed.");
    return;
  }
  const buckets = groupedImageItems(items);
  const bucketLookup = {};
  grids.images.innerHTML = buckets.map(bucket => {
    bucketLookup[bucket.key] = bucket.items;
    const grid = bucket.items.length ? `<div class="grid">${bucket.items.map((item, index) => renderImageCard(item, index, bucket.key)).join("")}</div>` : empty(`No ${bucket.title} images listed.`);
    return collapsibleSection(bucket.title, grid, { count: bucket.items.length });
  }).join("");

  grids.images.querySelectorAll("[data-mature-confirm=\"true\"]").forEach(button => button.addEventListener("click", () => {
    const bucketItems = bucketLookup[button.dataset.imageBucket] || [];
    const item = bucketItems[Number(button.dataset.imageIndex)];
    if (!item) return;
    if (state.adultConfirmed || confirm("Confirm you are 18+ to reveal this mature portfolio image?")) {
      revealOneMatureImage(item);
    }
  }));

  document.querySelectorAll(".image-open").forEach(button => button.addEventListener("click", () => {
    const bucketItems = bucketLookup[button.dataset.imageBucket] || [];
    const item = bucketItems[Number(button.dataset.imageIndex)];
    if (item) openLightbox(item);
  }));
}

function videoType(src = "") {
  const clean = String(src).split("?")[0].toLowerCase();
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "video/mp4";
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".mov")) return "video/quicktime";
  return "";
}

function configureMobileVideo(video) {
  if (!video) return;
  video.setAttribute("controls", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.preload = "metadata";
}

function clearVideo(video) {
  if (!video) return;
  video.pause();
  video.innerHTML = "";
  video.removeAttribute("src");
  video.removeAttribute("poster");
  video.load();
}

function setVideoSource(video, item = {}) {
  configureMobileVideo(video);
  clearVideo(video);

  const source = document.createElement("source");
  source.src = item.src || "";

  const type = videoType(item.src || "");
  if (type) source.type = type;

  video.appendChild(source);

  if (item.poster) video.poster = item.poster;
  else video.removeAttribute("poster");

  video.load();
}

function openLightbox(item = {}) {
  if (!lightbox || !lightboxImage) return;
  if (lightboxVideo) {
    clearVideo(lightboxVideo);
    lightboxVideo.hidden = true;
  }
  lightboxImage.hidden = false;
  lightboxImage.src = item.src || "";
  lightboxImage.alt = item.title || "Full portfolio image";
  lightboxCaption.textContent = item.title || "";
  lightbox.hidden = false;
  document.body.classList.add("no-scroll");
}

function openVideoLightbox(item = {}) {
  if (!lightbox || !lightboxVideo) return;
  if (lightboxImage) {
    lightboxImage.hidden = true;
    lightboxImage.src = "";
    lightboxImage.alt = "";
  }

  lightboxVideo.hidden = false;
  setVideoSource(lightboxVideo, item);

  lightboxCaption.textContent = item.title || "Video preview";
  lightbox.hidden = false;
  document.body.classList.add("no-scroll");

  const playAttempt = lightboxVideo.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      // Mobile Safari/Chrome may require the user to tap the visible controls.
    });
  }
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.hidden = true;
  lightboxImage.hidden = false;
  lightboxImage.src = "";
  lightboxCaption.textContent = "";
  if (lightboxVideo) {
    clearVideo(lightboxVideo);
    lightboxVideo.hidden = true;
  }
  document.body.classList.remove("no-scroll");
}

function renderVideos(items = []) {
  grids.videos.innerHTML = items.length
    ? items.map(item => `<article class="card"><video controls playsinline webkit-playsinline preload="metadata" ${item.poster ? `poster="${esc(item.poster)}"` : ""}><source src="${esc(item.src)}" ${videoType(item.src) ? `type="${esc(videoType(item.src))}"` : ""}>Your browser does not support embedded video.</video>${cardBody(item)}</article>`).join("")
    : empty("No videos listed.");

  grids.videos.querySelectorAll("video").forEach(configureMobileVideo);
}

function renderAudio(items = []) {
  grids.audio.innerHTML = items.length ? items.map(item => `<article class="card audio-card"><div class="card-body"><h3>${esc(item.title)}</h3><p>${esc(item.description || "")}</p><audio controls preload="metadata"><source src="${esc(item.src)}">Your browser does not support embedded audio.</audio>${item.tag ? `<span class="badge">${esc(item.tag)}</span>` : ""}</div></article>`).join("") : empty("No audio listed.");
  wireExclusiveAudioPlayers();
}

function wireExclusiveAudioPlayers() {
  document.querySelectorAll("audio").forEach(player => {
    if (player.dataset.exclusiveWired === "true") return;
    player.dataset.exclusiveWired = "true";
    player.addEventListener("play", () => {
      document.querySelectorAll("audio").forEach(other => {
        if (other !== player) other.pause();
      });
    });
  });
}

function renderAll() {
  renderHome();
  renderModels(state.data.models || []);
  renderDownloads(state.data.modelDownloads || []);
  renderImages(state.data.images || []);
  renderVideos(state.data.videos || []);
  renderAudio(state.data.audio || []);
  setRoute(routeFromHash());
}

async function boot() {
  try {
    const response = await fetch(MANIFEST_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("missing manifest");
    state.data = await response.json();
    renderAll();
  } catch (error) {
    console.error(error);
    Object.values(grids).forEach(grid => {
      if (grid) grid.innerHTML = empty("portfolio.json could not be loaded. Test with a local server or GitHub Pages.");
    });
  }
}

window.addEventListener("hashchange", () => setRoute(routeFromHash()));
modelLoadToggle?.addEventListener("click", () => {
  state.modelPreviewersLoaded = !state.modelPreviewersLoaded;
  renderModels(state.data.models || []);
});

function confirmAdultAndReveal() {
  // Main Viewer note censorship button must always show the age prompt
  // before unlocking all mature previews, even if a prior per-image reveal
  // happened during the same browser session.
  if (confirm("Confirm you are 18+ to turn censorship off and reveal mature portfolio image previews?")) {
    revealAllMaturePreviews();
  }
}

censorshipToggle?.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  if (state.censorshipOff) {
    enableCensorship();
  } else {
    confirmAdultAndReveal();
  }
});
lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", event => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLightbox();
});

boot();
