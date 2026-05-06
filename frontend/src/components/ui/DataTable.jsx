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
                minWidth: `70px`,
                zIndex: 99999,
            }}
            className={cn(
                "p-1 rounded-lg border select-none",
                isDark ? "bg-zinc-900 border-zinc-700 text-zinc-300" : "bg-white border-zinc-300 text-zinc-700"
            )}
        >
            <div className="flex flex-col gap-0.5">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            "w-full text-left px-3 py-1.5 text-[13px] font-semibold transition-all rounded-lg",
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
                    "h-8 px-2.5 flex items-center justify-between font-bold gap-2 border rounded-lg text-[13px] font-medium transition-all select-none",
                    isDark
                        ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
                        : "bg-white border-zinc-300 hover:border-zinc-400 text-zinc-700 shadow-sm active:scale-95"
                )}
            >
                <span className='font-bold'>{value}</span>
                <div className={cn(
                    "transition-transform duration-200 text-zinc-700 dark:text-zinc-400",
                    isOpen ? "rotate-180" : "rotate-0"
                )}>
                    <ChevronDown className="w-4 h-4" strokeWidth={3} />
                </div>
            </button>
            {isOpen && createPortal(modalContent, document.body)}
        </div>
    );
};

// --- SCROLLBAR STYLES (Scoped to DataTable) ---
const ScrollbarStyles = ({ isDark }) => (
    <style dangerouslySetInnerHTML={{
        __html: `
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
// --- PAGINATION RANGE HELPER ---
const getPaginationRange = (currentPage, totalPages, siblings = 1) => {
    const totalPageNumbers = siblings * 2 + 5;
    if (totalPages <= totalPageNumbers) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const leftSiblingIndex = Math.max(currentPage - siblings, 1);
    const rightSiblingIndex = Math.min(currentPage + siblings, totalPages);
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;
    if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblings;
        return [...Array.from({ length: leftItemCount }, (_, i) => i + 1), '...', totalPages];
    }
    if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblings;
        return [1, '...', ...Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1)];
    }
    return [1, '...', ...Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => i + leftSiblingIndex), '...', totalPages];
};

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
    shadowWidth = "w-[5px]",
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
        { label: '5', value: 5 },
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

            {showShadow && (
                <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden rounded-lg">
                    <div
                        style={{
                            background: isDark
                                ? 'linear-gradient(to right, rgba(0,0,0,1), transparent)'
                                : 'linear-gradient(to right, rgba(0,0,0,0.4), transparent)'
                        }}
                        className={cn(
                            "absolute top-0 left-0 bottom-0 transition-opacity duration-200",
                            shadowWidth,
                            showLeftShadow ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div
                        style={{
                            background: isDark
                                ? 'linear-gradient(to left, rgba(0,0,0,1), transparent)'
                                : 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)'
                        }}
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
                    <TableHeader className={cn("select-none", stickyHeader && "sticky top-0 z-30")}>
                        <TableRow className={cn(isDark ? "hover:bg-transparent" : "hover:bg-zinc-100")}>
                            {processedColumns.map((column, index) => (
                                <TableHead
                                    key={column.id || index}
                                    style={{
                                        left: column.sticky === 'left' ? (column.stickyOffset || 0) : undefined,
                                        right: column.sticky === 'right' ? (column.stickyOffset || 0) : undefined,
                                    }}
                                    className={cn(
                                        "px-4 py-2.5 text-[13px] font-semibold text-foreground border-b border-border bg-zinc-200 dark:bg-zinc-900",
                                        column.sticky === 'left' && "sticky z-40 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#27272a]",
                                        column.sticky === 'right' && "sticky z-40 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#27272a]",
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
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={columns.length} className="p-0 border-none">
                                    <LoadingScreen className="p-5" />
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground text-sm border-none">
                                    {emptyState || "No results found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow
                                    key={row.id || rowIndex}
                                    className={cn("group transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30", onRowClick && "cursor-pointer")}
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
                                                "px-4 py-3 align-middle text-[13px] text-foreground",
                                                // Only add border-b if it is NOT the last row
                                                rowIndex !== data.length - 1 && "border-b border-border",
                                                column.sticky === 'left' && "sticky z-20 bg-card group-hover:bg-zinc-200/50 dark:group-hover:bg-zinc-800/30 font-medium shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#27272a]",
                                                column.sticky === 'right' && "sticky z-20 bg-card group-hover:bg-zinc-200/50 dark:group-hover:bg-zinc-800/30 font-medium shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#27272a]",
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
                <div className="px-4 py-1.5 border-t border-border bg-zinc-200 dark:bg-zinc-900 flex items-center justify-between relative z-10 select-none">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] text-muted-foreground font-bold">Items per page:</span>
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
                            <span className="text-[13px] font-bold text-muted-foreground">Go to page:</span>
                            <input
                                type="text"
                                value={goToPageInput}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val === '') {
                                        setGoToPageInput('');
                                        return;
                                    }
                                    const num = parseInt(val);
                                    if (num > totalPages) {
                                        setGoToPageInput(String(totalPages));
                                    } else {
                                        setGoToPageInput(val);
                                    }
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                                disabled={totalPages <= 1}
                                className={cn(
                                    "w-[44px] h-8 px-2 text-[13px] text-center border rounded-lg transition-colors font-bold focus:outline-none focus:ring-1 focus:ring-blue-500",
                                    isDark ? "bg-zinc-800 border-zinc-700 text-zinc-200" : "bg-white border-zinc-300 text-zinc-800",
                                    totalPages <= 1 && "opacity-50 cursor-not-allowed bg-muted/20"
                                )}
                            />
                            <button
                                onClick={handleGoToPage}
                                disabled={totalPages <= 1}
                                className={cn(
                                    "h-8 px-3 text-[13px] border rounded-lg transition-all font-bold",
                                    isDark ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200" : "bg-white border-zinc-300 hover:border-zinc-400 text-zinc-700 active:scale-95 shadow-sm",
                                    totalPages <= 1 && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                Go
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 px-1">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-1 px-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-0.5">
                                {getPaginationRange(currentPage, totalPages).map((page, idx) => {
                                    if (page === '...') {
                                        return (
                                            <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-[13px]">
                                                ...
                                            </span>
                                        );
                                    }

                                    const isActive = page === currentPage;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => onPageChange(page)}
                                            className={cn(
                                                "w-7 h-7 flex items-center justify-center rounded text-[13px] font-bold transition-all",
                                                isActive
                                                    ? "bg-white text-zinc-900 border border-zinc-300 dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-100 shadow-sm scale-110 relative z-20"
                                                    : "text-zinc-500 hover:bg-zinc-300/50 dark:hover:bg-zinc-800 active:scale-95"
                                            )}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-1 px-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
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