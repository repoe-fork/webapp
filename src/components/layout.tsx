import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Layout } from "../routes/areas";

export const getLayout = (filename: string) =>
    queryOptions({
        queryKey: ['layout', { filename }],
        queryFn: () => fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then(r => r.json()),
    })

export const LayoutComponent: React.FC<{ layout: Layout }> = ({ layout }) => {
    const graph = useSuspenseQuery(getLayout(layout.file)).data

    const [viewbox, scale] = useMemo(() => {
        const min = [Infinity, Infinity], max = [-Infinity, -Infinity]
        for (let { x, y } of graph.nodes || []) {
            min[0] = Math.min(min[0], x)
            min[1] = Math.min(min[1], y)
            max[0] = Math.max(max[0], x)
            max[1] = Math.max(max[1], y)
        }
        if (min[0] === max[0]) min[0] = 0
        if (min[1] === max[1]) min[1] = 0
        return [`0 0 ${max[0] + min[0]} ${max[1] + min[1]}`, (max[0] - min[0]) / 200]
    }, [graph.nodes])

    if (!graph.nodes?.length) {
        return <>No data</>
    }

    return <div style={{ maxWidth: "500px" }}>
        <svg viewBox={viewbox} style={{ width: "100%", border: "1px solid blue" }}>
            {graph.edges.map(({ from, to, path, unknown }: any) => {
                const start = graph.nodes[from]
                const end = graph.nodes[to]

                return <polyline
                    points={`${start.x}, ${start.y} ${path.map(([x, y]: any) => `${x}, ${y}`).join(' ')} ${end.x}, ${end.y}`}
                    strokeWidth={3 * scale}
                    stroke="purple"
                    strokeOpacity={0.6}
                    fill="none"
                >
                    <title>{unknown?.find((v: any) => typeof v === 'string') || ""}</title>
                </polyline>
            })}
            {graph.nodes.map(({ x, y, room }: any) =>
                <circle cx={x} cy={y} r={(room ? 4 : 3) * scale} fill={room ? "green" : "lightblue"}>
                    <title>{room || ""}</title>
                </circle>
            )}
        </svg>
    </div>
}
