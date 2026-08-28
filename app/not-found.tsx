import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-5 text-center">
      <p className="text-4xl">🔍</p>
      <h1 className="text-xl font-bold">Page introuvable</h1>
      <Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
