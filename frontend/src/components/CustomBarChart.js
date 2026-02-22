import React, { useState } from 'react';

const CustomBarChart = ({ data, timeAgg }) => {
    const maxVal = Math.max(...data.map(d => d['Actor compute units'] || 0), 0);
    const yMax = maxVal > 0 ? maxVal * 1.2 : 10;
    const yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * (4 - i));
    const [hoveredData, setHoveredData] = useState(null);

    return (
        <div className="relative w-full h-full min-h-[320px] flex flex-col pt-4 pb-6">
            <div className="flex-1 flex relative ml-10 mb-12 mt-4">
                {/* Y Axis */}
                <div className="absolute left-[-40px] top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-muted-foreground items-end">
                    {yTicks.map((tick, i) => (
                        <span key={i} className="leading-none transform -translate-y-1/2">${tick.toFixed(2)}</span>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {yTicks.map((_, i) => (
                        <div key={i} className="w-full h-px border-t border-dashed border-border/60"></div>
                    ))}
                </div>

                {/* Bars */}
                <div className={`absolute inset-0 flex items-end px-1 gap-[2px] sm:gap-1 ${timeAgg === 'Monthly' ? 'justify-center mx-auto max-w-xl' : 'justify-around'}`}>
                    {data.map((item, idx) => {
                        const val = item['Actor compute units'] || 0;
                        const heightPct = yMax > 0 ? (val / yMax) * 100 : 0;
                        const dateLabel = timeAgg === 'Monthly' ? item.date.split('-').slice(0, 2).join('-') : item.date;

                        return (
                            <div
                                key={idx}
                                className={`relative flex items-end justify-center h-full group ${timeAgg === 'Monthly' ? 'w-24 flex-none' : 'flex-1'}`}
                                onMouseEnter={() => setHoveredData(item)}
                                onMouseLeave={() => setHoveredData(null)}
                            >
                                <div
                                    className={`w-full bg-blue-500 rounded-t-sm transition-all duration-300 relative overflow-hidden group-hover:brightness-110 ${timeAgg === 'Monthly' ? 'max-w-[80px]' : 'max-w-[40px]'}`}
                                    style={{ height: `${heightPct}%`, minHeight: heightPct > 0 ? '2px' : '0' }}
                                >
                                </div>
                                {/* X Axis Label (Angled) */}
                                <div className={`absolute text-[9px] text-muted-foreground whitespace-nowrap z-10 ${timeAgg === 'Monthly' ? '-bottom-6 left-1/2 -translate-x-1/2' : '-bottom-8 left-1/2 transform -translate-x-1/2 -rotate-45 origin-top-right w-20 text-right pr-2'}`}>
                                    {timeAgg === 'Monthly' ? dateLabel : (idx % Math.ceil(data.length / 7) === 0 ? dateLabel : '')}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tooltip strictly following mouse/bar */}
                {hoveredData && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[11px] py-1 px-2.5 rounded shadow flex gap-2 items-center z-20 whitespace-nowrap pointer-events-none">
                        <span className="font-semibold text-blue-400">${(hoveredData['Actor compute units'] || 0).toFixed(2)}</span>
                        <span className="text-gray-300">{hoveredData.date}</span>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="absolute right-0 -top-2 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-card/80 px-2 py-1 rounded">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-[2px] overflow-hidden relative"></div>
                <span>Actor compute units</span>
            </div>
        </div>
    );
};

export default CustomBarChart;
