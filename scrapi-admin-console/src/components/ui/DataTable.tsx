import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const cn = (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' ');

interface DropdownOption {
    label: string;
    value: number;
}

const ItemsPerPageDropdown = ({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: DropdownOption[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; dropUp: boolean } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    const updatePosition = () => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = Math.min(options.length * 36 + 10, 240);
            const dropUp = spaceBelow < menuHeight && rect.top > menuHeight;
            setCoords({ top: dropUp ? rect.top + window.scrollY : rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width, dropUp });
        }
    };

    const toggleDropdown = () => {
        if (!isOpen) { updatePosition(); setIsOpen(true); } else { setIsOpen(false); }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                const menu = document.getElementById('datatable-dropdown-portal-root');
                if (menu && !menu.contains(event.target as Node)) setIsOpen(false);
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

    const isDark = theme === 'dark';

    const menuContent = coords && (
        <div
            id="datatable-dropdown-portal-root"
            style={{ position: 'absolute', top: coords.dropUp ? 'auto' : `${coords.top + 4}px`, bottom: coords.dropUp ? `${window.innerHeight - coords.top + 4}px` : 'auto', left: `${coords.left}px`, width: `${Math.max(coords.width, 80)}px`, zIndex: 99999 }}
            className={`rounded-lg border shadow-xl overflow-hidden ${isDark ? 'bg-[#121212] border-border' : 'bg-white border-gray-200'}`}
        >
            <div className="py-1">
                {options.map((option) => (
                    <button key={option.value} type="button" onClick={() => { onChange(option.value); setIsOpen(false); }}
                        className={`w-full text-left px-3 py-1 text-[13px] transition-colors flex items-center justify-between ${value === option.value ? isDark ? 'bg-blue-600/20 text-blue-400 font-medium' : 'bg-blue-50 text-blue-600 font-medium' : isDark ? 'text-foreground hover:bg-muted/50' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <span>{option.label}</span>
                        {value === option.value && <Check className="w-3.5 h-3.5 ml-2" />}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="relative w-[80px]" ref={dropdownRef}>
            <button type="button" onClick={toggleDropdown}
                className={`appearance-none h-8 pl-3 pr-7 border rounded-md text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-left cursor-pointer ${isDark ? 'bg-card border-border text-foreground hover:bg-muted/50' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <span className="truncate block">{options.find(o => o.value === value)?.label || value}</span>
                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`} />
            </button>
            {isOpen && coords && createPortal(menuContent, document.body)}
        </div>
    );
};

export interface Column<T = any> {
    header: string;
    accessorKey?: keyof T;
    id?: string;
    cell?: (props: { row: T }) => React.ReactNode;
    className?: string;
    cellClassName?: string;
}

interface DataTableProps<T = any> {
    columns: Column<T>[];
    data: T[];
    loading: boolean;
    onRowClick?: (row: T) => void;
    className?: string;
    emptyState?: React.ReactNode;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    itemsPerPage?: number;
    onItemsPerPageChange?: (n: number) => void;
    totalItems?: number;
}

const DataTable = <T extends { id?: string | number }>({
    columns, data, loading, onRowClick, className, emptyState,
    currentPage, totalPages, onPageChange, itemsPerPage = 20, onItemsPerPageChange, totalItems,
}: DataTableProps<T>) => {
    const [goToPageInput, setGoToPageInput] = useState('');
    const itemsPerPageOptions: DropdownOption[] = [
        { label: '5', value: 5 }, { label: '10', value: 10 }, { label: '15', value: 15 },
        { label: '20', value: 20 }, { label: '50', value: 50 }, { label: '100', value: 100 },
    ];
    const showPagination = onPageChange && totalPages !== undefined;

    const handleGoToPage = () => {
        const pageNum = parseInt(goToPageInput);
        if (pageNum >= 1 && pageNum <= (totalPages || 1)) { onPageChange!(pageNum); setGoToPageInput(''); }
    };

    return (
        <div className={cn("relative border border-border rounded-lg bg-card overflow-hidden flex flex-col shadow-sm", className)}>
            <div className="overflow-x-auto flex-1">
                <Table className="min-w-max border-collapse">
                    <TableHeader>
                        <TableRow className="bg-muted/10 h-[44px] border-b border-border">
                            {columns.map((col, i) => (
                                <TableHead key={col.id || (col.accessorKey as string) || i} className={cn("px-4 py-2 text-[13px] font-semibold text-accent-foreground", col.className)}>
                                    {col.header}
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
                                <TableRow key={(row as any).id || rowIndex}
                                    className={cn("group transition-colors hover:bg-muted/40", onRowClick && "cursor-pointer")}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {columns.map((col, colIndex) => {
                                        const value = col.accessorKey ? (row as any)[col.accessorKey] : undefined;
                                        return (
                                            <TableCell key={col.id || (col.accessorKey as string) || colIndex}
                                                className={cn("px-4 py-3 align-middle text-[13px] text-foreground", col.cellClassName)}
                                            >
                                                {col.cell ? col.cell({ row }) : (value ?? "-")}
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
                <div className="px-3 py-2 border-t border-border bg-card flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] text-muted-foreground whitespace-nowrap">Items per page:</span>
                        {onItemsPerPageChange ? (
                            <ItemsPerPageDropdown value={itemsPerPage!} onChange={onItemsPerPageChange} options={itemsPerPageOptions} />
                        ) : (
                            <span className="text-[13px] font-medium">{itemsPerPage}</span>
                        )}
                        {totalItems !== undefined && (
                            <span className="text-[13px] text-muted-foreground ml-1">
                                Showing {totalItems > 0 ? (currentPage! - 1) * itemsPerPage! + 1 : 0}–{Math.min(currentPage! * itemsPerPage!, totalItems)} of {totalItems}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-muted-foreground whitespace-nowrap">Go to page:</span>
                            <input type="text" value={goToPageInput} onChange={e => setGoToPageInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGoToPage()}

                                placeholder={String(currentPage)}
                                className="w-[44px] h-8 px-2 text-[13px] text-center bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-muted-foreground"
                            />
                            <button onClick={handleGoToPage}
                                className="h-8 px-3 text-[13px] bg-white dark:bg-zinc-800 border border-border rounded shadow-sm hover:bg-muted transition-colors font-medium text-foreground"
                            >Go</button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => onPageChange!(Math.max(1, currentPage! - 1))} disabled={currentPage === 1}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="w-8 h-8 flex items-center justify-center text-foreground border border-border rounded-md text-[13px] font-bold shadow-sm">
                                {currentPage}
                            </div>
                            <button onClick={() => onPageChange!(Math.min(totalPages!, currentPage! + 1))} disabled={currentPage! >= totalPages!}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
