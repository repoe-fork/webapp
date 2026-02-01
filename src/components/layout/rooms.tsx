import React from "react";
import { Room } from "components/layout/room";
import { useLocation, useNavigate, useQueryParam } from "use-navigation-api";

export const Rooms: React.FC<{ tag: string; graph: any }> = ({ tag, graph }) => {
  const navigation = useNavigate();
  const location = useLocation();
  const selectedRoomFile = useQueryParam("roomFile");
  const rooms = (graph.room_set || []).filter(({ room_tag }: any) => room_tag === tag);

  const selectRoomFile = (file: string) => {
    const next = location.clone().setQuery("roomFile", file);
    navigation.navigate(String(next));
  };

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">{tag}</h3>
        <span className="text-xs text-slate-400">{rooms.length} rooms</span>
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {rooms.map((room: any) => (
          <React.Suspense
            key={room.file}
            fallback={<p className="text-sm text-slate-500">Loading room...</p>}>
            <button
              type="button"
              onClick={() => selectRoomFile(room.file)}
              className="text-left"
              aria-pressed={room.file === selectedRoomFile}>
              <Room
                key={room.file}
                roomPath={room.file}
                graph={graph}
                cellSize={36}
                selected={room.file === selectedRoomFile}
              />
            </button>
          </React.Suspense>
        ))}
      </div>
    </div>
  );
};
