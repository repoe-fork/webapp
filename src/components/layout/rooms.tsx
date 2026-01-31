import React from "react";
import { Room } from "components/layout/room";

export const Rooms: React.FC<{ tag: string; graph: any }> = ({ tag, graph }) => {
  return (
    <div>
      <h3>{tag}</h3>
      {(graph.room_set || [])
        .filter(({ room_tag }: any) => room_tag === tag)
        .map((room: any) => (
          <React.Suspense
            key={room.file}
            fallback={<p className="text-sm text-slate-500">Loading room...</p>}>
            <Room key={room.file} roomPath={room.file} graph={graph} />
          </React.Suspense>
        ))}
    </div>
  );
};
