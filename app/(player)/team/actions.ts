"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPlayer } from "@/lib/dal";
import { setDeputy } from "@/lib/services/team";

export async function setDeputyAction(formData: FormData) {
  const { user } = await getCurrentPlayer();
  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  if (!teamId) return;
  await setDeputy(teamId, userId, { id: user.id, role: user.role });
  revalidatePath("/team");
}
