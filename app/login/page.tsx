import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { InstallButton } from "@/components/landing/InstallButton";
import { Kyle } from "@/components/ui/Kyle";
import { botInviteUrl } from "@/lib/discord/permissions";

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "Ce compte est déjà lié à un autre utilisateur.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth();
  const { error, callbackUrl } = await searchParams;
  if (session?.user) redirect("/home");

  const errorKey = Array.isArray(error) ? error[0] : error;
  const target = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  const appId = process.env.AUTH_DISCORD_ID;
  const installUrl = appId ? botInviteUrl(appId) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-7 p-6 text-center">
      <Kyle width={140} alt="Kyle, la mascotte de Challenger" />
      <div>
        <p className="eyebrow">Challenger · par Aceep&amp;Kyle</p>
        <h1 className="mt-1 text-[34px]">Lisez en équipe.</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Chaque page lue rapporte des points à ton équipe : bingo, quêtes et histoire dont vous êtes le héros.
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
      <div className="flex flex-col items-center gap-3">
        <p className="text-[13px] text-[color:var(--muted)]">
          Pas encore de défi&nbsp;? Ajoute Kyle à ton serveur Discord, puis tape <code>/challenger creer</code>.
        </p>
        <InstallButton url={installUrl} className="btn ghost sm" />
      </div>
      <p className="text-[13px] text-[color:var(--muted)]">
        <Link href="/guide" className="underline">
          Guide de l’organisateur·ice
        </Link>{" "}
        ·{" "}
        <Link href="/demo" className="underline">
          Voir la démo
        </Link>{" "}
        ·{" "}
        <Link href="/" className="underline">
          Découvrir Challenger
        </Link>
      </p>
    </main>
  );
}
