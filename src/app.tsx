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
import { useAtom } from "jotai";
import { headerHeight } from "./state/headerHeight";
import ResizeObserver from 'rc-resize-observer';

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

const GameToggle = () => {
  const location = useLocation();
  const game = useQueryParam("game");

  const toggleHref = location.clone()
    .setQuery("game", game === "poe2" ? "poe1" : "poe2")
    .removeQuery("area")
    .removeQuery("graph")
    .removeQuery("room")
    .href();

  return (
    <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
      <a
        href={location.clone().setQuery("game", "poe1").removeQuery("area").removeQuery("graph").removeQuery("room").href()}
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
          game === "poe1" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}>
        PoE 1
      </a>
      <a
        href={location.clone().setQuery("game", "poe2").removeQuery("area").removeQuery("graph").removeQuery("room").href()}
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
          game === "poe2" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}>
        PoE 2
      </a>
    </div>
  );
};

const AreaCombobox = () => {
  const game = useQueryParam("game") === "poe2" ? "poe2" : "poe1";
  const version = useQueryParam("version");
  const { data: areas } = useSuspenseQuery(getAreas(game, version));
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
      <div className="flex items-center gap-2">
        {game === "poe2" && (
          <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-600">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              checked={version === "0.4"}
              onChange={(e) => {
                const next = location.clone();
                if (e.target.checked) {
                  next.setQuery("version", "0.4");
                } else {
                  next.removeQuery("version");
                }
                navigation.navigate(String(next));
              }}
            />
            pre-0.5
          </label>
        )}
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls="area-combobox-list"
          className="w-full rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
          placeholder={`Search ${game === "poe2" ? "PoE 2" : "PoE 1"} areas...`}
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

  const [,setHeaderHeight] = useAtom(headerHeight);

  const tab = (["areas", "sql", "about", "home"].find((p) => p === params.tab) || "home") as Tab;
  const game = params.game === "poe1" ? "poe1" : "poe2";

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

  const homeHref = location.query("").setQuery({ tab: "home", game }).href();
  const areasHref = location.query("").setQuery({ tab: "areas", game }).href();
  const sqlHref = location.query("").setQuery({ tab: "sql", game }).href();
  const aboutHref = location.query("").setQuery({ tab: "about", game }).href();

  return (
    <>
      <ResizeObserver onResize={({height}) => setHeaderHeight(height)}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-2">
          <div className="text-lg font-semibold tracking-tight text-slate-900">poe webapp</div>
          <GameToggle />
          <nav className="flex flex-wrap gap-2">
            <NavLink label="Home" href={homeHref} active={tab === "home"} />
            <NavLink label="Areas" href={areasHref} active={tab === "areas"} />
            <NavLink label="SQL" href={sqlHref} active={tab === "sql"} />
            <NavLink label="About" href={aboutHref} active={tab === "about"} />
          </nav>
          <div className="ml-auto">
            <Suspense fallback={<div className="text-xs text-slate-400">Loading areas...</div>}>
              {tab === "areas" ? <AreaCombobox /> : null}
            </Suspense>
          </div>
        </div>
      </header>
      </ResizeObserver>
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
