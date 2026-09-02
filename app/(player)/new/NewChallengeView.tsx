import { KyleEmpty, PageTitle } from "@/components/ui";
import type { ActionState } from "@/lib/forms";
import { NewChallengeForm, type NewChallengeDefaults } from "./NewChallengeForm";

export type NewChallengeViewProps = {
  defaults: NewChallengeDefaults;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

/** « Créer mon défi » — the door into the platform for an account without any edition. */
export function NewChallengeView({ defaults, action }: NewChallengeViewProps) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <PageTitle kicker={<p className="eyebrow">Challenger</p>}>Créer mon défi</PageTitle>
      <p className="meta lg">
        Un défi, c’est une communauté, un serveur Discord et des équipes. Tu en seras l’organisateur·ice&#8239;; tu pourras tout régler ensuite.
      </p>

      <NewChallengeForm defaults={defaults} action={action} />

      <KyleEmpty>
        Ton serveur a déjà un défi&#8239;? Il n’y a rien à créer&#8239;: demande une invitation aux organisateur·ices, elle s’appliquera à ta prochaine
        connexion.
      </KyleEmpty>
    </main>
  );
}
