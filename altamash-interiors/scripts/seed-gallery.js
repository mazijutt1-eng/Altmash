/* One-time utility: build data/gallery.json from the original gallery.html markup. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "gallery.html"), "utf8");

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const re = /<button class="gallery-item[^"]*"[^>]*data-category="([^"]*)"[^>]*data-title="([^"]*)"[^>]*data-label="([^"]*)"[\s\S]*?<img src="([^"]+)"/g;
const items = [];
let match;
while ((match = re.exec(source)) !== null) {
  const [, category, title, label, src] = match;
  const cleanSrc = src.replace(/^assets\/images\//, "/assets/images/");
  const id = path.basename(cleanSrc).replace(/\.[^.]+$/, "");
  items.push({
    id,
    src: cleanSrc,
    title: decode(title),
    label: decode(label),
    category: decode(category),
    featured: items.length < 7,
  });
}

const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "gallery.json"), JSON.stringify(items, null, 2) + "\n");
console.log(`Seeded ${items.length} gallery items into data/gallery.json`);
