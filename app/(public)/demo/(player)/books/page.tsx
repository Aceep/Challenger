import { BooksView } from "@/app/(player)/books/BooksView";
import { DEMO_MY_BOOKS, DEMO_TEAM, DEMO_TEAM_BOOKS } from "@/lib/demo/data";
import { demoAction } from "@/lib/demo/actions";

export default async function DemoBooksPage({ searchParams }: PageProps<"/demo/books">) {
  return (
    <BooksView
      books={DEMO_MY_BOOKS}
      teamBooks={DEMO_TEAM_BOOKS}
      isCaptain={false}
      teamColor={DEMO_TEAM.color}
      params={await searchParams}
      demo
      deleteBookAction={demoAction.bind(null, "/demo/books")}
    />
  );
}
