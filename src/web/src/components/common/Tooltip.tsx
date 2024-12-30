import React, { useState, useEffect, useRef, useCallback } from 'react'; // v18.2.0
import styled from '@emotion/styled'; // v11.11.0
import { Portal } from '@mui/base'; // v5.0.0
import { useTheme } from '../../hooks/useTheme';

// Constants for tooltip behavior
const TOOLTIP_OFFSET = 8;
const TOOLTIP_SHOW_DELAY = 200;
const TOOLTIP_HIDE_DELAY = 150;
const TOOLTIP_TOUCH_DELAY = 1000;

// Types
type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface Position {
  top: number;
  left: number;
  transformOrigin: string;
}

interface TooltipProps {
  /** Content to be displayed in the tooltip */
  content: string;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Tooltip placement relative to trigger element */
  placement?: TooltipPlacement;
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number;
  /** Disable tooltip */
  disabled?: boolean;
  /** Unique identifier for accessibility */
  id?: string;
  /** Enable high contrast mode */
  highContrast?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Styled components
const TooltipContainer = styled.div<{ $highContrast: boolean }>`
  position: fixed;
  z-index: 1500;
  padding: 8px 12px;
  font-size: 0.875rem;
  line-height: 1.4;
  border-radius: 4px;
  max-width: 300px;
  word-wrap: break-word;
  background-color: ${({ theme, $highContrast }) => 
    $highContrast ? theme.colors.textPrimary : theme.colors.secondary};
  color: ${({ theme, $highContrast }) => 
    $highContrast ? theme.colors.background : theme.colors.surface};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
              transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  
  &[data-show="true"] {
    opacity: 1;
    transform: scale(1);
  }
  
  &[data-show="false"] {
    opacity: 0;
    transform: scale(0.9);
    pointer-events: none;
  }
`;

// Helper function to calculate tooltip position
const getTooltipPosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  isRTL: boolean
): Position => {
  const positions: Record<TooltipPlacement, Position> = {
    top: {
      top: triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      transformOrigin: 'bottom center'
    },
    bottom: {
      top: triggerRect.bottom + TOOLTIP_OFFSET,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      transformOrigin: 'top center'
    },
    left: {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: isRTL ? triggerRect.right + TOOLTIP_OFFSET : triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET,
      transformOrigin: isRTL ? 'left center' : 'right center'
    },
    right: {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: isRTL ? triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET : triggerRect.right + TOOLTIP_OFFSET,
      transformOrigin: isRTL ? 'right center' : 'left center'
    }
  };

  return positions[placement];
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  showDelay = TOOLTIP_SHOW_DELAY,
  hideDelay = TOOLTIP_HIDE_DELAY,
  disabled = false,
  id,
  highContrast: propHighContrast,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const { isHighContrast: themeHighContrast } = useTheme();
  
  const highContrast = propHighContrast ?? themeHighContrast;
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  const isTouchDevice = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current && isVisible) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const isRTL = document.dir === 'rtl';
      
      setPosition(getTooltipPosition(triggerRect, tooltipRect, placement, isRTL));
    }
  }, [isVisible, placement]);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    
    clearTimeouts();
    showTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, isTouchDevice.current ? TOOLTIP_TOUCH_DELAY : showDelay);
  }, [disabled, showDelay, clearTimeouts]);

  const hideTooltip = useCallback(() => {
    clearTimeouts();
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [hideDelay, clearTimeouts]);

  // Handle window resize and scroll
  useEffect(() => {
    if (isVisible) {
      const handleUpdate = () => {
        requestAnimationFrame(updatePosition);
      };

      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate, true);

      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate, true);
      };
    }
  }, [isVisible, updatePosition]);

  // Update position when visibility changes
  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, updatePosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  // Event handlers
  const handleMouseEnter = () => !isTouchDevice.current && showTooltip();
  const handleMouseLeave = () => !isTouchDevice.current && hideTooltip();
  const handleFocus = () => showTooltip();
  const handleBlur = () => hideTooltip();
  const handleTouchStart = () => {
    isTouchDevice.current = true;
    showTooltip();
  };
  const handleTouchEnd = () => {
    hideTooltip();
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideTooltip();
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        aria-describedby={isVisible ? tooltipId : undefined}
        className={className}
      >
        {children}
      </div>
      {isVisible && (
        <Portal>
          <TooltipContainer
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            $highContrast={highContrast}
            data-show={isVisible}
            style={position || undefined}
          >
            {content}
          </TooltipContainer>
        </Portal>
      )}
    </>
  );
};

export default Tooltip;