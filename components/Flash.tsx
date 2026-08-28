import { Toast } from "@/components/Toast";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Olive / brick toast fed by `?ok=` / `?error=` query params (see lib/actions.ts). */
export function Flash({ params }: { params: Params }) {
  const ok = first(params.ok);
  const error = first(params.error);
  if (!ok && !error) return null;
  return (
    <>
      {ok && <Toast tone="ok" text={ok} />}
      {error && <Toast tone="err" text={error} />}
    </>
  );
}
