import React, { useMemo, useCallback } from 'react'; // v18.2.0
import classNames from 'classnames'; // v2.3.2
import { Button } from './Button';
import { PaginatedResponse } from '../../types/api.types';
import '../../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface PaginationAriaLabels {
  /** Accessible label for the navigation region */
  navigation?: string;
  /** Accessible label for the previous page button */
  previousPage?: string;
  /** Accessible label for the next page button */
  nextPage?: string;
  /** Accessible label for the current page */
  currentPage?: string;
  /** Accessible label for page numbers */
  pageNumber?: string;
  /** Accessible label for the loading state */
  loading?: string;
  /** Accessible label for error state */
  error?: string;
}

interface PaginationAnalytics {
  /** Category for analytics tracking */
  category?: string;
  /** Action for analytics tracking */
  action?: string;
  /** Optional label for analytics tracking */
  label?: string;
}

export interface PaginationProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Callback function when page changes */
  onPageChange: (page: number) => void;
  /** Optional callback for page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Whether to show page size selector */
  showPageSize?: boolean;
  /** Whether pagination is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Error state message */
  error?: string;
  /** Customizable ARIA labels */
  ariaLabels?: PaginationAriaLabels;
  /** Optional analytics configuration */
  analytics?: PaginationAnalytics;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_ARIA_LABELS: Required<PaginationAriaLabels> = {
  navigation: 'Pagination navigation',
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  currentPage: 'Current page, page',
  pageNumber: 'Go to page',
  loading: 'Loading pagination',
  error: 'Pagination error'
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Pagination = React.memo<PaginationProps>(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
  showPageSize = false,
  disabled = false,
  loading = false,
  error,
  ariaLabels = DEFAULT_ARIA_LABELS,
  analytics
}) => {
  // Calculate page range based on screen size and current page
  const pageRange = useMemo(() => {
    const range = window.innerWidth < 768 ? 2 : window.innerWidth < 1024 ? 3 : 5;
    const start = Math.max(1, currentPage - Math.floor(range / 2));
    const end = Math.min(totalPages, start + range - 1);
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  // Handle page change with analytics
  const handlePageChange = useCallback((page: number) => {
    if (analytics) {
      // Analytics tracking implementation would go here
      console.info('Pagination Analytics:', {
        category: analytics.category || 'Pagination',
        action: analytics.action || 'Page Change',
        label: `Page ${page}`
      });
    }
    onPageChange(page);
  }, [onPageChange, analytics]);

  // Handle page size change
  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(event.target.value, 10);
    onPageSizeChange?.(newSize);
  }, [onPageSizeChange]);

  // Generate container class names
  const containerClasses = classNames(
    'pagination',
    {
      'pagination--loading': loading,
      'pagination--error': error,
      'pagination--disabled': disabled
    },
    className
  );

  return (
    <nav
      className={containerClasses}
      aria-label={ariaLabels.navigation}
      role="navigation"
    >
      {/* Error Message */}
      {error && (
        <div 
          className="pagination__error" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div 
          className="pagination__loading" 
          role="status"
          aria-label={ariaLabels.loading}
        >
          <span className="pagination__loading-spinner" aria-hidden="true" />
        </div>
      )}

      <div className="pagination__controls">
        {/* Previous Page Button */}
        <Button
          variant="outlined"
          size="small"
          disabled={currentPage === 1 || disabled || loading}
          onClick={() => handlePageChange(currentPage - 1)}
          ariaLabel={ariaLabels.previousPage}
          className="pagination__button"
        >
          <span aria-hidden="true">←</span>
        </Button>

        {/* Page Numbers */}
        <div className="pagination__pages" role="group">
          {pageRange.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? 'primary' : 'outlined'}
              size="small"
              disabled={disabled || loading}
              onClick={() => handlePageChange(page)}
              ariaLabel={page === currentPage ? 
                `${ariaLabels.currentPage} ${page}` : 
                `${ariaLabels.pageNumber} ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className="pagination__page-button"
            >
              {page}
            </Button>
          ))}
        </div>

        {/* Next Page Button */}
        <Button
          variant="outlined"
          size="small"
          disabled={currentPage === totalPages || disabled || loading}
          onClick={() => handlePageChange(currentPage + 1)}
          ariaLabel={ariaLabels.nextPage}
          className="pagination__button"
        >
          <span aria-hidden="true">→</span>
        </Button>
      </div>

      {/* Page Size Selector */}
      {showPageSize && onPageSizeChange && (
        <div className="pagination__size-selector">
          <label 
            htmlFor="pageSize" 
            className="pagination__size-label"
          >
            Items per page:
          </label>
          <select
            id="pageSize"
            className="pagination__size-select"
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={disabled || loading}
          >
            {DEFAULT_PAGE_SIZES.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Items Counter */}
      <div 
        className="pagination__counter"
        aria-live="polite"
      >
        {`${Math.min((currentPage - 1) * pageSize + 1, totalItems)}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} items`}
      </div>
    </nav>
  );
});

// Display name for debugging
Pagination.displayName = 'Pagination';

export default Pagination;