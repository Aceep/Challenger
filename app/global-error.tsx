"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui", background: "#FBF8F0", color: "#1A1A1F", padding: 24, textAlign: "center" }}>
        <h1>Oups, quelque chose a cassé</h1>
        <p>Réessaie dans un instant.</p>
        <button
          onClick={reset}
          style={{ background: "#F5C400", color: "#1A1A1F", border: 0, borderRadius: 12, padding: "12px 18px", fontWeight: 800, cursor: "pointer" }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
