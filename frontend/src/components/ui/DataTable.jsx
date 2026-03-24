import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './table';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingScreen from '../LoadingScreen';

// --- ITEMS PER PAGE DROPDOWN ---
const ItemsPerPageDropdown = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState(null);
    const dropdownRef = useRef(null);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const updatePosition = () => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setCoords({
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                width: rect.width, // FIX: Force exact width of the button (approx 68px)
            });
        }
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                const portal = document.getElementById('items-per-page-portal');
                if (portal && !portal.contains(event.target)) {
                    setIsOpen(false);
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    const modalContent = coords && (
        <div
            id="items-per-page-portal"
            style={{
                position: 'fixed',
                bottom: `${coords.bottom + 2}px`,
                left: `${coords.left}px`,
                minWidth: `80px`,
                zIndex: 99999,
            }}
            className={cn(
                "p-1 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200",
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-100 text-zinc-700 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]"
            )}
        >
            <div className="flex flex-col gap-0.5">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            "w-full text-left px-3 py-1.5 text-[13px] transition-all rounded-lg",
                            value === option.value
                                ? (isDark ? "bg-zinc-800 text-white font-semibold" : "bg-zinc-300 text-black font-bold")
                                : (isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-zinc-500 hover:bg-zinc-200/50 hover:text-black")
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                onClick={toggleDropdown}
                className={cn(
                    "h-8 px-2.5 flex items-center justify-between gap-2 border rounded-lg text-[13px] font-medium transition-all w-[72px]",
                    isDark
                        ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 active:scale-95"
                        : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700 active:scale-95 shadow-sm"
                )}
            >
                <span>{value}</span>
                <div className={cn(
                    "transition-transform duration-200",
                    isOpen ? "rotate-180" : "rotate-0 text-zinc-400"
                )}>
                    <ChevronDown className="w-3.5 h-3.5" />
                </div>
            </button>
            {isOpen && createPortal(modalContent, document.body)}
        </div>
    );
};

// --- SCROLLBAR STYLES (Scoped to DataTable) ---
const ScrollbarStyles = ({ isDark }) => (
    <style dangerouslySetInnerHTML={{ __html: `
        .dt-custom-scrollbar::-webkit-scrollbar {
            height: 6px;
            width: 6px;
        }
        .dt-custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .dt-custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${isDark ? '#3f3f46' : '#d4d4d8'};
            border-radius: 20px;
        }
        .dt-custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${isDark ? '#52525b' : '#a1a1aa'};
        }
        /* Firefox */
        .dt-custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: ${isDark ? '#3f3f46' : '#a1a1aa'} transparent;
        }
    `}} />
);

// --- MAIN DATATABLE COMPONENT ---
const DataTable = ({
    columns,
    data,
    loading,
    onRowClick,
    className,
    emptyState,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
    showShadow = false,
    shadowWidth = "w-5",
    stickyHeader = true,
}) => {
    const [goToPageInput, setGoToPageInput] = useState('');
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // SCROLL TRACKING
    const tableRef = useRef(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    const checkScroll = useCallback(() => {
        // FIX: Grab the actual scrolling wrapper created by shadcn/ui
        const scrollNode = tableRef.current?.parentElement;
        if (!scrollNode) return;

        const { scrollLeft, clientWidth, scrollWidth } = scrollNode;
        const tolerance = 2; // small buffer for high DPI screens

        setShowLeftShadow(scrollLeft > tolerance);
        setShowRightShadow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - tolerance);
    }, []);

    useEffect(() => {
        const scrollNode = tableRef.current?.parentElement;
        if (!scrollNode) return;

        // Add specialized scrollbar class to the scrolling wrapper
        scrollNode.classList.add('dt-custom-scrollbar');

        const deferredCheck = () => requestAnimationFrame(checkScroll);
        deferredCheck(); // Initial check after paint

        const resizeObserver = new ResizeObserver(deferredCheck);
        resizeObserver.observe(scrollNode);

        // Attach listeners directly to the true scrolling element
        scrollNode.addEventListener('scroll', deferredCheck);
        window.addEventListener('resize', deferredCheck);

        return () => {
            resizeObserver.disconnect();
            scrollNode.removeEventListener('scroll', deferredCheck);
            window.removeEventListener('resize', deferredCheck);
        };
    }, [data, loading, checkScroll]);

    const handleGoToPage = () => {
        const pageNum = parseInt(goToPageInput);
        if (pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
            setGoToPageInput('');
        }
    };

    const itemsPerPageOptions = [
        { label: '10', value: 10 },
        { label: '20', value: 20 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
        { label: '200', value: 200 }
    ];

    const showPagination = onPageChange && totalPages !== undefined;

    // --- SMART STICKY COLUMN PROCESSING ---
    const processedColumns = (() => {
        const leftSticky = columns.filter(c => c.sticky === 'left');
        const normal = columns.filter(c => !c.sticky || (c.sticky !== 'left' && c.sticky !== 'right'));
        const rightSticky = columns.filter(c => c.sticky === 'right');

        // Function to extract width from className or direct properties
        const getColWidth = (c) => {
            if (c.id === 'selection' || c.className?.includes('w-[50px]')) return 50;
            // Check for w-[XXXpx] in className
            const match = c.className?.match(/w-\[(\d+)px\]/);
            if (match) return parseInt(match[1]);
            // Check for min-w-[XXXpx] in className
            const minMatch = c.className?.match(/min-w-\[(\d+)px\]/);
            if (minMatch) return parseInt(minMatch[1]);
            // Default widths
            return 150;
        };

        const result = [];
        
        // 1. Process Left Sticky
        let leftOffset = 0;
        leftSticky.forEach(c => {
            result.push({ ...c, stickyOffset: leftOffset });
            leftOffset += getColWidth(c);
        });

        // 2. Process Normal
        normal.forEach(c => result.push(c));

        // 3. Process Right Sticky
        let rightOffset = 0;
        [...rightSticky].reverse().forEach(c => {
            result.push({ ...c, stickyOffset: rightOffset });
            rightOffset += getColWidth(c);
        });

        return result;
    })();

    return (
        <div className={cn("relative border border-border rounded-lg bg-card flex flex-col shadow-sm overflow-hidden", className)}>
            <ScrollbarStyles isDark={isDark} />

            {/* FLOATING OVERLAY SHADOWS */}
            {showShadow && (
                <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden rounded-lg">
                    <div
                        style={{ background: isDark ? 'linear-gradient(to right, rgba(0,0,0,0.85), transparent)' : 'linear-gradient(to right, rgba(0,0,0,0.12), transparent)' }}
                        className={cn(
                            "absolute top-0 left-0 bottom-0 transition-opacity duration-200",
                            shadowWidth,
                            showLeftShadow ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div
                        style={{ background: isDark ? 'linear-gradient(to left, rgba(0,0,0,0.85), transparent)' : 'linear-gradient(to left, rgba(0,0,0,0.12), transparent)' }}
                        className={cn(
                            "absolute top-0 right-0 bottom-0 transition-opacity duration-200",
                            shadowWidth,
                            showRightShadow ? "opacity-100" : "opacity-0"
                        )}
                    />
                </div>
            )}

            {/* MAIN TABLE AREA */}
            <div className="flex-1 w-full min-w-0 bg-card">
                <Table ref={tableRef} className="min-w-max w-full border-separate border-spacing-0">
                    <TableHeader className={cn(stickyHeader && "sticky top-0 z-30")}>
                        <TableRow className={cn("bg-card", isDark ? "hover:bg-transparent" : "bg-gray-50/50 hover:bg-gray-50/50")}>
                            {processedColumns.map((column, index) => (
                                <TableHead
                                    key={column.id || index}
                                    style={{
                                        left: column.sticky === 'left' ? (column.stickyOffset || 0) : undefined,
                                        right: column.sticky === 'right' ? (column.stickyOffset || 0) : undefined,
                                    }}
                                    className={cn(
                                        "px-4 py-3.5 text-[13px] font-medium text-muted-foreground border-b border-border whitespace-nowrap",
                                        column.sticky === 'left' && "sticky z-40 bg-card shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#27272a]",
                                        column.sticky === 'right' && "sticky z-40 bg-card shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#27272a]",
                                        column.className
                                    )}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="p-0 border-none">
                                    <LoadingScreen className="min-h-[200px]" />
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="px-4 py-16 text-center text-muted-foreground text-sm border-none">
                                    {emptyState || "No results found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow
                                    key={row.id || rowIndex}
                                    className={cn("group transition-colors hover:bg-muted/40", onRowClick && "cursor-pointer")}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {processedColumns.map((column, colIndex) => (
                                        <TableCell
                                            key={column.id || colIndex}
                                            style={{
                                                left: column.sticky === 'left' ? (column.stickyOffset || 0) : undefined,
                                                right: column.sticky === 'right' ? (column.stickyOffset || 0) : undefined,
                                            }}
                                            className={cn(
                                                "px-4 py-3 align-middle text-[13px] text-foreground whitespace-nowrap",
                                                // Only add border-b if it is NOT the last row
                                                rowIndex !== data.length - 1 && "border-b border-border",
                                                column.sticky === 'left' && "sticky z-20 bg-card group-hover:bg-muted font-medium shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#27272a]",
                                                column.sticky === 'right' && "sticky z-20 bg-card group-hover:bg-muted font-medium shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#27272a]",
                                                column.cellClassName
                                            )}
                                        >
                                            {column.cell ? column.cell({ row }) : (row[column.accessorKey] ?? "-")}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION FOOTER */}
            {showPagination && (
                <div className="px-4 py-3 border-t border-border bg-card flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] text-muted-foreground">Items per page:</span>
                        {onItemsPerPageChange ? (
                            <ItemsPerPageDropdown
                                value={itemsPerPage}
                                onChange={onItemsPerPageChange}
                                options={itemsPerPageOptions}
                            />
                        ) : (
                            <span className="text-[13px] font-medium">{itemsPerPage}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-muted-foreground">Go to page:</span>
                             <input
                                type="text"
                                value={goToPageInput}
                                onChange={(e) => setGoToPageInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                                disabled={totalPages <= 1}
                                className={cn(
                                    "w-[44px] h-8 px-2 text-[13px] text-center border rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500",
                                    isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600" : "bg-white border-gray-200 text-gray-700 placeholder:text-gray-300",
                                    totalPages <= 1 && "opacity-50 cursor-not-allowed bg-muted/20"
                                )}
                            />
                            <button
                                onClick={handleGoToPage}
                                disabled={totalPages <= 1}
                                className={cn(
                                    "h-8 px-3 text-[13px] border rounded transition-colors font-medium",
                                    isDark ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "bg-white border-zinc-200 hover:bg-gray-50 text-gray-600",
                                    totalPages <= 1 && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                Go
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-1 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className={cn(
                                "min-w-[28px] h-7 px-2 flex items-center justify-center rounded text-[13px] font-bold transition-all shadow-sm",
                                "bg-blue-500 text-white"
                            )}>
                                {currentPage}
                            </div>
                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-1 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;