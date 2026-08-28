import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Kyle } from "@/components/ui/Kyle";

const ERRORS: Record<string, string> = {
  NotInvited: "Ton compte Discord n'est pas invité à ce défi. Demande à un organisateur.",
  OAuthAccountNotLinked: "Ce compte est déjà lié à un autre utilisateur.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth();
  const { error, callbackUrl } = await searchParams;
  if (session?.user) redirect("/home");

  const errorKey = Array.isArray(error) ? error[0] : error;
  const target = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-7 p-6 text-center">
      <Kyle width={140} alt="Kyle, la mascotte d'Aceep&Kyle" />
      <div>
        <p className="eyebrow">Aceep&amp;Kyle</p>
        <h1 className="mt-1 text-[34px]">Lisez en équipe.</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Chaque page lue rapporte des points à ton équipe : bingo, quêtes et histoire dont vous êtes le héros.
        </p>
      </div>
      {errorKey && <p className="flash err">{ERRORS[errorKey] ?? "Connexion impossible. Réessaie."}</p>}
      <form
        action={async () => {
          "use server";
          await signIn("discord", { redirectTo: target ?? "/home" });
        }}
      >
        <button type="submit" className="btn text-[17px]">
          Se connecter avec Discord
        </button>
      </form>
      <p className="text-[13px] text-[color:var(--muted)]">
        Pas encore invité·e ?{" "}
        <Link href="/demo" className="underline">
          Voir la démo
        </Link>{" "}
        ·{" "}
        <Link href="/" className="underline">
          Découvrir Aceep&amp;Kyle
        </Link>
      </p>
    </main>
  );
}
