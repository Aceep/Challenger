"use client";

/**
 * Last resort: the root layout itself failed, so neither globals.css nor the
 * fonts are guaranteed. The tokens are inlined (with `light-dark()` and a
 * Georgia fallback) so a crash still looks like Aceep&Kyle.
 */
const TOKENS = `
  :root { color-scheme: light dark }
  html, body { margin: 0 }
  body {
    background: light-dark(#FBF8F0, #141518);
    color: light-dark(#1A1A1F, #F3EFE4);
    font-family: "Nunito Sans", "Segoe UI", system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    text-align: center;
  }
  h1 { font-family: Fraunces, Georgia, "Times New Roman", serif; font-weight: 700; font-size: 28px; margin: 0 }
  p { margin: 0; color: light-dark(#6B675C, #A39F92); font-size: 13px }
  button {
    background: light-dark(#F5C400, #FFD84A);
    color: light-dark(#1A1A1F, #141518);
    border: 0; border-radius: 14px; padding: 12px 18px;
    font: 800 15px/1 inherit; cursor: pointer;
  }
`;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: TOKENS }} />
      </head>
      <body>
        <h1>Oups, quelque chose a cassé</h1>
        <p>Réessaie dans un instant{error.digest ? ` (réf. ${error.digest.slice(0, 8)})` : ""}.</p>
        <button onClick={reset}>Réessayer</button>
      </body>
    </html>
  );
}
