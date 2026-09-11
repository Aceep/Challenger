-- La catégorie Discord du défi : `/challenger creer` crée désormais une
-- catégorie au nom de l'édition, qui accueille #annonces-défi et le forum #faq.
-- Purement additif : les éditions existantes gardent leurs salons (la colonne
-- reste nulle, le bootstrap ne réadopte jamais #général).

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "discordCategoryId" TEXT;
