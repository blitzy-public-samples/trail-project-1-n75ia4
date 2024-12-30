import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.2.0
import styled from '@emotion/styled'; // v11.11.0
import { useClickOutside } from '@mantine/hooks'; // v7.0.0
import useTheme from '../../hooks/useTheme';

// Types
export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode[];
  placement?: 'bottom-start' | 'bottom-end' | 'bottom-center';
  maxHeight?: string;
  hasAnimation?: boolean;
  onSelect?: (index: number) => void;
  className?: string;
  'aria-label'?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  transformOrigin: string;
}

// Styled Components
const DropdownContainer = styled.div<{ isOpen: boolean }>`
  position: relative;
  display: inline-block;
  
  /* Ensure dropdown container is accessible via keyboard */
  &:focus-within {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;

const DropdownTrigger = styled.div`
  cursor: pointer;
  min-width: 44px; /* Touch-friendly target size */
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DropdownMenu = styled.ul<{
  isOpen: boolean;
  position: DropdownPosition;
  maxHeight?: string;
  hasAnimation: boolean;
  isDarkMode: boolean;
}>`
  position: fixed;
  top: ${({ position }) => `${position.top}px`};
  left: ${({ position }) => `${position.left}px`};
  transform-origin: ${({ position }) => position.transformOrigin};
  min-width: 200px;
  max-height: ${({ maxHeight }) => maxHeight || '300px'};
  overflow-y: auto;
  background-color: ${({ isDarkMode }) => 
    isDarkMode ? 'var(--color-surface)' : 'var(--color-background)'};
  border-radius: 8px;
  box-shadow: ${({ isDarkMode }) => 
    isDarkMode ? 'var(--color-elevation-3)' : '0 2px 8px rgba(0, 0, 0, 0.15)'};
  z-index: 1000;
  margin: 0;
  padding: 8px 0;
  list-style: none;
  
  /* Animation */
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
  transform: ${({ isOpen }) => (isOpen ? 'scale(1)' : 'scale(0.9)')};
  transition: ${({ hasAnimation }) =>
    hasAnimation
      ? 'opacity 200ms ease-out, transform 200ms ease-out'
      : 'none'};
  
  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--color-primary);
    border-radius: 3px;
  }
`;

const DropdownItem = styled.li`
  padding: 12px 16px;
  cursor: pointer;
  color: var(--color-textPrimary);
  font-size: 1rem;
  line-height: 1.5;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background-color: var(--color-elevation-1);
  }
  
  &:focus {
    outline: none;
    background-color: var(--color-elevation-2);
  }
  
  &[aria-selected="true"] {
    background-color: var(--color-elevation-2);
  }
`;

// Utility function to calculate dropdown position
const calculatePosition = (
  triggerElement: HTMLElement,
  placement: DropdownProps['placement']
): DropdownPosition => {
  const rect = triggerElement.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceBelowThreshold = 100;
  
  let position: DropdownPosition = {
    top: rect.bottom + 8,
    left: rect.left,
    transformOrigin: 'top left'
  };
  
  switch (placement) {
    case 'bottom-end':
      position.left = rect.right - 200; // minimum dropdown width
      position.transformOrigin = 'top right';
      break;
    case 'bottom-center':
      position.left = rect.left + (rect.width / 2) - 100;
      position.transformOrigin = 'top center';
      break;
  }
  
  // Adjust position if not enough space below
  if (spaceBelow < spaceBelowThreshold) {
    position.top = rect.top - 8;
    position.transformOrigin = position.transformOrigin.replace('top', 'bottom');
  }
  
  return position;
};

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  placement = 'bottom-start',
  maxHeight,
  hasAnimation = true,
  onSelect,
  className,
  'aria-label': ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    transformOrigin: 'top left'
  });
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  
  const { themeMode } = useTheme();
  const isDarkMode = themeMode === 'dark';
  
  // Close dropdown when clicking outside
  useClickOutside(containerRef, () => setIsOpen(false));
  
  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      setPosition(calculatePosition(triggerRef.current, placement));
    }
  }, [isOpen, placement]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    const itemCount = React.Children.count(children);
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % itemCount);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
        break;
      case 'Home':
        event.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setSelectedIndex(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectedIndex >= 0) {
          onSelect?.(selectedIndex);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, children, selectedIndex, onSelect]);
  
  // Add keyboard event listeners
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);
  
  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const items = menuRef.current.querySelectorAll('li');
      if (items[selectedIndex]) {
        (items[selectedIndex] as HTMLElement).focus();
      }
    }
  }, [isOpen, selectedIndex]);
  
  return (
    <DropdownContainer
      ref={containerRef}
      className={className}
      isOpen={isOpen}
      role="presentation"
    >
      <DropdownTrigger
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {trigger}
      </DropdownTrigger>
      
      {isOpen && (
        <DropdownMenu
          ref={menuRef}
          role="menu"
          isOpen={isOpen}
          position={position}
          maxHeight={maxHeight}
          hasAnimation={hasAnimation}
          isDarkMode={isDarkMode}
          aria-orientation="vertical"
        >
          {React.Children.map(children, (child, index) => (
            <DropdownItem
              role="menuitem"
              tabIndex={-1}
              aria-selected={index === selectedIndex}
              onClick={() => {
                onSelect?.(index);
                setIsOpen(false);
              }}
            >
              {child}
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}
    </DropdownContainer>
  );
};

export default Dropdown;