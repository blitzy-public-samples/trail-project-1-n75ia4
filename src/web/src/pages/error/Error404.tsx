import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.4.0
import { useTranslation } from 'react-i18next'; // v12.0.0
import ErrorLayout from '../../layouts/ErrorLayout';
import Button from '../../components/common/Button';
import '../../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface Error404Props {
  /** Optional class name for custom styling */
  className?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * Error404 - A comprehensive 404 error page component that provides a user-friendly
 * experience when a requested page is not found.
 *
 * @component
 * @version 1.0.0
 */
const Error404: React.FC<Error404Props> = React.memo(({ className = '' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Update document title and meta for SEO
  useEffect(() => {
    document.title = t('error.404.title', 'Page Not Found - Task Management System');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('error.404.meta', 
        'The requested page could not be found. Please check the URL or navigate back to the dashboard.'));
    }
  }, [t]);

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <ErrorLayout
      errorCode={404}
      className={`error-404 ${className}`}
      animate={true}
    >
      <div className="error-404__content">
        {/* Error Illustration */}
        <div className="error-404__illustration" role="img" aria-label={t('error.404.illustration')}>
          <img
            src="/assets/images/404-illustration.svg"
            alt=""
            className="error-404__image"
            loading="eager"
            width={400}
            height={300}
          />
        </div>

        {/* Error Message */}
        <div className="error-404__message-container">
          <h1 className="error-404__title">
            {t('error.404.heading', 'Page Not Found')}
          </h1>
          <p className="error-404__message">
            {t('error.404.message', 
              'The page you're looking for doesn't exist or has been moved.')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="error-404__actions">
          <Button
            variant="outlined"
            onClick={handleGoBack}
            startIcon={<span aria-hidden="true">←</span>}
            ariaLabel={t('error.404.back', 'Go back to previous page')}
            className="error-404__button"
          >
            {t('error.404.backButton', 'Go Back')}
          </Button>
          <Button
            variant="primary"
            onClick={handleGoHome}
            ariaLabel={t('error.404.home', 'Go to dashboard')}
            className="error-404__button"
          >
            {t('error.404.homeButton', 'Go to Dashboard')}
          </Button>
        </div>

        {/* Additional Help Text */}
        <p className="error-404__help-text">
          {t('error.404.help', 
            'If you believe this is an error, please contact support or try refreshing the page.')}
        </p>
      </div>

      <style>
        {`
          .error-404 {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: var(--spacing-lg);
            text-align: center;
          }

          .error-404__content {
            max-width: 600px;
            margin: 0 auto;
          }

          .error-404__illustration {
            margin-bottom: var(--spacing-xl);
          }

          .error-404__image {
            max-width: 100%;
            height: auto;
            @media (prefers-reduced-motion: reduce) {
              animation: none;
            }
          }

          .error-404__title {
            font-size: var(--font-size-h2);
            font-weight: var(--font-weight-bold);
            color: var(--text-primary);
            margin-bottom: var(--spacing-md);
          }

          .error-404__message {
            font-size: var(--font-size-lg);
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xl);
            line-height: 1.6;
          }

          .error-404__actions {
            display: flex;
            gap: var(--spacing-md);
            justify-content: center;
            margin-bottom: var(--spacing-lg);
            flex-wrap: wrap;
          }

          .error-404__button {
            min-width: 160px;
          }

          .error-404__help-text {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            margin-top: var(--spacing-xl);
          }

          @media (max-width: 768px) {
            .error-404__actions {
              flex-direction: column;
              align-items: stretch;
            }

            .error-404__button {
              width: 100%;
            }
          }
        `}
      </style>
    </ErrorLayout>
  );
});

// Display name for debugging
Error404.displayName = 'Error404';

export default Error404;