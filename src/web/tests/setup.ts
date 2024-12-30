// @testing-library/jest-dom v6.1.0
import '@testing-library/jest-dom/extend-expect';
// jest-environment-jsdom v29.7.0
import 'jest-environment-jsdom';
// @testing-library/react v14.0.0
import { configure } from '@testing-library/react';

/**
 * Configures Jest DOM testing environment with custom matchers and accessibility testing support.
 * Extends Jest with DOM-specific assertions and WCAG 2.1 Level AA compliance validation.
 */
export const setupJestDom = (): void => {
  // Configure @testing-library/react
  configure({
    // Ensure consistent behavior across different environments
    testIdAttribute: 'data-testid',
    // Configure async utilities
    asyncUtilTimeout: 1000,
    // Enable strict mode for React 18 compatibility
    reactStrictMode: true,
    // Configure accessibility checking
    computedStyleSupportsPseudoElements: true,
  });

  // Add custom matchers for accessibility testing
  expect.extend({
    // Custom matcher for ARIA role validation
    toHaveValidAriaRole(received: HTMLElement, expectedRole: string) {
      const role = received.getAttribute('role');
      const pass = role === expectedRole;
      return {
        pass,
        message: () =>
          pass
            ? `Expected element not to have role "${expectedRole}"`
            : `Expected element to have role "${expectedRole}" but got "${role || 'none'}"`,
      };
    },
  });
};

/**
 * Sets up global mocks required for React components and Material-UI testing.
 * Includes mocks for browser APIs and observers commonly used in modern web applications.
 */
export const setupGlobalMocks = (): void => {
  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock MutationObserver
  global.MutationObserver = class MutationObserver {
    observe() {}
    disconnect() {}
  };

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '0px';
    readonly thresholds: number[] = [0];

    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: () => {},
  });

  // Mock getComputedStyle for Material-UI
  Object.defineProperty(window, 'getComputedStyle', {
    value: (element: Element) => ({
      getPropertyValue: (prop: string) => {
        return '';
      },
      // Add commonly accessed properties
      display: 'none',
      visibility: 'hidden',
      // Add other default computed styles as needed
    }),
  });

  // Setup drag and drop event mocks
  const createDndEvent = (type: string) => ({
    dataTransfer: {
      data: {},
      setData: (key: string, value: string) => {
        (this as any).data[key] = value;
      },
      getData: (key: string) => {
        return (this as any).data[key];
      },
    },
  });

  Object.defineProperty(window.HTMLElement.prototype, 'dragstart', {
    value: createDndEvent('dragstart'),
  });

  Object.defineProperty(window.HTMLElement.prototype, 'drop', {
    value: createDndEvent('drop'),
  });
};

// Initialize test environment
setupJestDom();
setupGlobalMocks();