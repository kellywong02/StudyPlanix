"use client"

import { useState } from "react"

import type { DailyMinutes } from "@/lib/study-analytics"

const WIDTH = 640
const HEIGHT = 200
const PAD_LEFT = 30
const PAD_RIGHT = 8
const PAD_TOP = 12
const PAD_BOTTOM = 24
const BAR_MAX_WIDTH = 24

function formatDayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "narrow" })
}

export function StudyTimeChart({ days }: { days: DailyMinutes[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const maxMinutes = Math.max(1, ...days.map((d) => d.minutes))
  // round the axis ceiling up to a clean step (nearest 30 min)
  const axisMax = Math.max(30, Math.ceil(maxMinutes / 30) * 30)

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = plotWidth / days.length
  const barWidth = Math.min(BAR_MAX_WIDTH, slot * 0.6)

  const yFor = (minutes: number) => PAD_TOP + plotHeight - (plotHeight * minutes) / axisMax

  const yTicks = [0, axisMax / 2, axisMax]
  const hovered = hoverIndex !== null ? days[hoverIndex] : null

  if (days.every((d) => d.minutes === 0)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No study time logged in this period yet — start a Pomodoro session to see it here.
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">Study time by day</p>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={`Daily study minutes over the last ${days.length} days`}
          className="overflow-visible"
        >
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
                x={PAD_LEFT - 6}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {tick}
              </text>
            </g>
          ))}

          {days.map((d, i) => {
            const x = PAD_LEFT + slot * i + (slot - barWidth) / 2
            const barTop = yFor(d.minutes)
            const barHeight = PAD_TOP + plotHeight - barTop
            return (
              <g
                key={d.date}
                onPointerEnter={() => setHoverIndex(i)}
                onPointerLeave={() => setHoverIndex((h) => (h === i ? null : h))}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex((h) => (h === i ? null : h))}
                tabIndex={0}
                role="button"
                aria-label={`${d.date}: ${d.minutes} minutes`}
              >
                {/* generous invisible hit target, wider than the visible bar */}
                <rect x={PAD_LEFT + slot * i} y={PAD_TOP} width={slot} height={plotHeight} fill="transparent" />
                <rect
                  x={x}
                  y={d.minutes > 0 ? barTop : barTop - 2}
                  width={barWidth}
                  height={Math.max(d.minutes > 0 ? barHeight : 0, d.minutes > 0 ? 4 : 0)}
                  rx={4}
                  fill="var(--chart-1)"
                  opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.55}
                />
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatDayLabel(d.date)}
                </text>
              </g>
            )
          })}
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md"
            style={{
              left: `${((PAD_LEFT + slot * hoverIndex + slot / 2) / WIDTH) * 100}%`,
              top: `${(yFor(hovered.minutes) / HEIGHT) * 100}%`,
            }}
          >
            <p className="font-medium tabular-nums">{hovered.minutes} min</p>
            <p className="text-muted-foreground">{hovered.date}</p>
          </div>
        )}
      </div>
    </div>
  )
}
