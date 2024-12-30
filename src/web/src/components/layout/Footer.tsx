import React, { useMemo, useCallback } from 'react'; // v18.2.0
import { useTheme } from '../../hooks/useTheme';
import styles from '../../styles/components.scss';

// Types for component props and configuration
interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
}

interface FooterProps {
  className?: string;
}

// Configuration constants
const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/company/taskmaster',
    icon: 'linkedin',
    ariaLabel: 'Visit our LinkedIn page'
  },
  {
    name: 'Twitter',
    url: 'https://twitter.com/taskmaster',
    icon: 'twitter',
    ariaLabel: 'Follow us on Twitter'
  },
  {
    name: 'GitHub',
    url: 'https://github.com/taskmaster',
    icon: 'github',
    ariaLabel: 'View our GitHub repository'
  }
];

const NAV_LINKS = [
  { text: 'About', href: '/about', ariaLabel: 'About Task Management System' },
  { text: 'Privacy', href: '/privacy', ariaLabel: 'Privacy Policy' },
  { text: 'Terms', href: '/terms', ariaLabel: 'Terms of Service' },
  { text: 'Contact', href: '/contact', ariaLabel: 'Contact Us' }
];

/**
 * Footer component providing consistent layout and branding across all pages
 * with responsive design, accessibility features, and theme support.
 * 
 * Features:
 * - WCAG 2.1 Level AA compliant
 * - Responsive layout with mobile-first approach
 * - Theme-aware styling with light/dark/high-contrast support
 * - Keyboard navigation optimization
 * - Screen reader compatibility
 */
export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  // Theme context for styling
  const { themeMode, isHighContrast } = useTheme();

  // Memoized current year for copyright
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Tab' || event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const focusableElements = event.currentTarget.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex="0"]'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.key === 'Tab' && event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (event.key === 'Tab' && !event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  return (
    <footer
      role="contentinfo"
      className={`${styles.footer} ${className}`}
      data-theme={themeMode}
      data-high-contrast={isHighContrast}
      onKeyDown={handleKeyboardNavigation}
    >
      <div className={styles.footerContainer}>
        {/* Navigation Section */}
        <nav className={styles.footerNav} aria-label="Footer Navigation">
          <ul role="list" className={styles.footerNavList}>
            {NAV_LINKS.map(({ text, href, ariaLabel }) => (
              <li key={href}>
                <a
                  href={href}
                  aria-label={ariaLabel}
                  className={styles.footerNavLink}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Social Media Section */}
        <div className={styles.footerSocial}>
          <h2 className={styles.visuallyHidden}>Connect With Us</h2>
          <ul role="list" className={styles.socialList}>
            {SOCIAL_LINKS.map(({ name, url, icon, ariaLabel }) => (
              <li key={name}>
                <a
                  href={url}
                  aria-label={ariaLabel}
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={`${styles.icon} ${styles[`icon-${icon}`]}`} aria-hidden="true" />
                  <span className={styles.visuallyHidden}>{name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright Section */}
        <div className={styles.footerCopyright}>
          <p>
            <span aria-label="Copyright">©</span>
            {' '}
            <span>{currentYear}</span>
            {' '}
            <span>Task Management System. All rights reserved.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;