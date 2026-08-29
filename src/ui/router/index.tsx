import { createMemoryRouter } from "react-router-dom";
import { App } from "@ui/App";
import { DashboardPage } from "@ui/pages/Dashboard/DashboardPage";
import { LibraryPage } from "@ui/pages/Library/LibraryPage";
import { CardEditorPage } from "@ui/pages/CardEditor/CardEditorPage";
import { ReviewSessionPage } from "@ui/pages/ReviewSession/ReviewSessionPage";
import { StatisticsPage } from "@ui/pages/Statistics/StatisticsPage";

// MemoryRouter (pas de barre d'adresse en desktop, voir section 2 du document d'architecture).
export const router = createMemoryRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "card/new", element: <CardEditorPage /> },
      { path: "card/:id/edit", element: <CardEditorPage /> },
      { path: "review", element: <ReviewSessionPage /> },
      { path: "statistics", element: <StatisticsPage /> },
    ],
  },
]);
