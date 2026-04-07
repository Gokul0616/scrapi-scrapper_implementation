import React, { useState, useRef, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// ─────────────────────────────────────────────────
// Service colour + stripe definitions  (Scrapi palette)
// ─────────────────────────────────────────────────
export const SERVICE_THEMES = {
    'Actor compute units': { color: '#10b981', pattern: false },
    'Proxy SERPs': { color: '#f97316', pattern: false },
    'Proxy residential data transfer': { color: '#fb923c', pattern: false },
    'Data transfer internal': { color: '#7c3aed', pattern: true },
    'Data transfer external': { color: '#9333ea', pattern: false },
    'Dataset timed storage': { color: '#06b6d4', pattern: false },
    'Dataset reads': { color: '#22d3ee', pattern: true },
    'Dataset writes': { color: '#0e7490', pattern: false },
    'Key-value store timed storage': { color: '#ef4444', pattern: false },
    'Key-value store reads': { color: '#f87171', pattern: true },
    'Key-value store writes': { color: '#991b1b', pattern: false },
    'Key-value store lists': { color: '#7f1d1d', pattern: false },
    'Request queue timed storage': { color: '#6366f1', pattern: false },
    'Request queue reads': { color: '#a5b4fc', pattern: true },
    'Request queue writes': { color: '#3730a3', pattern: false },
    'Paid Actors (monthly rental)': { color: '#f59e0b', pattern: false },
    'Actors - paid for results': { color: '#84cc16', pattern: true },
    'Actors - paid for events': { color: '#ec4899', pattern: true },
};

/** Safe slug for SVG pattern IDs */
const pid = (key) => `stripe-${key.replace(/[\s()/-]+/g, '-').toLowerCase()}`;

// ─────────────────────────────────────────────────
// Tooltip – responsive to light/dark themes, strict bounds
// ─────────────────────────────────────────────────
const HistoricalUsageTooltip = ({ active, payload, label, coordinate, viewBox }) => {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((s, e) => s + (e.value || 0), 0);
    const rows = payload.filter(e => (e.value || 0) > 0);

    if (rows.length === 0) return null;

    // Use Recharts' native coordinate & viewBox to know exactly where the mouse is
    const isRightSide = coordinate?.x > ((viewBox?.width || 800) / 2);
    const isBottomSide = coordinate?.y > ((viewBox?.height || 400) / 2);

    const xTrans = isRightSide ? 'calc(-100% - 16px)' : '16px';
    const yTrans = isBottomSide ? 'calc(-100% - 16px)' : '16px';

    return (
        <div style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'hsl(var(--foreground))',
            zIndex: 99999,
            pointerEvents: 'none',
            maxWidth: 480,
            minWidth: 360,
            // Dynamically flip side based on cursor position using CSS!
            transform: `translate(${xTrans}, ${yTrans})`,
            transition: 'transform 0.1s ease-out'
        }}>
            {/* Header row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 700,
                fontSize: 14,
                borderBottom: '1px solid hsl(var(--border))',
                paddingBottom: 8,
                marginBottom: 10,
                gap: 24,
            }}>
                <span>{label} UTC</span>
                <span>${total.toFixed(5)}</span>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                    <tr style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 600, paddingRight: 12, whiteSpace: 'nowrap' }}>Service</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6, fontWeight: 600, paddingRight: 12, whiteSpace: 'nowrap' }}>Price per unit</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6, fontWeight: 600, paddingRight: 12, whiteSpace: 'nowrap' }}>Units</th>
                        <th style={{ textAlign: 'right', paddingBottom: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((entry, i) => {
                        const theme = SERVICE_THEMES[entry.dataKey] || { color: '#9ca3af', pattern: false };
                        return (
                            <tr key={i}>
                                <td style={{ paddingBottom: 5, paddingRight: 12, whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <svg width="11" height="11" viewBox="0 0 11 11" style={{ flexShrink: 0 }}>
                                            <circle cx="5.5" cy="5.5" r="5.5"
                                                fill={theme.pattern ? `url(#${pid(entry.dataKey)})` : theme.color} />
                                        </svg>
                                        <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>{entry.dataKey}</span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right', paddingBottom: 5, paddingRight: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>
                                    Custom pricing
                                </td>
                                <td style={{ textAlign: 'right', paddingBottom: 5, paddingRight: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>
                                    -
                                </td>
                                <td style={{ textAlign: 'right', paddingBottom: 5, fontWeight: 600, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap' }}>
                                    ${entry.value.toFixed(5)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─────────────────────────────────────────────────
// Custom X-axis tick – always renders, always angled at -45°
// Recharts won't hide it because we handle the rendering ourselves.
// ─────────────────────────────────────────────────
const AngledTick = ({ x, y, payload, visibleTicksCount, index }) => {
    // visibleTicksCount = total number of ticks that recharts is rendering
    // We always show the tick – rotation at -45° prevents overlap.
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={0}
                textAnchor="end"
                transform="rotate(-45)"
                fontSize={10}
                fill="#9ca3af"
            >
                {payload.value}
            </text>
        </g>
    );
};

// ─────────────────────────────────────────────────
// Nice Y-axis ticks: aim for 6–8 steps on round numbers
// ─────────────────────────────────────────────────
function niceYTicks(maxVal) {
    if (!maxVal || maxVal === 0) return [0, 0.20, 0.40, 0.60, 0.80, 1.00];

    const targets = [0.01, 0.02, 0.05, 0.10, 0.20, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100, 200, 500];
    // pick the smallest step that gives ≤ 9 ticks
    const step = targets.find(s => Math.ceil(maxVal / s) <= 8) || targets[targets.length - 1];
    const niceMax = Math.ceil(maxVal / step) * step;
    const ticks = [];
    for (let v = 0; v <= niceMax + 1e-9; v = parseFloat((v + step).toFixed(10))) {
        ticks.push(parseFloat(v.toFixed(10)));
    }
    return ticks;
}

// ─────────────────────────────────────────────────
// Main chart component
// ─────────────────────────────────────────────────
const CustomBarChart = ({ data, timeAgg }) => {
    // Track container width to compute how many date labels fit
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(800);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const formattedData = data.map(item => ({
        ...item,
        formattedDate: timeAgg === 'Monthly' ? item.date.slice(0, 7) : item.date,
    }));

    const maxVal = formattedData.reduce((mx, d) => {
        const sum = Object.keys(SERVICE_THEMES).reduce((s, k) => s + (d[k] || 0), 0);
        return Math.max(mx, sum);
    }, 0);

    const yTicks = niceYTicks(maxVal);
    const yDomain = [0, yTicks[yTicks.length - 1]];

    // Dynamically compute interval based on available width.
    // Each angled label needs ~30px horizontal space for readability.
    // Skip every Nth date so labels never overlap.
    const numBars = formattedData.length || 1;
    const pxPerBar = (containerWidth - 70) / numBars; // ~70px for Y-axis
    const minPxPerLabel = 30; // scales smoothly as screen grows/shrinks
    const xInterval = timeAgg === 'Monthly'
        ? 0
        : Math.max(0, Math.ceil(minPxPerLabel / pxPerBar) - 1);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={formattedData}
                    margin={{ top: 2, right: 5, left: 5, bottom: 30 }}
                    barCategoryGap="20%"
                    barSize={timeAgg === 'Monthly' ? 60 : undefined}
                >
                    {/* ── SVG stripe patterns ─────────────────── */}
                    <defs>
                        {Object.entries(SERVICE_THEMES).filter(([, t]) => t.pattern).map(([key, t]) => (
                            <pattern
                                key={key}
                                id={pid(key)}
                                patternUnits="userSpaceOnUse"
                                width="6"
                                height="6"
                                patternTransform="rotate(45)"
                            >
                                <rect width="6" height="6" fill="white" opacity="0.55" />
                                <rect width="3" height="6" fill={t.color} />
                            </pattern>
                        ))}
                    </defs>

                    {/* ── Grid: horizontal + vertical per-column lines ── */}
                    <CartesianGrid
                        strokeDasharray=""
                        horizontal={true}
                        vertical={true}
                        stroke="#e5e7eb"
                        strokeOpacity={0.9}
                    />

                    {/* ── X Axis: show ALL dates, angled ── */}
                    <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        interval={xInterval}
                        tick={<AngledTick />}
                        height={35}
                    />

                    {/* ── Y Axis ── */}
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        ticks={yTicks}
                        domain={yDomain}
                        tickFormatter={(v) => `$${v % 1 === 0 ? v.toFixed(2) : v < 0.1 ? v.toFixed(3) : v.toFixed(2)}`}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        width={58}
                    />

                    {/* ── Tooltip ── */}
                    <Tooltip
                        content={<HistoricalUsageTooltip />}
                        cursor={{ fill: 'rgba(100, 116, 139, 0.08)' }}
                        wrapperStyle={{ zIndex: 99999, outline: 'none' }}
                        isAnimationActive={false}
                        allowEscapeViewBox={{ x: true, y: true }}
                    />

                    {/* ── Bars (stacked) ── */}
                    {Object.entries(SERVICE_THEMES).map(([key, theme]) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="a"
                            fill={theme.pattern ? `url(#${pid(key)})` : theme.color}
                            isAnimationActive={false}
                            radius={0}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CustomBarChart;
