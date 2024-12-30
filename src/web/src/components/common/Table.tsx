import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { useVirtual } from 'react-virtual'; // v2.10.4
import { Pagination } from './Pagination';
import { Loading } from './Loading';
import '../../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

export interface TableColumn {
  id: string;
  label: string | React.ReactNode;
  accessor: string | ((row: any) => any);
  sortable?: boolean;
  multiSort?: boolean;
  sortPriority?: number;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: 'left' | 'center' | 'right';
  priority?: number;
  sticky?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  headerRender?: (column: TableColumn) => React.ReactNode;
  filter?: boolean;
  filterComponent?: React.ComponentType<FilterProps>;
}

export interface TableProps {
  data: Array<any>;
  columns: Array<TableColumn>;
  loading?: boolean;
  sortable?: boolean;
  multiSort?: boolean;
  selectable?: boolean;
  selectMode?: 'single' | 'multiple';
  expandable?: boolean;
  virtual?: boolean;
  stickyHeader?: boolean;
  stickyColumns?: number;
  responsive?: boolean;
  resizable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onSort?: (columns: Array<{ id: string; direction: 'asc' | 'desc' }>) => void;
  onSelect?: (selectedRows: Array<any>) => void;
  onExpand?: (row: any) => void;
  onPageChange?: (page: number) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  className?: string;
  emptyMessage?: string | React.ReactNode;
  loadingMessage?: string | React.ReactNode;
  errorMessage?: string | React.ReactNode;
  virtualization?: {
    itemSize: number;
    overscan: number;
  };
}

interface SortState {
  id: string;
  direction: 'asc' | 'desc';
  priority?: number;
}

interface FilterProps {
  column: TableColumn;
  onFilter: (value: any) => void;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_ROW_HEIGHT = 48;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_PAGE_SIZE = 10;
const MIN_COLUMN_WIDTH = 100;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Table = React.memo<TableProps>(({
  data,
  columns,
  loading = false,
  sortable = true,
  multiSort = false,
  selectable = false,
  selectMode = 'multiple',
  expandable = false,
  virtual = false,
  stickyHeader = true,
  stickyColumns = 0,
  responsive = true,
  resizable = false,
  pagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
  currentPage = 1,
  totalItems = 0,
  onSort,
  onSelect,
  onExpand,
  onPageChange,
  onColumnResize,
  className,
  emptyMessage = 'No data available',
  loadingMessage = 'Loading data...',
  errorMessage,
  virtualization = { itemSize: DEFAULT_ROW_HEIGHT, overscan: DEFAULT_OVERSCAN }
}) => {
  // State management
  const [sortState, setSortState] = useState<SortState[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Refs
  const tableRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const initialWidth = useRef<number>(0);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtual({
    size: data.length,
    parentRef: tableRef,
    estimateSize: useCallback(() => virtualization.itemSize, [virtualization.itemSize]),
    overscan: virtualization.overscan
  });

  // Memoized responsive columns
  const visibleColumns = useMemo(() => {
    if (!responsive) return columns;
    
    const viewportWidth = window.innerWidth;
    return columns.filter(column => {
      if (!column.priority) return true;
      if (viewportWidth >= 1024) return true;
      if (viewportWidth >= 768) return column.priority <= 2;
      return column.priority === 1;
    });
  }, [columns, responsive]);

  // Handle sort
  const handleSort = useCallback((columnId: string) => {
    if (!sortable) return;

    setSortState(prevSort => {
      const newSort = [...prevSort];
      const existingSort = newSort.find(s => s.id === columnId);

      if (existingSort) {
        if (existingSort.direction === 'asc') {
          existingSort.direction = 'desc';
        } else {
          newSort.splice(newSort.indexOf(existingSort), 1);
        }
      } else {
        if (!multiSort) {
          newSort.length = 0;
        }
        newSort.push({ id: columnId, direction: 'asc', priority: newSort.length + 1 });
      }

      onSort?.(newSort);
      return newSort;
    });
  }, [sortable, multiSort, onSort]);

  // Handle selection
  const handleRowSelect = useCallback((rowId: string) => {
    if (!selectable) return;

    setSelectedRows(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (selectMode === 'single') {
        newSelected.clear();
      }
      
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }

      onSelect?.(Array.from(newSelected));
      return newSelected;
    });
  }, [selectable, selectMode, onSelect]);

  // Handle column resize
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    if (!resizable) return;

    resizeStartX.current = e.clientX;
    initialWidth.current = columnWidths[columnId] || MIN_COLUMN_WIDTH;
    setResizingColumn(columnId);

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return;

      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, initialWidth.current + diff);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (resizingColumn) {
        onColumnResize?.(resizingColumn, columnWidths[resizingColumn]);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [resizable, columnWidths, resizingColumn, onColumnResize]);

  // Render table header
  const renderHeader = useCallback(() => (
    <div className="table__header" role="rowgroup">
      <div className="table__row" role="row">
        {selectable && (
          <div className="table__cell table__cell--header table__cell--checkbox" role="columnheader">
            <input
              type="checkbox"
              checked={selectedRows.size === data.length}
              onChange={() => {/* Implement select all logic */}}
              aria-label="Select all rows"
            />
          </div>
        )}
        {visibleColumns.map((column, index) => (
          <div
            key={column.id}
            className={classNames('table__cell', 'table__cell--header', {
              'table__cell--sortable': column.sortable,
              'table__cell--sticky': column.sticky || index < stickyColumns,
              [`table__cell--align-${column.align || 'left'}`]: true
            })}
            style={{
              width: columnWidths[column.id] || column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth
            }}
            role="columnheader"
            aria-sort={getSortDirection(column.id)}
          >
            <div className="table__cell-content">
              {column.headerRender?.(column) || column.label}
              {column.sortable && (
                <button
                  className="table__sort-button"
                  onClick={() => handleSort(column.id)}
                  aria-label={`Sort by ${column.label}`}
                >
                  {/* Sort indicator */}
                </button>
              )}
            </div>
            {resizable && (
              <div
                className="table__resize-handle"
                onMouseDown={(e) => handleResizeStart(e, column.id)}
                role="separator"
                aria-orientation="vertical"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  ), [visibleColumns, sortState, selectedRows, columnWidths, handleSort, handleResizeStart]);

  // Render table body
  const renderBody = useCallback(() => {
    if (loading) {
      return (
        <div className="table__loading" role="status">
          <Loading size="large" ariaLabel={loadingMessage} />
          <span className="table__loading-text">{loadingMessage}</span>
        </div>
      );
    }

    if (!data.length) {
      return (
        <div className="table__empty" role="status">
          {emptyMessage}
        </div>
      );
    }

    const rows = virtual ? rowVirtualizer.virtualItems : data;

    return (
      <div 
        className="table__body" 
        role="rowgroup"
        style={virtual ? { height: `${data.length * virtualization.itemSize}px` } : undefined}
      >
        {rows.map((virtualRow: any) => {
          const row = virtual ? data[virtualRow.index] : virtualRow;
          const rowId = row.id || virtualRow.index;

          return (
            <div
              key={rowId}
              className={classNames('table__row', {
                'table__row--selected': selectedRows.has(rowId),
                'table__row--expanded': expandedRows.has(rowId)
              })}
              role="row"
              aria-selected={selectedRows.has(rowId)}
              style={virtual ? {
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`
              } : undefined}
            >
              {/* Row cells */}
              {visibleColumns.map((column, index) => (
                <div
                  key={`${rowId}-${column.id}`}
                  className={classNames('table__cell', {
                    'table__cell--sticky': column.sticky || index < stickyColumns,
                    [`table__cell--align-${column.align || 'left'}`]: true
                  })}
                  role="cell"
                >
                  {column.render?.(
                    column.accessor instanceof Function ? 
                      column.accessor(row) : 
                      row[column.accessor],
                    row,
                    virtualRow.index
                  ) || row[column.accessor]}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }, [data, loading, virtual, rowVirtualizer, visibleColumns, selectedRows, expandedRows]);

  // Utility function to get sort direction
  const getSortDirection = (columnId: string): 'ascending' | 'descending' | 'none' => {
    const sort = sortState.find(s => s.id === columnId);
    if (!sort) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div
      className={classNames('table-container', className, {
        'table-container--loading': loading,
        'table-container--virtual': virtual,
        'table-container--sticky-header': stickyHeader,
        'table-container--responsive': responsive
      })}
    >
      <div
        ref={tableRef}
        className="table"
        role="table"
        aria-busy={loading}
        aria-colcount={visibleColumns.length}
        aria-rowcount={data.length}
      >
        {renderHeader()}
        {renderBody()}
      </div>

      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / pageSize)}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          className="table__pagination"
        />
      )}
    </div>
  );
});

// Display name for debugging
Table.displayName = 'Table';

export default Table;