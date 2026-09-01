"use server";

import { withFlash } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/dal";
import { setDeputy } from "@/lib/services/team";

export async function setDeputyAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  if (!teamId) return;
  await withFlash("/team", async () => {
    // `setDeputy` reads the role inside the team's own edition, not the browsed one.
    await setDeputy(teamId, userId, user.id);
    return userId ? "Adjoint·e nommé·e." : "Adjoint·e retiré·e.";
  });
}
