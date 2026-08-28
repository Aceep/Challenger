import { BingoView } from "@/app/(player)/bingo/BingoView";
import { DEMO_GRID, DEMO_GRID_HISTORY, DEMO_GRID_TOTAL, DEMO_PLACEABLE_BOOKS } from "@/lib/demo/data";
import { demoAction } from "@/lib/demo/actions";

export default async function DemoBingoPage({ searchParams }: PageProps<"/demo/bingo">) {
  const action = demoAction.bind(null, "/demo/bingo");
  return (
    <BingoView
      grid={DEMO_GRID}
      total={DEMO_GRID_TOTAL}
      history={DEMO_GRID_HISTORY}
      books={DEMO_PLACEABLE_BOOKS}
      bonus={{ line: 25, full: 100 }}
      hasTeam
      params={await searchParams}
      demo
      placeBookAction={action}
      removeBookAction={action}
    />
  );
}
