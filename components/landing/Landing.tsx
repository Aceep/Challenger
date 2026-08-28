import Link from "next/link";
import { Card, Kyle, KyleEmpty, Pill } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export type LandingEdition = {
  id: string;
  name: string;
  color: string;
  period: string;
  summary: string;
  status: "ACTIVE" | "FINISHED" | "DRAFT";
};

/** Public landing page — no session, no Discord call. */
export function Landing({ editions }: { editions: LandingEdition[] }) {
  return (
    <main className="landing">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-display text-[18px] font-black">
          <Kyle width={25} alt="Kyle, la mascotte d'Aceep&Kyle" />
          Aceep&amp;Kyle
        </span>
        <span className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn small">
            Se connecter
          </Link>
        </span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Aceep&amp;Kyle · défis lecture en équipe</p>
          <h1>
            Lisez en équipe.
            <br />
            Gagnez <em>ensemble.</em>
          </h1>
          <p className="lead">
            Chaque page lue rapporte des points à votre équipe. Remplissez un bingo à plusieurs, validez des quêtes, et choisissez la suite d&apos;une histoire
            dont votre équipe est le héros — tout se passe sur Discord et ici.
          </p>
          <div className="actions">
            <Link href="/demo" className="btn">
              Voir la démo joueur
            </Link>
            <Link href="/demo/admin" className="btn ghost">
              Voir la démo organisateur
            </Link>
          </div>
        </div>
        <div className="mascot">
          <Kyle width={320} className="relative w-[min(320px,80%)]" alt="Kyle, le dinosaure jaune d'Aceep&Kyle" />
        </div>
      </section>

      <section className="landing-section">
        <h2>Trois façons de marquer</h2>
        <div className="pillars">
          <Card>
            <span className="big">pages ÷ 10</span>
            <h3>Lire</h3>
            <p>
              412 pages → 41,2 points pour l&apos;équipe. Sous 150 pages, une lecture compte comme un graphique : moitié des points, mais elle compte quand même.
            </p>
          </Card>
          <Card>
            <span className="big">½ + ½</span>
            <h3>Bingo &amp; quêtes</h3>
            <p>
              Un roman valide une case ou une quête. Deux graphiques, même lus par deux membres, en valident une ensemble. Une grille terminée ouvre la suivante.
            </p>
          </Card>
          <Card>
            <span className="big">3 votes</span>
            <h3>L&apos;histoire</h3>
            <p>
              Chaque chapitre se termine par un choix voté sur Discord ou sur le site. Les choix ont de vrais effets : bonus, quêtes surprises, alliances… ou
              coups bas.
            </p>
          </Card>
        </div>
      </section>

      <section className="landing-section">
        <h2>Une plateforme, plusieurs éditions</h2>
        <div className="editions">
          {editions.map((e) => (
            <div key={e.id} className="edition" style={{ background: `linear-gradient(160deg, ${e.color}, color-mix(in srgb, ${e.color} 45%, #14151A))` }}>
              <span className="tag">
                <Pill tone={e.status === "ACTIVE" ? "wait" : "ok"}>{e.status === "ACTIVE" ? "En cours" : "Terminée"}</Pill>
              </span>
              <p className="meta">{e.period}</p>
              <h3>{e.name}</h3>
              <p className="meta">{e.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how">
        <div>
          <h2>Comment ça marche</h2>
          <ol>
            <li>
              <strong>L&apos;organisateur crée l&apos;édition</strong> : dates, barème, grilles de bingo, quêtes, histoire, salons Discord.
            </li>
            <li>
              <strong>Les joueurs sont invités</strong> par leur identifiant Discord et rejoignent une équipe.
            </li>
            <li>
              <strong>On lit, on déclare</strong> : <code>/ajouter-un-livre</code> dans la librairie de l&apos;équipe, ou ici.
            </li>
            <li>
              <strong>Le dimanche 19 h – 21 h</strong>, les capitaines vérifient ; le classement tombe à 20 h.
            </li>
          </ol>
        </div>
        <Card className="flex flex-col gap-3">
          <p className="eyebrow">Sur le honneur, mais cadré</p>
          <p>
            Pas de validation manuelle des lectures : les points arrivent tout de suite. Les capitaines ont une fenêtre hebdomadaire pour vérifier, chaque
            lecture garde l&apos;historique de ses modifications, et les points sont un livre de comptes que personne ne peut réécrire.
          </p>
          <KyleEmpty card={false}>Kyle veille sur le règlement. Il est jaune, mais il ne plaisante pas avec les ½ crédits.</KyleEmpty>
        </Card>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-4 text-[13px] text-[color:var(--muted)]">
        <Link href="/demo" className="underline">
          Démo joueur
        </Link>
        <Link href="/demo/admin" className="underline">
          Démo organisateur
        </Link>
        <Link href="/login" className="underline">
          Se connecter avec Discord
        </Link>
      </footer>
    </main>
  );
}
