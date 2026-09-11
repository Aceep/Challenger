/**
 * Les icônes de l'application installable, dérivées d'une seule source.
 *
 * `app/icon.png` (512² RGBA, Kyle détouré) est la seule image entretenue à la
 * main. Le reste se regénère :
 *
 *   npm run pwa:icons
 *
 * - `public/icons/icon-{192,512}.png` : simple redimensionnement, alpha gardé.
 * - `public/icons/maskable-{192,512}.png` : fond papier plein et mascotte à
 *   80 %, pour qu'Android puisse rogner en cercle sans manger un pied. Le
 *   papier plutôt que le jaune de la marque : Kyle est jaune, il disparaîtrait.
 * - `public/icons/badge-96.png` : silhouette blanche monochrome sur fond
 *   transparent, le seul format que la barre d'état Android accepte.
 * - `app/apple-icon.png` : 180² à fond papier opaque, iOS ignorant l'alpha.
 *
 * Les sorties sont commises : ni le build ni la CI ne rejouent ce script.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "app", "icon.png");

/** `--bg` en clair : le papier, fond opaque des icônes masquables et de l'icône iOS. */
const PAPER = "#fbf8f0";
/** Part du carré occupée par la mascotte sur une icône masquable (la zone sûre). */
const MASKABLE_RATIO = 0.8;

type Output = { path: string; bytes: number };

function write(path: string, png: Buffer): Output {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  return { path: path.slice(root.length + 1), bytes: png.byteLength };
}

/** Redimensionnement simple, transparence conservée. */
function plain(icon: Image, size: number): Buffer {
  const canvas = createCanvas(size, size);
  canvas.getContext("2d").drawImage(icon, 0, 0, size, size);
  return canvas.encodeSync("png");
}

/** Fond plein, mascotte centrée sur une fraction du carré. */
function onBackground(icon: Image, size: number, background: string, ratio: number): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  const inner = Math.round(size * ratio);
  const offset = Math.round((size - inner) / 2);
  ctx.drawImage(icon, offset, offset, inner, inner);
  return canvas.encodeSync("png");
}

/**
 * La silhouette : on ne garde que le canal alpha, repeint en blanc. Android
 * réduit de toute façon le badge à une forme monochrome — autant la maîtriser.
 */
function silhouette(icon: Image, size: number): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(icon, 0, 0, size, size);
  const image = ctx.getImageData(0, 0, size, size);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.encodeSync("png");
}

const icon = await loadImage(SOURCE);

const outputs: Output[] = [
  write(join(root, "public", "icons", "icon-192.png"), plain(icon, 192)),
  write(join(root, "public", "icons", "icon-512.png"), plain(icon, 512)),
  write(join(root, "public", "icons", "maskable-192.png"), onBackground(icon, 192, PAPER, MASKABLE_RATIO)),
  write(join(root, "public", "icons", "maskable-512.png"), onBackground(icon, 512, PAPER, MASKABLE_RATIO)),
  write(join(root, "public", "icons", "badge-96.png"), silhouette(icon, 96)),
  write(join(root, "app", "apple-icon.png"), onBackground(icon, 180, PAPER, 1)),
];

for (const out of outputs) console.log(`${out.path} — ${out.bytes} octets`);
