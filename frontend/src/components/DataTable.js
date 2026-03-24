import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Centralized Data Table Component with Pagination
 * 
 * @param {Object} props
 * @param {Array} props.columns - Column definitions
 *   [{ 
 *     header: string, 
 *     accessor: string | function, 
 *     render: function,
 *     sortable: boolean,
 *     sortKey: string,
 *     width: string (e.g., 'w-32', 'min-w-[200px] max-w-[500px]')
 *   }]
 * @param {Array} props.data - Data items
 * @param {Object} props.pagination - { page, limit, total, totalPages }
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onLimitChange - Callback when limit changes
 * @param {Function} props.onSort - Callback when sort changes
 * @param {Object} props.sortConfig - { sortBy, sortOrder }
 * @param {Boolean} props.loading - Loading state
 * @param {Function} props.onRowClick - Callback when row is clicked
 * @param {Function} props.isRowClickable - Function to determine if row is clickable
 * @param {Object} props.emptyState - { title, description }
 */
const DataTable = ({
  columns = [],
  data = [],
  pagination = { page: 1, limit: 20, total: 0, totalPages: 1 },
  onPageChange,
  onLimitChange,
  onSort,
  sortConfig = { sortBy: '', sortOrder: 'desc' },
  loading = false,
  onRowClick,
  isRowClickable,
  emptyState = { title: 'No data found', description: 'No items to display' }
}) => {
  const [goToPageInput, setGoToPageInput] = useState('');

  const handleSort = (column) => {
    if (!column.sortable || !onSort) return;

    const sortKey = column.sortKey || column.accessor;
    if (sortConfig.sortBy === sortKey) {
      onSort(sortKey, sortConfig.sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      onSort(sortKey, 'desc');
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput);
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      onPageChange(pageNum);
      setGoToPageInput('');
    }
  };

  const getCellValue = (row, column) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  const isClickable = (row) => {
    if (!onRowClick) return false;
    if (isRowClickable) return isRowClickable(row);
    return true;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* Table */}
      <div className="overflow-x-auto">
        {data.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base">{emptyState.title}</p>
            <p className="text-sm text-gray-400 mt-2">{emptyState.description}</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide ${column.width || ''
                      } ${column.sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-1">
                      {column.header}
                      {column.sortable && sortConfig.sortBy === (column.sortKey || column.accessor) && (
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${sortConfig.sortOrder === 'asc' ? 'rotate-180' : ''
                            }`}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isClickable(row) ? 'cursor-pointer' : ''
                    }`}
                  onClick={() => isClickable(row) && onRowClick(row)}
                >
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className={`px-6 py-4 ${column.width || ''}`}>
                      {column.render ? column.render(row) : getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 0 && data.length > 0 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange && onLimitChange(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-gray-400"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Go to page:</span>
                <Input
                  type="number"
                  min="1"
                  max={pagination.totalPages}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                  className="w-16 h-8 text-sm border-gray-300 text-center focus:border-gray-400 focus:ring-0"
                  placeholder={pagination.page.toString()}
                />
                <Button
                  size="sm"
                  onClick={handleGoToPage}
                  className="h-8 px-3 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Go
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-3 py-1 text-sm font-medium text-gray-700">
                  {pagination.page}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
