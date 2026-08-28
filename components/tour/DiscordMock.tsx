import { Kyle } from "@/components/ui/Kyle";

/**
 * Static mock-up of what `/ajouter-un-livre` looks like on Discord.
 * Purely decorative: no Discord call, no client JavaScript.
 */
export function DiscordMock() {
  return (
    <div className="discord-mock" aria-label="Exemple de conversation Discord">
      <p className="channel"># librairie · Les Hérissons</p>

      <div className="msg">
        <span className="av member" aria-hidden>
          L
        </span>
        <div>
          <p className="who">
            Léa <span className="at">aujourd’hui à 21:04</span>
          </p>
          <p className="cmd">
            <span>/ajouter-un-livre</span> titre : <em>Le Cœur des Ténèbres</em> pages : <em>512</em>
          </p>
        </div>
      </div>

      <div className="msg">
        <span className="av bot" aria-hidden>
          <Kyle width={26} />
        </span>
        <div>
          <p className="who">
            Kyle <span className="badge">BOT</span> <span className="at">aujourd’hui à 21:04</span>
          </p>
          <p className="reply">
            ✅ <strong>Le Cœur des Ténèbres</strong> — 512 p. · roman
            <br />
            <strong>+51,2 pts</strong> pour Les Hérissons · case <strong>B3</strong> validée 🎯
          </p>
        </div>
      </div>
    </div>
  );
}
