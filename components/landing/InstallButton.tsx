/**
 * « Ajouter Kyle à mon serveur » — the public install link.
 *
 * The URL is built server-side from `AUTH_DISCORD_ID` (`botInviteUrl`) and is
 * null when the app id is not configured, in which case nothing is rendered
 * rather than a dead button. It opens Discord's own authorisation screen, in a
 * new tab so the visitor keeps the page they were reading.
 */
export function InstallButton({ url, className = "btn", label = "Ajouter Kyle à mon serveur" }: { url: string | null; className?: string; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      {label}
    </a>
  );
}
