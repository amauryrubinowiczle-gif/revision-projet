import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/library", label: "Bibliothèque" },
  { to: "/review", label: "Réviser" },
  { to: "/statistics", label: "Statistiques" },
];

/**
 * Layout racine — navigation simple, peu de boutons, façon Notion/Obsidian (voir brief
 * "Interface"). La logique de chaque écran vit dans ui/pages/* ; ce composant ne fait
 * qu'assembler la coquille visuelle.
 */
export function App() {
  return (
    <div className="flex h-screen bg-surface text-ink">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface-raised p-3">
        <div className="mb-4 px-2 text-sm font-medium text-ink-muted">Révision</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `rounded-md px-2 py-1.5 text-sm transition-colors ${
                isActive ? "bg-accent/10 text-accent" : "text-ink-muted hover:bg-surface hover:text-ink"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </aside>
      <main className="fade-in flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
