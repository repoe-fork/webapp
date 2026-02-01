import React from "react";
import { TileKey } from "lib/tile_matching";
import { ARMSlot } from "lib/arm";
import { CandidateMatch } from "components/layout/tile";

const SideNames = ["Left (W)", "Bottom (S)", "Right (E)", "Top (N)"];
const CornerNames = ["TopLeft (nw)", "BottomLeft (sw)", "BottomRight (se)", "TopRight (ne)"];

const CriteriaList: React.FC<{
  keyInfo: TileKey;
  title: string;
  tag: string | null;
  getEdgeColor?: (side: number) => string;
  getCornerColor?: (corner: number) => string;
}> = ({ keyInfo, title, tag, getEdgeColor, getCornerColor }) => {
  return (
    <div>
      <h4 className="font-semibold text-slate-400 mb-1 underline">{title}</h4>
      <p>
        Tag: <span className="text-blue-300 font-mono">{tag || "none"}</span>
      </p>

      <div className="mt-2 space-y-1">
        <h5 className="font-semibold text-slate-500">Edges (Connectors):</h5>
        <div className="grid grid-cols-1 gap-x-2 font-mono text-[10px]">
          {keyInfo.edge_types.map((et, i) => (
            <div
              key={i}
              className={`flex justify-between ${getEdgeColor?.(i) ?? "text-slate-300"}`}>
              <span>{SideNames[i]}:</span>
              <span className="truncate ml-2 text-right">
                {et ? et.split("/").pop() : "NONE"}{" "}
                {et && `(${keyInfo.offsets[i].real}, ${keyInfo.offsets[i].virtual})`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <h5 className="font-semibold text-slate-500">Corners (Terrain):</h5>
        <div className="grid grid-cols-1 gap-x-2 font-mono text-[10px]">
          {keyInfo.ground_types.map((gt, i) => (
            <div
              key={i}
              className={`flex justify-between ${getCornerColor?.(i) ?? "text-slate-300"}`}>
              <span>{CornerNames[i]}:</span>
              <span className="truncate ml-2 text-right">
                {gt ? gt.split("/").pop() : "NONE"} (h:{keyInfo.height[i]})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SlotInspector: React.FC<{
  slot: ARMSlot;
  candidates: CandidateMatch[];
  x: number;
  y: number;
  selectedCandidateIndex: number | null;
  onSelectCandidate: (index: number | null) => void;
}> = ({ slot, candidates, x, y, selectedCandidateIndex, onSelectCandidate }) => {
  const slotKey = TileKey.fromSlot(slot);

  const selectedCandidate =
    selectedCandidateIndex !== null ? candidates[selectedCandidateIndex] : null;

  const candidateKey = React.useMemo(() => {
    if (!selectedCandidate) return null;
    return TileKey.fromTDT(selectedCandidate.tdt as any)
      .flipped(selectedCandidate.flip)
      .rotated(selectedCandidate.rotation);
  }, [selectedCandidate]);

  const getEdgeColor = (side: number) => {
    const et = slotKey.edge_types[side];
    if (!et) return "text-slate-500";
    if (et.includes("WildcardEdge") || et.toLowerCase().includes("wildcard"))
      return "text-purple-400";
    return "text-green-400";
  };

  const getCornerColor = (corner: number) => {
    const gt = slotKey.ground_types[corner];
    if (!gt) return "text-slate-500";
    return "text-yellow-400";
  };

  return (
    <div className="mt-4 rounded-md border border-slate-700 bg-slate-900 p-4 text-xs text-slate-200">
      <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
        <h3 className="text-sm font-bold">
          Slot Inspector: {x}, {y} ({slot.width}x{slot.height})
        </h3>
        <button
          onClick={() => onSelectCandidate(null)}
          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px]">
          Clear Selection
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <CriteriaList
            keyInfo={slotKey}
            title="Slot Criteria"
            tag={slot.tile_tag}
            getEdgeColor={getEdgeColor}
            getCornerColor={getCornerColor}
          />

          {candidateKey && selectedCandidate && (
            <div className="pt-4 border-t border-slate-700">
              <CriteriaList
                keyInfo={candidateKey}
                title={`Selected: ${selectedCandidate.tile.file.split("/").pop()}`}
                tag={candidateKey.tag}
              />
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-slate-400 mb-1 underline">
            Candidates ({candidates.length})
          </h4>
          <div className="max-h-80 overflow-auto space-y-1 pr-1">
            {candidates.map((c, i) => (
              <div
                key={i}
                onClick={() => onSelectCandidate(i)}
                className={`p-1.5 rounded cursor-pointer border transition-colors ${
                  selectedCandidateIndex === i
                    ? "border-blue-500 bg-blue-900/40"
                    : c.success
                      ? "border-green-900/50 bg-green-900/20 hover:bg-green-900/30"
                      : "border-red-900/50 bg-red-900/20 hover:bg-red-900/30"
                }`}>
                <div className="flex justify-between items-start font-mono text-[10px]">
                  <span className="font-bold truncate max-w-[120px]">
                    {c.tile.file.split("/").pop()}
                  </span>
                  <span className="flex-shrink-0 ml-1">
                    {c.rotation}° {c.flip ? "F" : ""}
                  </span>
                </div>

                {selectedCandidateIndex === i && (
                  <div className="mt-1 pt-1 border-t border-slate-700/50 text-[9px]">
                    {c.success ? (
                      <div className="text-green-400 font-bold uppercase">Matches Slot</div>
                    ) : (
                      <div className="text-red-300 italic whitespace-pre-wrap leading-tight">
                        {c.failureReason}
                      </div>
                    )}
                  </div>
                )}
                {!c.success && selectedCandidateIndex !== i && (
                  <div className="text-[9px] text-red-400/70 truncate italic">
                    {c.failureReason?.split("\n")[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
