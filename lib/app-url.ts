/**
 * The public URL of the application, in one place.
 *
 * Every link the bot writes (DMs, cards, announcements) and every absolute URL
 * built server-side goes through here. Pure and client-safe: no I/O, no
 * `server-only`, so the Discord copy modules stay unit-testable.
 *
 * The trailing slash is stripped so callers may always append their path
 * (`${APP_URL()}/guide`) without doubling it.
 */
export const APP_URL = () => (process.env.AUTH_URL ?? "https://challenger-aceepkyle.vercel.app").replace(/\/$/, "");
