/**
 * La police de l'image de grille, embarquée dans le dépôt.
 *
 * Une fonction serverless n'a aucune police système garantie : sans fichier
 * embarqué, le texte tombe en carrés (« tofu »). Deux fichiers Inter statiques
 * (SIL Open Font License, `assets/fonts/OFL.txt`) vivent donc dans le dépôt et
 * sont enregistrés au premier dessin, sous un nom à nous — jamais « Inter »
 * tout court, pour ne pas dépendre d'une éventuelle Inter du système.
 *
 * `next.config.ts` embarque `assets/fonts/**` dans la trace de la route Discord
 * (`outputFileTracingIncludes`) : sans cela, Vercel ne déploierait pas ces
 * fichiers, qu'aucun `import` ne désigne.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";

/** Le nom de famille sous lequel le dessin demande la police. */
export const GRID_FONT_FAMILY = "InterBingo";

const FILES = ["Inter-Regular.ttf", "Inter-SemiBold.ttf"];

/**
 * Les endroits où le fichier peut se trouver : le dépôt en développement, la
 * racine de la fonction déployée, et une échappatoire par variable
 * d'environnement si l'hébergeur range les traces ailleurs.
 */
function candidates(file: string): string[] {
  const dirs = [process.env.BINGO_FONT_DIR, path.join(process.cwd(), "assets", "fonts"), path.join(process.cwd(), "..", "assets", "fonts")];
  return dirs.filter((d): d is string => !!d).map((d) => path.join(d, file));
}

let registered: boolean | null = null;

/**
 * Enregistre la police, une fois pour la vie du processus. Rend `false` quand
 * aucun fichier n'a pu être lu : le dessin continue alors avec la police par
 * défaut du système plutôt que de refuser l'image — un rendu approximatif vaut
 * mieux qu'une commande qui échoue.
 */
export function registerGridFont(): boolean {
  if (registered !== null) return registered;
  if (GlobalFonts.has(GRID_FONT_FAMILY)) return (registered = true);
  let ok = false;
  for (const file of FILES) {
    const found = candidates(file).find((p) => existsSync(p));
    if (found && GlobalFonts.registerFromPath(found, GRID_FONT_FAMILY)) ok = true;
  }
  if (!ok) console.warn("[bingo] police introuvable : l'image de grille utilisera la police par défaut du système.");
  return (registered = ok);
}

/** La chaîne `ctx.font` correspondante, avec un repli générique. */
export const fontSpec = (size: number, weight: number) => `${weight} ${size}px "${GRID_FONT_FAMILY}", sans-serif`;
