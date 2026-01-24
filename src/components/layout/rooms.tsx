import React from "react";
import { Typography } from "@mui/material";
import { Room } from "components/layout/room";

export const Rooms: React.FC<{ tag: string; graph: any }> = ({ tag, graph }) => {
  return (
    <div>
      <h3>{tag}</h3>
      {graph.room_set
        .filter(({ room_tag }: any) => room_tag === tag)
        .map((room: any) => (
          <React.Suspense fallback={<Typography>Loading room...</Typography>}>
            <Room key={room.file} roomPath={room.file} />
          </React.Suspense>
        ))}
    </div>
  );
};