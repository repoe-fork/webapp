export const UNTAGGED_NODE = "<unknown>";

export function roomKey(room: string, strings?: string[]) {
  return strings?.length ? `${room} "${strings.join('" "')}"` : room;
}

export function processGraph(nodes: any[]) {
  const names: Record<string, string[]> = {};
  const min = [Infinity, Infinity],
    max = [-Infinity, -Infinity];
  for (let { x, y, room, strings } of nodes || []) {
    names[roomKey(room, strings)] = strings;
    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
  }
  if (min[0] === max[0]) {
    min[0] = 0;
    max[0] = max[0] * 2;
  }
  if (min[1] === max[1]) {
    min[1] = 0;
    max[1] = max[1] * 2;
  }
  return [`0 0 ${max[0] + min[0]} ${max[1] + min[1]}`, (max[0] - min[0]) / 200, names] as const;
}
