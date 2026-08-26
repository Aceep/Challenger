import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

const ERRORS: Record<string, string> = {
  NotInvited: "Ton compte Discord n'est pas invité à ce défi. Demande à un organisateur.",
  OAuthAccountNotLinked: "Ce compte est déjà lié à un autre utilisateur.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth();
  const { error, callbackUrl } = await searchParams;
  if (session?.user) redirect("/");

  const errorKey = Array.isArray(error) ? error[0] : error;
  const target = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Book Challenge</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Lis, remplis tes bingos, accomplis des quêtes, fais gagner ton équipe.
        </p>
      </div>
      {errorKey && (
        <p className="max-w-sm rounded-md bg-red-100 p-3 text-center text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {ERRORS[errorKey] ?? "Connexion impossible. Réessaie."}
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("discord", { redirectTo: target ?? "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-[#5865F2] px-6 py-3 text-lg font-semibold text-white shadow hover:bg-[#4752c4]"
        >
          Se connecter avec Discord
        </button>
      </form>
    </main>
  );
}
