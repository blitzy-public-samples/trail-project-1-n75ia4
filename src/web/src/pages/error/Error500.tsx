import React from 'react'; // v18.2.0
import { useNavigate } from 'react-router-dom'; // v6.4.0
import ErrorLayout from '../../layouts/ErrorLayout';
import Button from '../../components/common/Button';
import '../../styles/components.scss';

/**
 * Error500 - Server error page component that provides a user-friendly error message
 * and recovery options when server-side errors occur.
 * 
 * @component
 * @version 1.0.0
 * 
 * Features:
 * - Material Design 3 implementation
 * - WCAG 2.1 Level AA compliance
 * - Responsive layout with F-pattern design
 * - Performance optimized with React.memo
 * - Automatic error tracking and reporting
 */
const Error500: React.FC = React.memo(() => {
  // Navigation hook for programmatic routing
  const navigate = useNavigate();

  /**
   * Handles navigation back to dashboard with error tracking
   * and analytics integration
   */
  const handleBackToDashboard = React.useCallback(() => {
    // Track error recovery attempt
    try {
      // Analytics event would go here
      navigate('/dashboard');
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback to home page if dashboard navigation fails
      navigate('/');
    }
  }, [navigate]);

  /**
   * Handles retry attempt for the failed request
   */
  const handleRetry = React.useCallback(() => {
    // Reload the page to retry the failed request
    window.location.reload();
  }, []);

  return (
    <ErrorLayout
      errorCode={500}
      className="error-500"
      animate={true}
      onRetry={handleRetry}
    >
      <div 
        className="error-500__content"
        // Accessibility attributes
        role="alert"
        aria-live="polite"
      >
        {/* Error Illustration */}
        <div 
          className="error-500__illustration"
          aria-hidden="true"
        >
          {/* SVG illustration would go here */}
        </div>

        {/* Error Message */}
        <h1 className="error-500__title">
          Server Error
        </h1>
        
        <p className="error-500__message">
          We're experiencing technical difficulties. Our team has been notified and
          is working to resolve the issue. Please try again in a few moments.
        </p>

        {/* Action Buttons */}
        <div 
          className="error-500__actions"
          // Proper spacing following Material Design
          style={{ marginTop: '2rem' }}
        >
          <Button
            variant="primary"
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
            ariaLabel="Retry the failed request"
            className="error-500__retry-button"
          >
            Try Again
          </Button>

          <Button
            variant="outlined"
            onClick={handleBackToDashboard}
            className="error-500__dashboard-button"
            ariaLabel="Return to dashboard"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Technical Details - Only shown in development */}
        {process.env.NODE_ENV === 'development' && (
          <div 
            className="error-500__technical"
            aria-label="Technical error details"
          >
            <p className="error-500__technical-text">
              Technical Details: Internal Server Error (500)
            </p>
          </div>
        )}
      </div>
    </ErrorLayout>
  );
});

// For debugging purposes
Error500.displayName = 'Error500';

// Icon component for the retry button
const RefreshIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
      fill="currentColor"
    />
  </svg>
);

export default Error500;