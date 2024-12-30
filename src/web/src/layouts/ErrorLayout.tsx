import React from 'react';
import { Box, Container } from '@mui/material'; // v5.0.0
import { motion, AnimatePresence } from 'framer-motion'; // v6.0.0
import '../../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface ErrorLayoutProps {
  /** Content to be rendered within the error layout */
  children: React.ReactNode;
  /** Optional additional class name for styling */
  className?: string;
  /** HTTP error code for appropriate error handling */
  errorCode?: number;
  /** Whether to animate the error layout entrance */
  animate?: boolean;
  /** Callback function for retry/refresh actions */
  onRetry?: () => void;
}

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------

const errorLayoutVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// -----------------------------------------------------------------------------
// Error Layout Component
// -----------------------------------------------------------------------------

/**
 * ErrorLayout - A comprehensive error layout component that provides consistent
 * structure, styling, and accessibility features for error pages.
 *
 * @component
 * @version 1.0.0
 */
const ErrorLayout: React.FC<ErrorLayoutProps> = ({
  children,
  className = '',
  errorCode,
  animate = true,
  onRetry,
}) => {
  // Accessibility - Handle keyboard navigation
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && onRetry) {
      onRetry();
    }
  };

  // Render error layout with motion animations if enabled
  const renderContent = () => (
    <motion.div
      className="error-layout__content"
      variants={errorLayoutVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      // Respect user's motion preferences
      transition={{ 
        duration: 0.3,
        ease: 'easeOut',
        type: 'spring',
        stiffness: 100,
        damping: 15
      }}
    >
      {children}
    </motion.div>
  );

  return (
    <Box
      component="main"
      className={`error-layout ${className}`}
      // Accessibility - Semantic structure and ARIA attributes
      role="main"
      aria-label={`Error ${errorCode || ''} page content`}
      aria-live="polite"
      aria-atomic="true"
    >
      <Container
        className="error-layout__container"
        // Implement F-pattern layout with max width
        maxWidth={false}
        sx={{
          maxWidth: '1440px',
          px: {
            xs: 2, // 16px
            sm: 3, // 24px
            md: 4, // 32px
          },
          // Golden ratio for whitespace
          py: {
            xs: 3,
            sm: 4,
            md: 5,
          },
        }}
      >
        {/* Conditional animation wrapper */}
        {animate ? (
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        ) : (
          children
        )}

        {/* Error recovery action if provided */}
        {onRetry && (
          <Box
            className="error-layout__action"
            sx={{ mt: 4, textAlign: 'center' }}
          >
            <button
              onClick={onRetry}
              onKeyPress={handleKeyPress}
              // Accessibility - Interactive element attributes
              role="button"
              aria-label="Retry action"
              tabIndex={0}
              className="btn btn--primary"
            >
              Try Again
            </button>
          </Box>
        )}
      </Container>
    </Box>
  );
};

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default ErrorLayout;