"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
        <h1>Oups, quelque chose a cassé</h1>
        <p>Réessaie dans un instant.</p>
        <button onClick={reset}>Réessayer</button>
      </body>
    </html>
  );
}
