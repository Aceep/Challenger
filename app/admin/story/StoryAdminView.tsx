import { Card, Eyebrow, KyleEmpty, Pill } from "@/components/ui";
import { DataTable } from "@/components/ui/DataTable";
import { Flash } from "@/components/Flash";
import { NodeList, StoryForm, type EditorStory, type StoryActions } from "./StoryEditor";

export type TeamStoryRow = {
  teamId: string;
  name: string;
  color: string;
  chapter: string;
  status: { tone: "ok" | "wait" | "no" | "type"; label: string };
  hasState: boolean;
};

export type StoryAdminViewProps = {
  story: EditorStory | null;
  quests: { id: string; title: string }[];
  teams: TeamStoryRow[];
  hasChallenge: boolean;
  params: Record<string, string | string[] | undefined>;
  demo?: boolean;
  actions: StoryActions;
  resetTeamStoryAction?: (formData: FormData) => Promise<void>;
};

/** Admin › Histoire — pure view, reused by /demo/admin. */
export function StoryAdminView({ story, quests, teams, hasChallenge, params, actions, resetTeamStoryAction }: StoryAdminViewProps) {
  if (!hasChallenge) {
    return (
      <>
        <h1>Histoire</h1>
        <KyleEmpty>Active un défi pour écrire l&apos;histoire.</KyleEmpty>
      </>
    );
  }

  return (
    <>
      <div className="topline">
        <h1>Histoire</h1>
        {story && <span className="ed">{story.title}</span>}
        {story && <span className="text-[13.5px] text-[color:var(--muted)]">Durée de vote par défaut : {story.voteHours} h</span>}
      </div>
      <Flash params={params} />

      <div className="two">
        <div className="flex flex-col gap-3">
          <StoryForm story={story} action={actions.saveStoryAction} />
          {story &&
            (story.nodes.length === 0 ? (
              <KyleEmpty>Aucun chapitre. Le premier créé devient le début.</KyleEmpty>
            ) : (
              <NodeList story={story} quests={quests} actions={actions} />
            ))}
        </div>

        <Card>
          <Eyebrow>Où en sont les équipes</Eyebrow>
          <DataTable headless head={["Équipe", "Chapitre", "Statut", ""]}>
            {teams.map((t) => (
              <tr key={t.teamId}>
                <td>
                  <span className="dot" style={{ background: t.color }} />
                  {t.name}
                </td>
                <td>{t.chapter}</td>
                <td>
                  <Pill tone={t.status.tone}>{t.status.label}</Pill>
                </td>
                <td>
                  {t.hasState && resetTeamStoryAction && (
                    <form action={resetTeamStoryAction}>
                      <input type="hidden" name="teamId" value={t.teamId} />
                      <button className="text-xs text-[color:var(--brick)] underline">Remettre au début</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
