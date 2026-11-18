/* ============================================================
   Altamash Interiors — admin dashboard logic
   ============================================================ */
(function () {
  "use strict";

  const loginView = document.querySelector("#login-view");
  const dashboard = document.querySelector("#dashboard-view");
  const loginForm = document.querySelector("#login-form");
  const loginError = document.querySelector("#login-error");
  const logoutBtn = document.querySelector("#logout-btn");

  const grid = document.querySelector("#admin-grid");
  const emptyState = document.querySelector("#empty-state");
  const searchInput = document.querySelector("#search-input");
  const statTotal = document.querySelector("#stat-total");
  const statFeatured = document.querySelector("#stat-featured");
  const statCategories = document.querySelector("#stat-categories");

  const addForm = document.querySelector("#add-form");
  const addFile = document.querySelector("#add-file");
  const addPreview = document.querySelector("#add-preview");
  const dropZone = document.querySelector("#drop-zone");
  const dropPlaceholder = document.querySelector("#drop-placeholder");
  const addError = document.querySelector("#add-error");

  const editModal = document.querySelector("#edit-modal");
  const editForm = document.querySelector("#edit-form");
  const editPreview = document.querySelector("#edit-preview");
  const editFile = document.querySelector("#edit-file");
  const editNewPreview = document.querySelector("#edit-new-preview");
  const editError = document.querySelector("#edit-error");

  const passwordModal = document.querySelector("#password-modal");
  const openPassword = document.querySelector("#open-password");
  const passwordForm = document.querySelector("#password-form");
  const passwordError = document.querySelector("#password-error");
  const toastEl = document.querySelector("#toast");

  let gallery = [];
  let addImageData = null;
  let editImageData = null;
  let editingId = null;
  let toastTimer = null;

  /* ---------- helpers ---------- */
  const escapeHtml = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const api = async (url, options = {}) => {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      if (res.status === 401 && !url.endsWith("/api/login")) {
        showLogin();
        showToast("Session expired. Please sign in again.", true);
      }
      throw new Error(data.error || "Something went wrong. Please try again.");
    }
    return data;
  };

  const showToast = (message, isError = false) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.toggle("error", isError);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  };

  const showLogin = () => {
    dashboard.hidden = true;
    loginView.hidden = false;
    document.querySelector("#login-password").value = "";
    loginError.textContent = "";
  };

  const showDashboard = () => {
    loginView.hidden = true;
    dashboard.hidden = false;
  };

  const setBusy = (button, busy, label) => {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = label || "Please wait…";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  };

  const readImage = (file, callback) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      showToast("Please choose a PNG, JPG, WEBP or GIF image.", true);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast("Image is larger than 12 MB.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.onerror = () => showToast("Could not read that image.", true);
    reader.readAsDataURL(file);
  };

  const setCategory = (select, value) => {
    if (!select) return;
    if (!Array.from(select.options).some((option) => option.value === value)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }
    select.value = value;
  };

  /* ---------- gallery rendering ---------- */
  const render = () => {
    const query = (searchInput.value || "").trim().toLowerCase();
    const list = gallery.filter((item) => {
      if (!query) return true;
      return `${item.title} ${item.label} ${item.category}`.toLowerCase().includes(query);
    });

    statTotal.textContent = String(gallery.length);
    statFeatured.textContent = String(gallery.filter((item) => item.featured).length);
    statCategories.textContent = String(
      new Set(gallery.flatMap((item) => item.category.split(" "))).size
    );

    grid.innerHTML = list
      .map(
        (item) => `
        <article class="admin-card">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <div class="admin-card-body">
            <h3>${escapeHtml(item.title)}</h3>
            <small>${escapeHtml(item.label)}</small>
            <div class="chips">
              <span class="chip">${escapeHtml(item.category.split(" ")[0])}</span>
              ${item.featured ? '<span class="chip gold">Homepage</span>' : ""}
            </div>
            <div class="card-actions">
              <button type="button" data-edit="${escapeHtml(item.id)}">Edit</button>
              <button type="button" class="btn-danger" data-delete="${escapeHtml(item.id)}">Delete</button>
            </div>
          </div>
        </article>`
      )
      .join("");

    emptyState.hidden = list.length > 0;
  };

  const loadGallery = async () => {
    try {
      gallery = await api("/api/gallery");
      render();
    } catch (error) {
      showToast(error.message, true);
    }
  };

  /* ---------- login / logout ---------- */
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const button = loginForm.querySelector("button[type=submit]");
    setBusy(button, true, "Signing in…");
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: document.querySelector("#login-username").value,
          password: document.querySelector("#login-password").value,
        }),
      });
      showDashboard();
      await loadGallery();
    } catch (error) {
      loginError.textContent = error.message;
    } finally {
      setBusy(button, false);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await api("/api/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    gallery = [];
    showLogin();
    showToast("Signed out.");
  });

  /* ---------- add image ---------- */
  const resetAdd = () => {
    addImageData = null;
    addForm.reset();
    addPreview.hidden = true;
    addPreview.removeAttribute("src");
    dropPlaceholder.hidden = false;
    addError.textContent = "";
  };

  dropZone.addEventListener("click", () => addFile.click());
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addFile.click();
    }
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    readImage(file, (data) => {
      addImageData = data;
      addPreview.src = data;
      addPreview.hidden = false;
      dropPlaceholder.hidden = true;
    });
  });
  addFile.addEventListener("change", () => {
    readImage(addFile.files[0], (data) => {
      addImageData = data;
      addPreview.src = data;
      addPreview.hidden = false;
      dropPlaceholder.hidden = true;
    });
  });

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    addError.textContent = "";
    if (!addImageData) {
      addError.textContent = "Please choose an image first.";
      return;
    }
    const button = addForm.querySelector("button[type=submit]");
    setBusy(button, true, "Uploading…");
    try {
      const item = await api("/api/gallery", {
        method: "POST",
        body: JSON.stringify({
          image: addImageData,
          title: document.querySelector("#add-title").value,
          label: document.querySelector("#add-label").value,
          category: document.querySelector("#add-category").value,
          featured: document.querySelector("#add-featured").checked,
        }),
      });
      gallery.unshift(item);
      render();
      resetAdd();
      showToast("New image added to the gallery.");
    } catch (error) {
      addError.textContent = error.message;
    } finally {
      setBusy(button, false);
    }
  });

  /* ---------- edit / delete ---------- */
  grid.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
      const item = gallery.find((entry) => entry.id === editButton.dataset.edit);
      if (!item) return;
      editingId = item.id;
      editImageData = null;
      editFile.value = "";
      editNewPreview.hidden = true;
      editNewPreview.removeAttribute("src");
      editPreview.src = item.src;
      editPreview.alt = item.title;
      document.querySelector("#edit-title-input").value = item.title;
      document.querySelector("#edit-label-input").value = item.label;
      setCategory(document.querySelector("#edit-category-input"), item.category);
      document.querySelector("#edit-featured-input").checked = Boolean(item.featured);
      editError.textContent = "";
      openModal(editModal);
    }

    if (deleteButton) {
      const item = gallery.find((entry) => entry.id === deleteButton.dataset.delete);
      if (!item) return;
      if (!window.confirm(`Delete “${item.title}” from the gallery?`)) return;
      try {
        await api(`/api/gallery/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        gallery = gallery.filter((entry) => entry.id !== item.id);
        render();
        showToast("Image deleted.");
      } catch (error) {
        showToast(error.message, true);
      }
    }
  });

  editFile.addEventListener("change", () => {
    readImage(editFile.files[0], (data) => {
      editImageData = data;
      editNewPreview.src = data;
      editNewPreview.hidden = false;
    });
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingId) return;
    editError.textContent = "";
    const button = editForm.querySelector("button[type=submit]");
    setBusy(button, true, "Saving…");
    try {
      const payload = {
        title: document.querySelector("#edit-title-input").value,
        label: document.querySelector("#edit-label-input").value,
        category: document.querySelector("#edit-category-input").value,
        featured: document.querySelector("#edit-featured-input").checked,
      };
      if (editImageData) payload.image = editImageData;
      const updated = await api(`/api/gallery/${encodeURIComponent(editingId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      gallery = gallery.map((item) => (item.id === updated.id ? updated : item));
      render();
      closeModal(editModal);
      showToast("Changes saved.");
    } catch (error) {
      editError.textContent = error.message;
    } finally {
      setBusy(button, false);
    }
  });

  /* ---------- modals ---------- */
  const openModal = (modal) => {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeModal = (modal) => {
    modal.hidden = true;
    document.body.style.overflow = "";
  };

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.closest(".modal")));
  });
  [editModal, passwordModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  /* ---------- password ---------- */
  openPassword.addEventListener("click", () => {
    passwordForm.reset();
    passwordError.textContent = "";
    openModal(passwordModal);
  });

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordError.textContent = "";
    const button = passwordForm.querySelector("button[type=submit]");
    setBusy(button, true, "Updating…");
    try {
      await api("/api/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: document.querySelector("#current-password").value,
          newPassword: document.querySelector("#new-password").value,
        }),
      });
      closeModal(passwordModal);
      passwordForm.reset();
      showToast("Password updated.");
    } catch (error) {
      passwordError.textContent = error.message;
    } finally {
      setBusy(button, false);
    }
  });

  /* ---------- search ---------- */
  searchInput.addEventListener("input", render);

  /* ---------- boot ---------- */
  (async () => {
    try {
      const session = await api("/api/session");
      if (session.authenticated) {
        showDashboard();
        await loadGallery();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  })();
})();
