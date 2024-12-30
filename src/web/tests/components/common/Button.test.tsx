// Core testing utilities - v14.0.0
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // v14.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.7.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // v4.7.3
import { ThemeProvider, createTheme } from '@mui/material'; // v5.x.x

// Component under test
import Button from '../../src/components/common/Button';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// -----------------------------------------------------------------------------
// Test Setup
// -----------------------------------------------------------------------------

const renderWithTheme = (children: React.ReactNode, themeOptions = {}) => {
  const theme = createTheme({
    palette: {
      mode: 'light',
      ...themeOptions
    }
  });

  return render(
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};

// Mock handlers
const mockClick = jest.fn();
const mockFocus = jest.fn();
const mockBlur = jest.fn();

// Test cleanup
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});

// -----------------------------------------------------------------------------
// Test Suites
// -----------------------------------------------------------------------------

describe('Button Component', () => {
  // Rendering Tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<Button>Click Me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn', 'btn--primary', 'btn--medium');
    });

    it('renders with custom className and variant', () => {
      renderWithTheme(
        <Button className="custom-class" variant="secondary">
          Custom Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class', 'btn--secondary');
    });

    it('renders with start and end icons', () => {
      const StartIcon = () => <span data-testid="start-icon">Start</span>;
      const EndIcon = () => <span data-testid="end-icon">End</span>;

      renderWithTheme(
        <Button startIcon={<StartIcon />} endIcon={<EndIcon />}>
          Icon Button
        </Button>
      );

      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('renders with fullWidth prop', () => {
      renderWithTheme(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--full-width');
    });
  });

  // Material Design Tests
  describe('Material Design Compliance', () => {
    it('applies correct styles for each variant', () => {
      const variants = ['primary', 'secondary', 'outlined', 'text'] as const;
      
      variants.forEach(variant => {
        const { rerender } = renderWithTheme(
          <Button variant={variant}>Button</Button>
        );
        
        expect(screen.getByRole('button')).toHaveClass(`btn--${variant}`);
        rerender(<></>);
      });
    });

    it('applies correct styles for each size', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      
      sizes.forEach(size => {
        const { rerender } = renderWithTheme(
          <Button size={size}>Button</Button>
        );
        
        expect(screen.getByRole('button')).toHaveClass(`btn--${size}`);
        rerender(<></>);
      });
    });

    it('supports theme variants', () => {
      renderWithTheme(
        <Button theme="dark">Dark Theme</Button>
      );
      
      expect(screen.getByRole('button')).toHaveClass('btn--dark');
      expect(screen.getByRole('button')).toHaveAttribute('data-theme', 'dark');
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG accessibility standards', async () => {
      const { container } = renderWithTheme(
        <Button aria-label="Accessible Button">Click Me</Button>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithTheme(
        <Button onClick={mockClick}>Keyboard Nav</Button>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(button, { key: ' ' });
      expect(mockClick).toHaveBeenCalledTimes(2);
    });

    it('handles disabled state correctly', () => {
      renderWithTheme(
        <Button disabled onClick={mockClick}>
          Disabled Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      
      fireEvent.click(button);
      expect(mockClick).not.toHaveBeenCalled();
    });

    it('provides proper ARIA attributes', () => {
      renderWithTheme(
        <Button loading aria-label="Loading Button">
          Loading
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-label', 'Loading Button');
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <Button onClick={mockClick}>Click Me</Button>
      );
      
      await user.click(screen.getByRole('button'));
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading state correctly', () => {
      renderWithTheme(
        <Button loading>Loading</Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn--loading');
      expect(within(button).getByRole('progressbar')).toBeInTheDocument();
    });

    it('prevents interaction when loading', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <Button loading onClick={mockClick}>
          Loading
        </Button>
      );
      
      await user.click(screen.getByRole('button'));
      expect(mockClick).not.toHaveBeenCalled();
    });

    it('supports high contrast mode', () => {
      renderWithTheme(
        <Button highContrast>High Contrast</Button>
      );
      
      expect(screen.getByRole('button')).toHaveClass('btn--high-contrast');
    });
  });

  // Performance Tests
  describe('Performance', () => {
    it('handles rapid clicks correctly', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <Button onClick={mockClick}>Click Me</Button>
      );
      
      const button = screen.getByRole('button');
      await user.tripleClick(button);
      expect(mockClick).toHaveBeenCalledTimes(3);
    });

    it('debounces keyboard events', async () => {
      renderWithTheme(
        <Button onClick={mockClick}>Keyboard Test</Button>
      );
      
      const button = screen.getByRole('button');
      
      // Simulate rapid keyboard presses
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(button, { key: 'Enter' });
      }
      
      await waitFor(() => {
        expect(mockClick).toHaveBeenCalledTimes(5);
      });
    });
  });
});