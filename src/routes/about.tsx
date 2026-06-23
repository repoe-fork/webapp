import * as React from "react";

export function AboutPage() {
  return (
    <div className="p-2">
      <h3>About</h3>
      <p>
        <a href="https://repoe-fork.github.io/">RePoE</a> is a project that maintains an up-to-date
        export of information datamined from the game files in a format easily consumable by
        developers.
      </p>
      <p>This page provides some tools and ui allowing users to explore the data directly.</p>
      <p>
        Work on this app is sporadic and mostly happens when l want to find something out for
        myself, but l'd be happy to discuss any feature requests or bug reports; you can usually
        find me in{" "}
        <a target="_blank" href="https://discord.com/invite/pathofexile">
          the official poe discord
        </a>
        , in the tooldev-general channel, or you can open an issue{" "}
        <a href="https://github.com/repoe-fork/repoe/issues">on github</a>.
      </p>
    </div>
  );
}
