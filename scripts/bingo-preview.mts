/**
 * Aperçu de l'image de grille, sans base ni Discord.
 *
 * Dessine une grille 4×4 de démonstration — thèmes français variés, dont des
 * longs, et les trois états — pour juger à l'œil les marges, les contrastes et
 * la troncature après une retouche de `lib/bingo/grid-layout.ts`.
 *
 *   npm run bingo:preview -- /tmp/bingo.png
 */
import { writeFileSync } from "node:fs";
import { renderGridPng } from "../lib/bingo/grid-image";
import type { GridView } from "../lib/bingo/grid-layout";

const cells: GridView["cells"] = [
  { label: "A1", theme: "Une couverture rouge", state: "free" },
  { label: "B1", theme: "Un personnage malade", state: "free" },
  { label: "C1", theme: "Plus de 500 pages", state: "done", note: "Kyle" },
  { label: "D1", theme: "Un accident de la route", state: "half", note: "½ Alycia" },
  { label: "A2", theme: "Un huis clos", state: "done", note: "Léa" },
  { label: "B2", theme: "Un personnage principal féminin", state: "free" },
  { label: "C2", theme: "Une intrigue qui se déroule à l’école", state: "free" },
  { label: "D2", theme: "Un personnage traumatisé par son enfance", state: "free" },
  { label: "A3", theme: "Plusieurs points de vue", state: "half", note: "½ Théo" },
  { label: "B3", theme: "Un thriller", state: "free" },
  { label: "C3", theme: "Des animaux", state: "done", note: "Léa + Tom" },
  { label: "D3", theme: "De la magie", state: "free" },
  { label: "A4", theme: "Un essai", state: "free" },
  { label: "B4", theme: "Moins de 300 pages", state: "free" },
  { label: "C4", theme: "Un manga ou une bande dessinée", state: "done", note: "Alycia" },
  { label: "D4", theme: "Une histoire de vengeance implacable et sans retour possible", state: "free" },
];

const out = process.argv[2] ?? "/tmp/bingo-preview.png";
const png = renderGridPng({ size: 4, cells });
writeFileSync(out, png);
console.log(`${out} — ${png.byteLength} octets`);
