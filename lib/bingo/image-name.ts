/**
 * Le nom du fichier joint, seul et sans dépendance.
 *
 * L'embed le cite en `attachment://…` et la réponse multipart le donne comme
 * nom de la pièce jointe : les deux doivent dire exactement la même chaîne.
 * Il vit dans son propre module pour que la carte Discord — pure — n'ait pas à
 * importer le module de dessin, qui charge le binaire natif du canvas.
 */
export const GRID_IMAGE_FILENAME = "bingo.png";
