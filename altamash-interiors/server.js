/* ============================================================
   Altamash Interiors — tiny zero-dependency backend
   Run: node server.js   (or: npm start)
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const GALLERY_FILE = path.join(DATA_DIR, "gallery.json");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SESSION_COOKIE = "altamash_session";
const SESSION_MS = 24 * 60 * 60 * 1000;
const MAX_BODY = 20 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- helpers ---------- */
function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function loadAuth() {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
    } catch {
      /* rebuild below */
    }
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const record = {
    username: "admin",
    salt,
    hash: hashPassword("altamash2026", salt),
  };
  writeJsonAtomic(AUTH_FILE, record);
  return record;
}

function readGallery() {
  try {
    const data = JSON.parse(fs.readFileSync(GALLERY_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const sessions = new Map();

function sessionToken(req) {
  const raw = req.headers.cookie || "";
  const found = raw
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${SESSION_COOKIE}=`));
  return found ? found.slice(SESSION_COOKIE.length + 1) : null;
}

function isAuthed(req) {
  const token = sessionToken(req);
  if (!token) return false;
  const expires = sessions.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function startSession(res) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + SESSION_MS);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}`
  );
}

function clearSession(req, res) {
  const token = sessionToken(req);
  if (token) sessions.delete(token);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

function allowedImage(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl || "");
  if (!match) return null;
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) return null;
  const ext = match[1].toLowerCase().includes("jpeg") ? "jpg" : match[1].split("/")[1];
  return { buffer, ext };
}

function saveImage(dataUrl) {
  const image = allowedImage(dataUrl);
  if (!image) throw new Error("Please choose a valid PNG, JPG, WEBP or GIF image (max 12 MB).");
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${image.ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), image.buffer);
  return `/uploads/${name}`;
}

function removeImage(src) {
  if (!src || !src.startsWith("/uploads/")) return;
  const file = path.join(UPLOAD_DIR, path.basename(src));
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function cleanText(value, max = 160) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function makeId() {
  return crypto.randomBytes(8).toString("hex");
}

/* ---------- static files ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const PUBLIC_PAGES = new Set([
  "/index.html",
  "/gallery.html",
  "/services.html",
  "/about.html",
  "/contact.html",
  "/admin.html",
  "/logo.png",
]);

function serveStatic(req, res, pathname) {
  let rel;
  if (pathname === "/" || pathname === "") rel = "/index.html";
  else if (PUBLIC_PAGES.has(pathname)) rel = pathname;
  else if (pathname === "/admin") rel = "/admin.html";
  else if (pathname.startsWith("/assets/") || pathname.startsWith("/uploads/")) rel = pathname;
  else {
    sendText(res, 404, "Not found");
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }

  const filePath = path.resolve(ROOT, `.${decoded}`);
  if (!filePath.startsWith(ROOT + path.sep)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ---------- API ---------- */
async function handleApi(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  if (pathname === "/api/session" && method === "GET") {
    return sendJson(res, 200, { authenticated: isAuthed(req) });
  }

  if (pathname === "/api/login" && method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
    const auth = loadAuth();
    const suppliedHash = hashPassword(body.password || "", auth.salt);
    const a = Buffer.from(suppliedHash, "hex");
    const b = Buffer.from(auth.hash, "hex");
    const validUser = String(body.username || "") === auth.username;
    const validPass = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!validUser || !validPass) {
      return sendJson(res, 401, { error: "Incorrect username or password." });
    }
    startSession(res);
    return sendJson(res, 200, { ok: true, username: auth.username });
  }

  if (pathname === "/api/logout" && method === "POST") {
    clearSession(req, res);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/gallery" && method === "GET") {
    return sendJson(res, 200, readGallery());
  }

  if (pathname === "/api/gallery" && method === "POST") {
    if (!isAuthed(req)) return sendJson(res, 401, { error: "Please login first." });
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
    try {
      const item = {
        id: makeId(),
        src: saveImage(body.image),
        title: cleanText(body.title, 120) || "New Ceiling Design",
        label: cleanText(body.label, 120) || "Altamash Interiors",
        category: cleanText(body.category, 160) || "gypsum",
        featured: Boolean(body.featured),
      };
      const items = readGallery();
      items.unshift(item);
      writeJsonAtomic(GALLERY_FILE, items);
      return sendJson(res, 201, item);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  const itemMatch = pathname.match(/^\/api\/gallery\/([^/]+)$/);
  if (itemMatch) {
    if (!isAuthed(req)) return sendJson(res, 401, { error: "Please login first." });
    const id = decodeURIComponent(itemMatch[1]);
    const items = readGallery();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return sendJson(res, 404, { error: "Image not found." });

    if (method === "PUT") {
      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
      try {
        const oldSrc = items[index].src;
        let newSrc = oldSrc;
        if (body.image) newSrc = saveImage(body.image);
        items[index] = {
          ...items[index],
          title: cleanText(body.title, 120) || items[index].title,
          label: cleanText(body.label, 120) || items[index].label,
          category: cleanText(body.category, 160) || items[index].category,
          featured: body.featured === undefined ? items[index].featured : Boolean(body.featured),
          src: newSrc,
        };
        if (newSrc !== oldSrc) removeImage(oldSrc);
        writeJsonAtomic(GALLERY_FILE, items);
        return sendJson(res, 200, items[index]);
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }

    if (method === "DELETE") {
      removeImage(items[index].src);
      items.splice(index, 1);
      writeJsonAtomic(GALLERY_FILE, items);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (pathname === "/api/change-password" && method === "POST") {
    if (!isAuthed(req)) return sendJson(res, 401, { error: "Please login first." });
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
    const auth = loadAuth();
    const supplied = hashPassword(body.currentPassword || "", auth.salt);
    const a = Buffer.from(supplied, "hex");
    const b = Buffer.from(auth.hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return sendJson(res, 400, { error: "Current password is incorrect." });
    }
    const next = String(body.newPassword || "");
    if (next.length < 6) {
      return sendJson(res, 400, { error: "New password must be at least 6 characters." });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    writeJsonAtomic(AUTH_FILE, {
      username: auth.username,
      salt,
      hash: hashPassword(next, salt),
    });
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Unknown API endpoint." });
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: "Server error." });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`\n  Altamash Interiors website + admin dashboard`);
  console.log(`  Website : http://localhost:${PORT}/`);
  console.log(`  Dashboard: http://localhost:${PORT}/admin`);
  console.log(`  Login    : admin / altamash2026  (change it inside the dashboard)\n`);
});
