import {queryOptions, useSuspenseQuery} from "@tanstack/react-query";
import React, {useMemo} from "react";
import "color-legend-element";
// @ts-ignore
import palette from 'google-palette';
import {Topology} from "types/world_areas";

export const getLayout = (filename: string) =>
    queryOptions({
        queryKey: ['layout', {filename}],
        queryFn: () => fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then(r => r.json()),
    })

export interface Edge {
    from: string,
    to: string,
    path: [number, number][],
    color?: string,
    edge_type: string,
}

const Edge: React.FC<{ graph: any, scale: number } & Edge> = ({
                                                                  graph,
                                                                  from,
                                                                  to,
                                                                  path,
                                                                  scale,
                                                                  edge_type,
                                                                  color = "#80808080"
                                                              }) => {
    const start = graph.nodes[from]
    const end = graph.nodes[to]

    return <>
        <polyline
            points={`${start.x}, ${start.y} ${path.map(([x, y]: any) => `${x}, ${y}`).join(' ')} ${end.x}, ${end.y}`}
            strokeWidth={2 * scale}
            stroke="gray"
            fill="none"
        />
        <polyline
            points={`${start.x}, ${start.y} ${path.map(([x, y]: any) => `${x}, ${y}`).join(' ')} ${end.x}, ${end.y}`}
            strokeWidth={3 * scale}
            stroke={color}
            fill="none"
        >
            {edge_type ? <title>{edge_type}</title> : <></>}
        </polyline>
    </>
}

export const LayoutComponent: React.FC<{ layout: Topology }> = ({layout}) => {
    const graph = useSuspenseQuery(getLayout(layout.file)).data

    const [viewBox, scale, colorMap] = useMemo(() => {
        const names = new Set<string>()
        const min = [Infinity, Infinity], max = [-Infinity, -Infinity]
        for (let {x, y, room} of graph.nodes || []) {
            names.add(room)
            min[0] = Math.min(min[0], x)
            min[1] = Math.min(min[1], y)
            max[0] = Math.max(max[0], x)
            max[1] = Math.max(max[1], y)
        }
        if (min[0] === max[0]) min[0] = 0
        if (min[1] === max[1]) min[1] = 0
        const colors: string[] = [...palette('mpn65', names.size)]
        return [
            `0 0 ${max[0] + min[0]} ${max[1] + min[1]}`,
            (max[0] - min[0]) / 200,
            Object.fromEntries([...names].map(((n, i) => [n, '#' + colors[i]]))),
        ]
    }, [graph.nodes])


    if (!graph.nodes?.length) {
        return <>No data</>
    }

    return <div style={{display: "flex", flexDirection: "row"}}>
        <div style={{maxWidth: "500px", margin: "5px"}}>
            <svg viewBox={viewBox} style={{width: "100%", backgroundColor: "#222"}}>
                {graph.edges.map((edge: Edge) => {
                    return <Edge {...edge} graph={graph} scale={scale} key={`${edge.from}-${edge.to}`}/>;
                })}
                {graph.nodes.map(({x, y, room}: any) =>
                    <circle cx={x} cy={y} r={(room ? 4 : 3) * scale} fill={colorMap[room]}>
                        <title>{room || ""}</title>
                    </circle>
                )}
            </svg>
        </div>
        <div>
            {/* @ts-ignore */}
            <color-legend
                titleText={layout.file}
                scaleType="categorical"
                domain={Object.keys(colorMap).map(k => k || "<unknown>")}
                range={Object.values(colorMap)}
            />
        </div>
    </div>
}
