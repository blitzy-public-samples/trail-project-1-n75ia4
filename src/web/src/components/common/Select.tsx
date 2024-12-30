import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import classNames from 'classnames';
import { useVirtualizer } from 'react-virtual'; // v2.10.4
import styles from '../../styles/components.scss';

// Types and Interfaces
interface OptionType {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | string[];
  onChange: (value: string | string[], event?: React.SyntheticEvent) => void;
  options: OptionType[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  virtualized?: boolean;
  maxHeight?: number;
  direction?: 'ltr' | 'rtl';
  renderOption?: (option: OptionType) => React.ReactNode;
}

// Constants
const DROPDOWN_ITEM_HEIGHT = 44; // Touch-friendly target size
const DEFAULT_MAX_HEIGHT = 300;
const VIRTUALIZATION_THRESHOLD = 100;
const DEBOUNCE_DELAY = 150;

// Utility functions
const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  multiple = false,
  searchable = false,
  disabled = false,
  placeholder = 'Select an option',
  error = false,
  helperText,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  virtualized = true,
  maxHeight = DEFAULT_MAX_HEIGHT,
  direction = 'ltr',
  renderOption,
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : []
  );

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Memoized values
  const filteredOptions = useMemo(() => {
    if (!searchText) return options;
    const normalizedSearch = searchText.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [options, searchText]);

  // Virtualization setup
  const shouldVirtualize = virtualized && options.length > VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => DROPDOWN_ITEM_HEIGHT,
    overscan: 5,
  });

  // Event Handlers
  const handleTriggerClick = useCallback((event: React.MouseEvent) => {
    if (!disabled) {
      setIsOpen(prev => !prev);
      setSearchText('');
      setActiveIndex(-1);
    }
  }, [disabled]);

  const handleOptionClick = useCallback((optionValue: string, event: React.MouseEvent) => {
    event.preventDefault();
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      setSelectedValues(newValues);
      onChange(newValues, event);
    } else {
      setSelectedValues([optionValue]);
      onChange(optionValue, event);
      setIsOpen(false);
    }
  }, [multiple, onChange, selectedValues]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const increment = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex(prev => {
          const nextIndex = prev + increment;
          return Math.max(0, Math.min(nextIndex, filteredOptions.length - 1));
        });
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (activeIndex >= 0) {
          handleOptionClick(filteredOptions[activeIndex].value, event as any);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      }
      case 'Tab': {
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      }
    }
  }, [activeIndex, disabled, filteredOptions, handleOptionClick, isOpen]);

  const handleSearchChange = debounce((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setActiveIndex(-1);
  }, DEBOUNCE_DELAY);

  // Effects
  useEffect(() => {
    if (isOpen && searchable) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Render helpers
  const renderSelectedValue = () => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) {
      return `${selectedValues.length} selected`;
    }
    const selectedOption = options.find(opt => opt.value === selectedValues[0]);
    return selectedOption?.label || placeholder;
  };

  const renderDropdownItem = (option: OptionType, index: number) => {
    const isSelected = selectedValues.includes(option.value);
    const isActive = index === activeIndex;

    return (
      <div
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled}
        className={classNames('dropdown__item', {
          'dropdown__item--selected': isSelected,
          'dropdown__item--active': isActive,
          'dropdown__item--disabled': option.disabled
        })}
        onClick={e => !option.disabled && handleOptionClick(option.value, e)}
        key={option.value}
      >
        {renderOption ? renderOption(option) : option.label}
      </div>
    );
  };

  // Component classes
  const componentClasses = classNames(
    styles.dropdown,
    {
      [styles['dropdown--error']]: error,
      [styles['dropdown--rtl']]: direction === 'rtl',
      [styles['dropdown--disabled']]: disabled
    },
    className
  );

  return (
    <div
      ref={containerRef}
      className={componentClasses}
      dir={direction}
    >
      <button
        ref={triggerRef}
        type="button"
        className="dropdown__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
      >
        {renderSelectedValue()}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="dropdown__menu"
          role="listbox"
          aria-multiselectable={multiple}
          style={{ maxHeight }}
        >
          {searchable && (
            <input
              ref={searchInputRef}
              type="text"
              className="dropdown__search"
              placeholder="Search..."
              onChange={handleSearchChange}
              aria-label="Search options"
            />
          )}

          <div ref={listRef} style={{ height: Math.min(maxHeight, filteredOptions.length * DROPDOWN_ITEM_HEIGHT) }}>
            {shouldVirtualize ? (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
                }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    {renderDropdownItem(filteredOptions[virtualRow.index], virtualRow.index)}
                  </div>
                ))}
              </div>
            ) : (
              filteredOptions.map((option, index) => renderDropdownItem(option, index))
            )}
          </div>
        </div>
      )}

      {helperText && (
        <div className="dropdown__helper-text" role="alert" aria-live="polite">
          {helperText}
        </div>
      )}
    </div>
  );
};

export default Select;