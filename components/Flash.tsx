type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Green / red banner fed by `?ok=` / `?error=` query params (see lib/actions.ts). */
export function Flash({ params }: { params: Params }) {
  const ok = first(params.ok);
  const error = first(params.error);
  if (!ok && !error) return null;
  return (
    <>
      {ok && <p className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">{ok}</p>}
      {error && <p className="rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">⚠️ {error}</p>}
    </>
  );
}
