import React, { useCallback, useEffect, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import useTheme from '../../hooks/useTheme';

// Constants for modal configuration
const MODAL_SIZES = {
  small: '400px',
  medium: '600px',
  large: '800px',
  fullscreen: '100%'
} as const;

const Z_INDEX_MODAL = 1000;
const ANIMATION_DURATION = 200;
const FOCUS_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Types
type ModalSize = keyof typeof MODAL_SIZES;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscapeKey?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Modal component implementing Material Design 3 principles with full accessibility support
 * Features:
 * - WCAG 2.1 Level AA compliant
 * - Keyboard navigation and focus management
 * - Screen reader announcements
 * - Responsive design
 * - Theme-aware styling with high contrast support
 * - Touch-friendly interactions
 */
const Modal: React.FC<ModalProps> = memo(({
  isOpen,
  onClose,
  children,
  title,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscapeKey = true,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}) => {
  // Theme context for styling
  const { themeMode, isHighContrast } = useTheme();
  
  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  // Handle escape key press
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (closeOnEscapeKey && event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [closeOnEscapeKey, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      event.preventDefault();
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus trap implementation
  const handleFocusTrap = useCallback((event: KeyboardEvent) => {
    if (!modalRef.current || event.key !== 'Tab') return;

    const focusableElements = modalRef.current.querySelectorAll(FOCUS_SELECTOR);
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }, []);

  // Setup and cleanup effects
  useEffect(() => {
    if (isOpen) {
      // Store current active element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Add event listeners
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('keydown', handleFocusTrap);
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Set initial focus
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector(FOCUS_SELECTOR) as HTMLElement;
        firstFocusable?.focus();
      }
    }

    return () => {
      if (isOpen) {
        // Remove event listeners
        document.removeEventListener('keydown', handleEscapeKey);
        document.removeEventListener('keydown', handleFocusTrap);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore focus
        previousActiveElement.current?.focus();
      }
    };
  }, [isOpen, handleEscapeKey, handleFocusTrap]);

  // Don't render if modal is closed
  if (!isOpen) return null;

  // Styles based on theme
  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isHighContrast 
        ? 'rgba(0, 0, 0, 0.9)' 
        : themeMode === 'dark' 
          ? 'rgba(0, 0, 0, 0.7)' 
          : 'rgba(0, 0, 0, 0.5)',
      zIndex: Z_INDEX_MODAL,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: `fadeIn ${ANIMATION_DURATION}ms ease-out`
    },
    modal: {
      backgroundColor: `var(--color-surface)`,
      color: `var(--color-textPrimary)`,
      borderRadius: '8px',
      boxShadow: isHighContrast 
        ? '0 0 0 2px var(--color-primary)' 
        : '0 8px 32px rgba(0, 0, 0, 0.24)',
      width: '100%',
      maxWidth: MODAL_SIZES[size],
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative' as const,
      animation: `slideIn ${ANIMATION_DURATION}ms ease-out`
    },
    header: {
      padding: '1rem',
      borderBottom: '1px solid var(--color-divider)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    content: {
      padding: '1rem'
    },
    closeButton: {
      position: 'absolute' as const,
      top: '0.5rem',
      right: '0.5rem',
      padding: '0.5rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--color-textSecondary)',
      borderRadius: '50%',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 200ms ease'
    }
  };

  return ReactDOM.createPortal(
    <div
      role="presentation"
      style={styles.overlay}
      onClick={handleOverlayClick}
      onTouchEnd={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedby}
        className={`modal ${className}`}
        style={styles.modal}
      >
        {title && (
          <header style={styles.header}>
            <h2 id="modal-title" className="modal-title">
              {title}
            </h2>
          </header>
        )}
        <button
          type="button"
          onClick={onClose}
          style={styles.closeButton}
          aria-label="Close modal"
          className="modal-close"
        >
          ✕
        </button>
        <div style={styles.content} className="modal-content">
          {children}
        </div>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .modal:focus {
            outline: ${isHighContrast ? '2px solid var(--color-primary)' : 'none'};
          }
          .modal-close:hover {
            background-color: var(--color-elevation-1);
          }
          .modal-close:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
          }
        `}
      </style>
    </div>,
    document.body
  );
});

Modal.displayName = 'Modal';

export default Modal;
export type { ModalProps, ModalSize };