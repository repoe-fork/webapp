import { AppBar, Box, Link as MUILink, Toolbar, Typography } from "@mui/material";
import { Suspense } from "react";
import { useLocationWithParams, useQueryParam } from "use-navigation-api";
import { HomePage } from "routes/index";
import { AreasPage } from "routes/areas";
import { SqlPage } from "routes/sql.$sequel";
import { AboutPage } from "routes/about";

type Tab = "home" | "areas" | "sql" | "about";

const NavLink = ({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) => (
  <MUILink
    href={href}
    underline="none"
    color="inherit"
    sx={{ fontWeight: active ? 700 : 400, mr: 2 }}>
    {label}
  </MUILink>
);

export function App() {
  const rawTab = useQueryParam("tab");
  const tab: Tab =
    rawTab === "areas" || rawTab === "sql" || rawTab === "about" || rawTab === "home"
      ? rawTab
      : "home";

  const game = useQueryParam("game") || "poe1";

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
          <NavLink label="Home" href={homeHref} active={tab === "home"} />
          <NavLink label="Areas" href={areasHref} active={tab === "areas"} />
          <NavLink label="poe1 sqlite" href={sqlPoe1Href} active={tab === "sql" && game !== "poe2"} />
          <NavLink label="poe2 sqlite" href={sqlPoe2Href} active={tab === "sql" && game === "poe2"} />
          <NavLink label="About" href={aboutHref} active={tab === "about"} />
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
