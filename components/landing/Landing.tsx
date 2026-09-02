import Link from "next/link";
import { Card, Kyle, KyleEmpty, Pill } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export type LandingExample = {
  id: string;
  name: string;
  color: string;
  period: string;
  summary: string;
  status: "ACTIVE" | "FINISHED" | "DRAFT";
};

/** Public landing page — no session, no Discord call. */
export function Landing({ examples }: { examples: LandingExample[] }) {
  return (
    <main className="landing">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-display text-[18px] font-black">
          <Kyle width={25} alt="Kyle, la mascotte de Challenger" />
          Challenger
        </span>
        <span className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn sm">
            Se connecter
          </Link>
        </span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Challenger · par Aceep&amp;Kyle</p>
          <h1>
            Lance le défi lecture de ta <em>communauté.</em>
          </h1>
          <p className="lead">
            Un serveur Discord, des équipes, huit semaines de lectures. Chaque page rapporte des points, le bingo et les quêtes se remplissent à plusieurs, et
            une histoire dont votre équipe est le héros se décide au vote.
          </p>
          <div className="actions">
            <Link href="/new" className="btn">
              Créer mon défi
            </Link>
            <Link href="/demo?tour=player&step=0" className="btn ghost">
              Visite guidée avec Kyle
            </Link>
          </div>
          <p className="hint">
            Déjà un défi sur ton serveur ? Demande une invitation aux organisateur·ices, puis{" "}
            <Link href="/login" className="underline">
              connecte-toi
            </Link>
            .
          </p>
        </div>
        <div className="mascot">
          <Kyle width={320} className="relative w-[min(320px,80%)]" alt="Kyle, le dinosaure jaune de Challenger" />
        </div>
      </section>

      <section className="landing-section">
        <h2>Trois façons de marquer</h2>
        <div className="pillars">
          <Card>
            <span className="big">pages ÷ 10</span>
            <h3>Lire</h3>
            <p>
              412 pages → 41,2 points pour l’équipe. Sous 150 pages, une lecture compte comme un graphique : moitié des points, mais elle compte quand même.
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
            <h3>L’histoire</h3>
            <p>
              Chaque chapitre se termine par un choix voté sur Discord ou sur le site. Les choix ont de vrais effets : bonus, quêtes surprises, alliances… ou
              coups bas.
            </p>
          </Card>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Exemples fictifs</p>
        <h2>Chaque communauté, son défi</h2>
        <div className="editions">
          {examples.map((e) => (
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

      <section className="landing-section">
        <h2>Comment ça marche</h2>
        <div className="how">
          <div>
            <h3>Côté organisateur·ice</h3>
            <ol>
              <li>
                <strong>Crée le défi</strong> : ici, ou avec <code>/challenger creer</code> depuis ton serveur Discord.
              </li>
              <li>
                <strong>Invite le bot</strong> et configure le serveur en un clic : rôles, catégorie, salons de chaque équipe.
              </li>
              <li>
                <strong>Crée les équipes</strong> : une couleur, un·e capitaine, un·e adjoint·e.
              </li>
              <li>
                <strong>Invite les joueurs</strong> — leur invitation s’applique dès leur prochaine connexion Discord.
              </li>
            </ol>
          </div>
          <div>
            <h3>Côté joueur·euse</h3>
            <ol>
              <li>
                <strong>Connecte-toi avec Discord</strong> : rien d’autre à installer.
              </li>
              <li>
                <strong>Rejoins le défi</strong> grâce à l’invitation de l’organisateur·ice — rien d’autre à faire.
              </li>
              <li>
                <strong>Lis, déclare</strong> : <code>/ajouter-un-livre</code> dans la librairie de l’équipe, ou ici.
              </li>
              <li>
                <strong>Le dimanche 19 h – 21 h</strong>, les capitaines vérifient ; le classement tombe à 20 h.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <Card className="flex flex-col gap-3">
          <p className="eyebrow">Sur l’honneur, mais cadré</p>
          <p>
            Pas de validation manuelle des lectures : les points arrivent tout de suite. Les capitaines ont une fenêtre hebdomadaire pour vérifier, chaque
            lecture garde l’historique de ses modifications, et les points sont un livre de comptes que personne ne peut réécrire.
          </p>
          <KyleEmpty card={false}>Kyle veille sur le règlement. Il est jaune, mais il ne plaisante pas avec les ½ crédits.</KyleEmpty>
        </Card>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-4 text-[13px] text-[color:var(--muted)]">
        <Link href="/new" className="underline">
          Créer mon défi
        </Link>
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
