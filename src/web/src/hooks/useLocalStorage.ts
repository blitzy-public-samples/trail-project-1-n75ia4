import { useState, useEffect, useCallback } from 'react'; // v18.2.0
import { setItem, getItem } from '../utils/storage.utils';

/**
 * Custom hook for managing state that persists in localStorage with type safety,
 * encryption support, and cross-tab synchronization.
 * 
 * @template T - Type of the stored value
 * @param {string} key - Storage key
 * @param {T} initialValue - Initial value if none exists in storage
 * @param {boolean} [encrypt=false] - Whether to encrypt the stored data
 * @returns {[T, (value: T | ((val: T) => T)) => void]} Tuple of current value and setter function
 * 
 * @example
 * const [value, setValue] = useLocalStorage<string>('user-preference', 'default', true);
 */
const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  encrypt: boolean = false
): [T, (value: T | ((val: T) => T)) => void] => {
  // Validate key parameter
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid storage key');
  }

  // Initialize state with stored value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Attempt to get the stored value
      const item = getItem<T>(key, encrypt);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // Create memoized setValue function
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function for functional updates
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      setItem(key, valueToStore, encrypt);

      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: key,
        newValue: JSON.stringify(valueToStore),
        storageArea: localStorage
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      
      // Implement retry logic for storage quota errors
      if (error.message.includes('quota')) {
        try {
          // Attempt to clear some space and retry
          const oldItems = Object.keys(localStorage)
            .filter(k => k.startsWith('app_'))
            .sort((a, b) => {
              const aTime = JSON.parse(localStorage.getItem(a) || '{}').timestamp || 0;
              const bTime = JSON.parse(localStorage.getItem(b) || '{}').timestamp || 0;
              return aTime - bTime;
            });

          // Remove oldest items until we have space
          while (oldItems.length > 0) {
            localStorage.removeItem(oldItems.shift()!);
            try {
              const valueToStore = value instanceof Function ? value(storedValue) : value;
              setItem(key, valueToStore, encrypt);
              setStoredValue(valueToStore);
              break;
            } catch (e) {
              continue;
            }
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
    }
  }, [key, encrypt, storedValue]);

  // Handle storage events for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      }
    };

    // Subscribe to storage events
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
};

export default useLocalStorage;