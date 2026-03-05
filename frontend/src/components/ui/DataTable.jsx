import React, { useState, useRef, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ItemsPerPageDropdown = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState(null);
    const dropdownRef = useRef(null);
    const { theme } = useTheme();

    const updatePosition = () => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = Math.min(options.length * 36 + 10, 240);
            const dropUp = spaceBelow < menuHeight && rect.top > menuHeight;

            setCoords({
                top: dropUp ? rect.top + window.scrollY : rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                dropUp
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
                const menu = document.getElementById('datatable-dropdown-portal-root');
                if (menu && !menu.contains(event.target)) {
                    setIsOpen(false);
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, options.length]);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const isDark = theme === 'dark';

    const menuContent = coords && (
        <div
            id="datatable-dropdown-portal-root"
            style={{
                position: 'absolute',
                top: coords.dropUp ? 'auto' : `${coords.top + 4}px`,
                bottom: coords.dropUp ? `${window.innerHeight - coords.top + 4}px` : 'auto',
                left: `${coords.left}px`,
                width: `${Math.max(coords.width, 80)}px`,
                zIndex: 99999,
            }}
            className={`rounded-lg border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top ${coords.dropUp ? 'origin-bottom' : 'origin-top'
                } ${isDark ? 'bg-[#121212] border-border' : 'bg-white border-gray-200'}`}
        >
            <div className="py-1 custom-scrollbar">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`w-full text-left px-3 py-1 text-[13px] transition-colors flex items-center justify-between group ${value === option.value
                            ? isDark
                                ? 'bg-blue-600/20 text-blue-400 font-medium'
                                : 'bg-blue-50 text-blue-600 font-medium'
                            : isDark
                                ? 'text-foreground hover:bg-muted/50'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <span className="truncate">{option.label}</span>
                        {value === option.value && (
                            <Check className="w-3.5 h-3.5 ml-2 shrink-0" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="relative w-[80px]" ref={dropdownRef}>
            <button
                type="button"
                onClick={toggleDropdown}
                className={`appearance-none h-8 pl-3 pr-7 border rounded-md text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all w-full text-left truncate cursor-pointer ${isDark
                    ? 'bg-card border-border text-foreground hover:bg-muted/50'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
            >
                <span className="truncate block">{options.find(o => o.value === value)?.label || value}</span>
                <ChevronDown className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''
                    } ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`} />
            </button>
            {isOpen && coords && createPortal(menuContent, document.body)}
        </div>
    );
};

/**
 * @typedef {Object} Column
 * @property {string} header - The display name of the column header.
 * @property {string} [accessorKey] - The key in the data object to access the value.
 * @property {string} [id] - Unique identifier for the column.
 * @property {function} [cell] - Custom render function for the cell. Receives { row }.
 * @property {string} [className] - Optional CSS classes for the header cell.
 * @property {string} [cellClassName] - Optional CSS classes for the body cell.
 */

/**
 * Generic DataTable component
 * @param {Object} props
 * @param {Column[]} props.columns - Column configuration.
 * @param {Object[]} props.data - Array of data objects to display.
 * @param {boolean} props.loading - Loading state.
 * @param {function} [props.onRowClick] - Optional callback for row clicks.
 * @param {string} [props.className] - Optional CSS classes for the table container.
 * @param {React.ReactNode} [props.emptyState] - Component to show when data is empty.
 * @param {number} [props.currentPage] - Current active page.
 * @param {number} [props.totalPages] - Total number of pages.
 * @param {function} [props.onPageChange] - Callback for page changes.
 * @param {number} [props.itemsPerPage] - Number of items displayed per page.
 * @param {function} [props.onItemsPerPageChange] - Callback for items per page changes.
 * @param {number} [props.totalItems] - Total number of items across all pages.
 */
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
}) => {
    const [goToPageInput, setGoToPageInput] = useState('');

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
        { label: '15', value: 15 },
        { label: '20', value: 20 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
    ];

    const showPagination = onPageChange && totalPages !== undefined;

    return (
        <div className={cn("relative border border-border rounded-lg bg-card overflow-hidden flex flex-col h-full shadow-sm", className)}>
            <div className="overflow-x-auto flex-1">
                <Table className="min-w-max border-collapse">
                    <TableHeader>
                        <TableRow className="bg-muted/10 h-[44px] border-b border-border">
                            {columns.map((column, index) => (
                                <TableHead
                                    key={column.id || column.accessorKey || index}
                                    className={cn("px-4 py-2 text-[13px] font-semibold text-accent-foreground", column.className)}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={idx}>
                                    <TableCell colSpan={columns.length} className="px-4 py-6 border-b border-border">
                                        <div className="h-6 bg-muted rounded w-full animate-pulse" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="px-4 py-16 text-center text-muted-foreground text-sm">
                                    {emptyState || "No data items found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow
                                    key={row.id || rowIndex}
                                    className={cn(
                                        "group transition-colors  hover:bg-muted/40",
                                        onRowClick && "cursor-pointer"
                                    )}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {columns.map((column, colIndex) => {
                                        const value = column.accessorKey ? row[column.accessorKey] : undefined;
                                        return (
                                            <TableCell
                                                key={column.id || column.accessorKey || colIndex}
                                                className={cn("px-4 py-3 align-middle text-[13px] text-foreground", column.cellClassName)}
                                            >
                                                {column.cell ? column.cell({ row }) : (value ?? "-")}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {showPagination && (
                <div className="px-3 py-2 border-t border-border bg-card flex items-center justify-between sm:flex-row flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] text-muted-foreground whitespace-nowrap">Items per page:</span>
                        {onItemsPerPageChange ? (
                            <ItemsPerPageDropdown
                                value={itemsPerPage}
                                onChange={onItemsPerPageChange}
                                options={itemsPerPageOptions}
                            />
                        ) : (
                            <span className="text-[13px] font-medium">{itemsPerPage}</span>
                        )}
                        {totalItems !== undefined && (
                            <span className="text-[13px] text-muted-foreground ml-1">
                                Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-muted-foreground whitespace-nowrap">Go to page:</span>
                            <input
                                type="text"
                                value={goToPageInput}
                                onChange={(e) => setGoToPageInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                                placeholder={currentPage}
                                className="w-[44px] h-8 px-2 text-[13px] text-center bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-muted-foreground"
                            />
                            <button
                                onClick={handleGoToPage}
                                className="h-8 px-3 text-[13px] bg-white dark:bg-zinc-800 border border-border rounded shadow-sm hover:bg-muted transition-colors font-medium text-foreground"
                            >
                                Go
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="w-8 h-8 flex items-center justify-center text-black border border-border rounded-md text-[13px] font-bold shadow-sm">
                                {currentPage}
                            </div>
                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
