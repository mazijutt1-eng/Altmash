/* ============================================================
   Altamash Interiors — interactions
   ============================================================ */
(function () {
  "use strict";

  const body = document.body;
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");

  /* sticky header shadow */
  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* mobile menu */
  if (toggle && menu) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && body.classList.contains("nav-open")) {
      body.classList.remove("nav-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
    if (e.key === "Escape" && lightbox && lightbox.classList.contains("is-open")) closeLightbox();
    if (lightbox && lightbox.classList.contains("is-open")) {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    }
  });

  /* active nav link */
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav-menu a, .footer-col a").forEach((link) => {
    const href = (link.getAttribute("href") || "").toLowerCase();
    if (href === page || (page === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });

  /* scroll reveal */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------- gallery: API data, filters + lightbox ---------- */
  const galleryGrid = document.querySelector("#gallery-grid");
  const galleryFilters = document.querySelector("#gallery-filters");
  const featuredGrid = document.querySelector("#featured-grid");
  const lightbox = document.querySelector(".lightbox");

  let galleryItems = [];
  let visibleItems = [];
  let currentIndex = 0;

  const escapeHtml = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const FILTER_LABELS = {
    all: "All Designs",
    gypsum: "Gypsum",
    cove: "Cove Light",
    layered: "Layered",
    wooden: "Wooden",
    bedroom: "Bedroom",
    lighting: "Lighting",
    pop: "POP",
    paint: "Paint Finish",
    living: "Living Room",
    office: "Office",
  };

  const lightboxImage = lightbox && lightbox.querySelector("img");
  const lightboxTitle = lightbox && lightbox.querySelector(".lightbox-caption strong");
  const lightboxMeta = lightbox && lightbox.querySelector(".lightbox-caption small");
  const lightboxCounter = lightbox && lightbox.querySelector(".lightbox-counter");

  function refreshVisible() {
    visibleItems = galleryItems.filter((item) => !item.classList.contains("is-hidden"));
  }

  function showImage(index) {
    if (!lightboxImage || !visibleItems.length) return;
    currentIndex = (index + visibleItems.length) % visibleItems.length;
    const item = visibleItems[currentIndex];
    const img = item.querySelector("img");
    lightboxImage.src = item.dataset.full || img.src;
    lightboxImage.alt = img.alt;
    if (lightboxTitle) lightboxTitle.textContent = item.dataset.title || img.alt;
    if (lightboxMeta) lightboxMeta.textContent = item.dataset.label || "Altamash Interiors";
    if (lightboxCounter) lightboxCounter.textContent = `${currentIndex + 1} / ${visibleItems.length}`;
  }

  function openLightbox(item) {
    if (!lightbox) return;
    refreshVisible();
    currentIndex = visibleItems.indexOf(item);
    showImage(currentIndex < 0 ? 0 : currentIndex);
    lightbox.classList.add("is-open");
    body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    body.style.overflow = "";
  }

  function nextImage() { showImage(currentIndex + 1); }
  function prevImage() { showImage(currentIndex - 1); }

  function applyFilter(filter) {
    if (galleryFilters) {
      galleryFilters.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
      });
    }
    galleryItems.forEach((item) => {
      const categories = (item.dataset.category || "").split(" ");
      item.classList.toggle("is-hidden", filter !== "all" && !categories.includes(filter));
    });
    refreshVisible();
  }

  function buildFilters(items) {
    if (!galleryFilters) return;
    const keys = new Set(["all"]);
    items.forEach((item) => (item.category || "").split(" ").forEach((key) => key && keys.add(key)));
    const preferred = ["all", ...Object.keys(FILTER_LABELS).filter((key) => key !== "all")];
    const extra = Array.from(keys).filter((key) => !preferred.includes(key));
    const ordered = [...preferred, ...extra].filter((key) => key === "all" || keys.has(key));
    galleryFilters.innerHTML = ordered
      .map(
        (key, index) =>
          `<button class="filter-btn${index === 0 ? " active" : ""}" type="button" data-filter="${escapeHtml(key)}">${escapeHtml(FILTER_LABELS[key] || key)}</button>`
      )
      .join("");
    galleryFilters.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
    });
  }

  function buildGalleryItem(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-item";
    button.dataset.category = item.category || "";
    button.dataset.title = item.title || "";
    button.dataset.label = item.label || "";
    button.dataset.full = item.src || "";
    button.innerHTML = `
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy">
      <span class="gallery-zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6"/></svg></span>
      <span class="gallery-caption"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.title)}</strong></span>`;
    button.addEventListener("click", () => openLightbox(button));
    return button;
  }

  function renderFeatured(items) {
    if (!featuredGrid) return;
    const featured = items.filter((item) => item.featured).slice(0, 7);
    if (!featured.length) {
      featuredGrid.innerHTML = '<p class="muted">No featured images selected yet.</p>';
      return;
    }
    featuredGrid.innerHTML = featured
      .map(
        (item) => `
        <a class="work-card" href="gallery.html">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <div class="work-card-body"><span>${escapeHtml(item.label)}</span><h3>${escapeHtml(item.title)}</h3></div>
        </a>`
      )
      .join("");
  }

  function renderGallery(items) {
    galleryItems = items.map(buildGalleryItem);
    if (galleryGrid) {
      galleryGrid.innerHTML = "";
      galleryItems.forEach((item) => galleryGrid.appendChild(item));
    }
    buildFilters(items);
    refreshVisible();
  }

  if (lightbox) {
    lightbox.querySelector(".lightbox-close")?.addEventListener("click", closeLightbox);
    lightbox.querySelector(".lightbox-nav.next")?.addEventListener("click", nextImage);
    lightbox.querySelector(".lightbox-nav.prev")?.addEventListener("click", prevImage);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  async function loadPublicGallery() {
    if (!galleryGrid && !featuredGrid) return;
    try {
      const response = await fetch("/api/gallery", { cache: "no-store" });
      if (!response.ok) throw new Error("API unavailable");
      const items = await response.json();
      renderGallery(items);
      renderFeatured(items);
    } catch {
      if (galleryGrid) {
        galleryGrid.innerHTML =
          '<p class="muted">Gallery could not load. Please run the site with <strong>npm start</strong> and open <strong>http://localhost:3000</strong>.</p>';
      }
      if (featuredGrid) featuredGrid.innerHTML = "";
    }
  }

  loadPublicGallery();

  /* ---------- enquiry form -> prefilled WhatsApp ---------- */
  const form = document.querySelector("#enquiry-form");
  if (form) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = (name) => (form.querySelector(`[name="${name}"]`) || {}).value || "";
      const name = val("name").trim();
      const phone = val("phone").trim();
      const service = val("service");
      const message = val("message").trim();

      if (!name || !phone) {
        if (status) status.textContent = "Please enter your name and phone number.";
        return;
      }

      const text = [
        "Assalam-o-Alaikum Altamash Interiors!",
        "",
        "I would like to enquire about your services.",
        "",
        `Name: ${name}`,
        `Phone: ${phone}`,
        service ? `Service: ${service}` : "",
        message ? `Message: ${message}` : "",
        "",
        "Location: C6, 1st Floor, Greenland Housing Scheme, Lahore, Punjab, Pakistan",
      ].filter(Boolean).join("\n");

      window.open(`https://wa.me/923237331953?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      if (status) status.textContent = "WhatsApp is opening with your details. Please press send.";
    });
  }

  /* current year */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
