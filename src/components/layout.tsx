import {queryOptions, useSuspenseQuery} from "@tanstack/react-query";
import React, {useMemo} from "react";
import {Layout} from "../routes/areas";
//@ts-ignore
import palette from 'google-palette'
import "color-legend-element";

export interface IntrinsicElements {
    "color-legend": any;
}

export const getLayout = (filename: string) =>
    queryOptions({
        queryKey: ['layout', {filename}],
        queryFn: () => fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then(r => r.json()),
    })

export const LayoutComponent: React.FC<{ layout: Layout }> = ({layout}) => {
    const graph = useSuspenseQuery(getLayout(layout.file)).data

    const [viewbox, scale, colorMap] = useMemo(() => {
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
            Object.fromEntries([...names].sort().map(((n, i) => [n, '#' + colors[i]]))),
        ]
    }, [graph.nodes])


    if (!graph.nodes?.length) {
        return <>No data</>
    }

    // @ts-ignore
    // @ts-ignore
    return <div>
        <div style={{maxWidth: "500px"}}>
            <svg viewBox={viewbox} style={{width: "100%", border: "1px solid blue"}}>
                {graph.edges.map(({from, to, path, unknown}: any) => {
                    const start = graph.nodes[from]
                    const end = graph.nodes[to]

                    return <polyline
                        points={`${start.x}, ${start.y} ${path.map(([x, y]: any) => `${x}, ${y}`).join(' ')} ${end.x}, ${end.y}`}
                        strokeWidth={3 * scale}
                        stroke="gray"
                        strokeOpacity={0.6}
                        fill="none"
                    >
                        <title>{unknown?.find((v: any) => typeof v === 'string') || ""}</title>
                    </polyline>
                })}
                {graph.nodes.map(({x, y, room}: any) =>
                    <circle cx={x} cy={y} r={(room ? 4 : 3) * scale} fill={colorMap[room]}>
                        <title>{room || ""}</title>
                    </circle>
                )}
            </svg>
        </div>
        <div style={{float: "left", "--cle-columns": 1}}>
            <color-legend
                titleText={layout.file}
                scaleType="categorical"
                domain={Object.keys(colorMap)}
                range={Object.values(colorMap)}
            >
            </color-legend>
        </div>
    </div>
}
