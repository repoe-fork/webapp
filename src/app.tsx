import { Suspense, useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useLocationWithParams,
  useNavigate,
  useQueryParam,
  useQueryParams,
} from "use-navigation-api";
import { HomePage } from "routes";
import { AreasPage, getAreas } from "routes/areas";
import { SqlPage } from "routes/sql";
import { AboutPage } from "routes/about";
import { useSuspenseQuery } from "@tanstack/react-query";

type Tab = "home" | "areas" | "sql" | "about";

const NavLink = ({ label, href, active }: { label: string; href: string; active: boolean }) => (
  <a
    href={href}
    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
      active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
    }`}>
    {label}
  </a>
);

const AreaCombobox = () => {
  const { data: areas } = useSuspenseQuery(getAreas);
  const navigation = useNavigate();
  const location = useLocation();
  const selectedAreaId = useQueryParam("area");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedArea = selectedAreaId ? areas[selectedAreaId] : null;

  useEffect(() => {
    setSearch(selectedArea?.name ?? "");
  }, [selectedArea?.name, selectedAreaId]);

  const areaList = useMemo(() => Object.values(areas), [areas]);

  const filteredAreas = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return areaList;
    return areaList.filter(
      (area) =>
        area.name.toLowerCase().includes(trimmed) || area.id.toLowerCase().includes(trimmed),
    );
  }, [areaList, search]);

  const visibleAreas = filteredAreas.slice(0, 200);

  const selectArea = (id: string) => {
    const next = location.clone().setQuery("tab", "areas").setQuery("area", id);
    next.removeQuery("graph").removeQuery("room");
    navigation.navigate(String(next));
    setOpen(false);
  };

  const clearArea = () => {
    const next = location.clone().removeQuery("area").removeQuery("graph").removeQuery("room");
    navigation.navigate(String(next));
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative min-w-[220px]">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Area
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls="area-combobox-list"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
          placeholder="Search areas..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        {selectedAreaId && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearArea}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
            <span>
              Showing {visibleAreas.length} of {filteredAreas.length}
            </span>
          </div>
          <ul id="area-combobox-list" role="listbox" className="max-h-72 overflow-auto">
            {visibleAreas.map(({ id, name }) => {
              const isSelected = id === selectedAreaId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectArea(id)}
                    className={`w-full px-3 py-2 text-left text-sm ${
                      isSelected ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}>
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export function App() {
  const location = useLocation();
  const params = useQueryParams(["tab", "game"]);

  const tab = (["areas", "sql", "about", "home"].find((p) => p === params.tab) || "home") as Tab;
  const game = params.game === "poe2" ? "poe2" : "poe1";

  const navigation = useNavigate();
  useEffect(() => {
    const hash = location.hash();
    if (!hash) return;
    const sqlMatch = hash.match(/^#?\/sql\/([12])$/);
    const areaMatch = hash.match(/^#?\/areas\/([^/?#]+)$/);
    if (!sqlMatch && !areaMatch) return;

    let dest = location.hash("");
    if (sqlMatch) {
      dest = dest
        .setQuery("tab", "sql")
        .setQuery("game", sqlMatch[1] === "2" ? "poe2" : "poe1")
        .removeQuery("area");
    } else if (areaMatch) {
      dest = dest.setQuery("tab", "areas").setQuery("area", areaMatch[1]).setQuery("game", "poe2");
    }

    navigation?.navigate(String(dest), { history: "replace" });
  }, [navigation, location]);

  const homeHref = useLocationWithParams({ tab: "home", area: null, game: null });
  const areasHref = useLocationWithParams({ tab: "areas", area: null, game: null });
  const sqlPoe1Href = useLocationWithParams({ tab: "sql", game: "poe1", area: null });
  const sqlPoe2Href = useLocationWithParams({ tab: "sql", game: "poe2", area: null });
  const aboutHref = useLocationWithParams({ tab: "about", area: null, game: null });

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2">
          <div className="text-lg font-semibold tracking-tight text-slate-900">poe webapp</div>
          <nav className="flex flex-wrap gap-2">
            <NavLink label="Home" href={homeHref.href()} active={tab === "home"} />
            <NavLink label="Areas" href={areasHref.href()} active={tab === "areas"} />
            <NavLink
              label="poe1 sqlite"
              href={sqlPoe1Href.href()}
              active={tab === "sql" && game !== "poe2"}
            />
            <NavLink
              label="poe2 sqlite"
              href={sqlPoe2Href.href()}
              active={tab === "sql" && game === "poe2"}
            />
            <NavLink label="About" href={aboutHref.href()} active={tab === "about"} />
          </nav>
          <div className="ml-auto">
            <Suspense fallback={<div className="text-xs text-slate-400">Loading areas...</div>}>
              {tab === "areas" ? <AreaCombobox /> : null}
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4">
        <Suspense fallback={<div>Loading...</div>}>
          <AppContent tab={tab} />
        </Suspense>
      </main>
    </>
  );
}

function AppContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case "areas":
      return <AreasPage />;
    case "sql":
      return <SqlPage />;
    case "about":
      return <AboutPage />;
    case "home":
    default:
      return <HomePage />;
  }
}
