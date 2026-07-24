"use client"

import { useId, useState } from "react"

export type GpaGrowthPoint = {
  term: string
  cumulativeGpa: number
}

const WIDTH = 640
const HEIGHT = 220
const PAD_LEFT = 34
const PAD_RIGHT = 16
const PAD_TOP = 20
const PAD_BOTTOM = 28

export function GpaGrowthChart({
  points,
  maxPoints,
}: {
  points: GpaGrowthPoint[]
  maxPoints: number
}) {
  const gradientId = useId()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Add graded courses across at least two terms to see your GPA growth over time.
      </p>
    )
  }

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  // y-axis ticks: 0, then nice steps up to maxPoints (e.g. 0/1.25/2.5/3.75/5)
  const tickCount = 4
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => (maxPoints / tickCount) * i)

  const xFor = (i: number) => PAD_LEFT + (plotWidth * i) / (points.length - 1)
  const yFor = (gpa: number) => PAD_TOP + plotHeight - (plotHeight * gpa) / maxPoints

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.cumulativeGpa)}`).join(" ")
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${PAD_TOP + plotHeight} L ${xFor(0)} ${PAD_TOP + plotHeight} Z`

  const last = points[points.length - 1]
  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const xRatio = (e.clientX - rect.left) / rect.width
    const svgX = xRatio * WIDTH
    let nearest = 0
    let nearestDist = Infinity
    points.forEach((_, i) => {
      const dist = Math.abs(xFor(i) - svgX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">GPA growth by term</p>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={`Cumulative GPA growth across ${points.length} terms, ending at ${last.cumulativeGpa.toFixed(2)}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines + y-axis ticks */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}

          {/* x-axis term labels */}
          {points.map((p, i) => (
            <text
              key={p.term}
              x={xFor(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {p.term.length > 12 ? `${p.term.slice(0, 11)}…` : p.term}
            </text>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* crosshair */}
          {hovered && (
            <line
              x1={xFor(hoverIndex!)}
              x2={xFor(hoverIndex!)}
              y1={PAD_TOP}
              y2={PAD_TOP + plotHeight}
              stroke="var(--border)"
              strokeWidth={1}
            />
          )}

          {/* end-point marker + direct label (value at the end, per spec) */}
          <circle
            cx={xFor(points.length - 1)}
            cy={yFor(last.cumulativeGpa)}
            r={5}
            fill="var(--chart-1)"
            stroke="var(--card)"
            strokeWidth={2}
          />
          <text
            x={xFor(points.length - 1)}
            y={yFor(last.cumulativeGpa) - 10}
            textAnchor="end"
            className="fill-foreground text-xs font-medium tabular-nums"
          >
            {last.cumulativeGpa.toFixed(2)}
          </text>

          {/* hover marker */}
          {hovered && (
            <circle
              cx={xFor(hoverIndex!)}
              cy={yFor(hovered.cumulativeGpa)}
              r={5}
              fill="var(--chart-1)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md"
            style={{
              left: `${(xFor(hoverIndex!) / WIDTH) * 100}%`,
              top: `${(yFor(hovered.cumulativeGpa) / HEIGHT) * 100}%`,
            }}
          >
            <p className="font-medium tabular-nums">{hovered.cumulativeGpa.toFixed(2)} GPA</p>
            <p className="text-muted-foreground">{hovered.term}</p>
          </div>
        )}
      </div>
    </div>
  )
}
