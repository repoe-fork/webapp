import { AppBar, Box, Link as MUILink, Toolbar, Typography } from "@mui/material";
import { Suspense, useEffect } from "react";
import {
  useLocation,
  useLocationWithParams,
  useNavigate,
  useQueryParams,
} from "use-navigation-api";
import { HomePage } from "routes";
import { AreasPage } from "routes/areas";
import { SqlPage } from "routes/sql.$sequel";
import { AboutPage } from "routes/about";

type Tab = "home" | "areas" | "sql" | "about";

const NavLink = ({ label, href, active }: { label: string; href: string; active: boolean }) => (
  <MUILink
    href={href}
    underline="none"
    color="inherit"
    sx={{ fontWeight: active ? 700 : 400, mr: 2 }}>
    {label}
  </MUILink>
);

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
      <AppBar position="static">
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ mr: 3 }}>
            poe webapp
          </Typography>
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
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        <Suspense fallback={<div>Loading...</div>}>
          <AppContent tab={tab} />
        </Suspense>
      </Box>
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
