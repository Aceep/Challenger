type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Olive / brick banner fed by `?ok=` / `?error=` query params (see lib/actions.ts). */
export function Flash({ params }: { params: Params }) {
  const ok = first(params.ok);
  const error = first(params.error);
  if (!ok && !error) return null;
  return (
    <>
      {ok && <p className="flash ok">{ok}</p>}
      {error && <p className="flash err">⚠️ {error}</p>}
    </>
  );
}
