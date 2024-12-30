/**
 * @fileoverview Profile settings page component providing a secure, accessible interface
 * for users to manage their personal information, preferences, and notification settings.
 * Implements WCAG 2.1 Level AA compliance with real-time validation and auto-save.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { useForm } from 'react-hook-form'; // v7.0.0
import { toast } from 'react-toastify'; // v9.0.0
import debounce from 'lodash/debounce'; // v4.17.21

import { Input } from '../../components/common/Input';
import { User, UserPreferences, NotificationPreferences } from '../../types/user.types';
import { authService } from '../../services/auth.service';
import { validateEmail } from '../../utils/validation.utils';

// Form data interface with type safety
interface ProfileFormData {
  name: string;
  email: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  preferences: UserPreferences;
}

// Auto-save debounce delay
const AUTO_SAVE_DELAY = 1000;

/**
 * Profile settings component with comprehensive form management and accessibility
 */
const Profile: React.FC = () => {
  // Form state management with validation
  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<ProfileFormData>();
  
  // Component state
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Refs for managing auto-save and accessibility
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<ProfileFormData | null>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  /**
   * Load user profile data on component mount
   */
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const authState = authService.getAuthState();
        if (authState.user) {
          setUser(authState.user);
          // Initialize form with user data
          setValue('name', authState.user.name);
          setValue('email', authState.user.email);
          setValue('language', authState.user.preferences.language);
          setValue('theme', authState.user.preferences.theme);
          setValue('notifications', authState.user.preferences.notifications);
          setValue('preferences', authState.user.preferences);
          lastSavedRef.current = watch();
        }
      } catch (error) {
        toast.error('Failed to load profile data');
        console.error('Profile load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [setValue, watch]);

  /**
   * Handle form submission with validation and error handling
   */
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      setSaveStatus('saving');

      // Validate email format
      const emailValidation = await validateEmail(data.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      // Update profile through auth service
      await authService.updateProfile({
        ...user,
        name: data.name,
        email: data.email,
        preferences: {
          ...data.preferences,
          language: data.language,
          theme: data.theme,
          notifications: data.notifications
        }
      });

      lastSavedRef.current = data;
      setSaveStatus('saved');
      announceToScreenReader('Profile updated successfully');
      toast.success('Profile updated successfully');
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-save handler with debouncing
   */
  const handleAutoSave = useCallback(
    debounce((data: ProfileFormData) => {
      if (isDirty && JSON.stringify(data) !== JSON.stringify(lastSavedRef.current)) {
        onSubmit(data);
      }
    }, AUTO_SAVE_DELAY),
    [isDirty]
  );

  /**
   * Watch form changes for auto-save
   */
  useEffect(() => {
    const subscription = watch((data) => {
      if (data) {
        handleAutoSave(data as ProfileFormData);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [watch, handleAutoSave]);

  /**
   * Handle notification preference toggle
   */
  const handleNotificationToggle = async (type: keyof NotificationPreferences, enabled: boolean) => {
    try {
      const updatedNotifications = {
        ...watch('notifications'),
        [type]: enabled
      };
      setValue('notifications', updatedNotifications, { shouldDirty: true });
      handleAutoSave(watch());
    } catch (error) {
      toast.error('Failed to update notification settings');
      console.error('Notification update error:', error);
    }
  };

  /**
   * Announce messages to screen readers
   */
  const announceToScreenReader = (message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  };

  if (loading && !user) {
    return <div role="alert" aria-busy="true">Loading profile...</div>;
  }

  return (
    <div className="profile-settings" role="main" aria-labelledby="profile-title">
      <h1 id="profile-title" className="profile-title">Profile Settings</h1>
      
      <div 
        ref={announcerRef}
        className="sr-only"
        role="status"
        aria-live="polite"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
        <div className="form-section">
          <h2>Personal Information</h2>
          
          <Input
            id="name"
            label="Full Name"
            type="text"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
            aria-describedby="name-error"
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              validate: async (value) => {
                const validation = await validateEmail(value);
                return validation.isValid || validation.error;
              }
            })}
            aria-describedby="email-error"
          />
        </div>

        <div className="form-section">
          <h2>Preferences</h2>
          
          <div className="preference-group">
            <label htmlFor="language">Display Language</label>
            <select
              id="language"
              {...register('language')}
              aria-describedby="language-description"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div className="preference-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              {...register('theme')}
              aria-describedby="theme-description"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>Notification Settings</h2>
          
          <div className="notification-group">
            {Object.entries(watch('notifications') || {}).map(([key, enabled]) => (
              <div key={key} className="notification-option">
                <label htmlFor={`notification-${key}`}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} Notifications
                </label>
                <input
                  type="checkbox"
                  id={`notification-${key}`}
                  checked={enabled}
                  onChange={(e) => handleNotificationToggle(key as keyof NotificationPreferences, e.target.checked)}
                  aria-describedby={`${key}-notification-description`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading || !isDirty}
            aria-busy={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          
          {saveStatus === 'saved' && (
            <span role="status" className="save-status">
              All changes saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default Profile;