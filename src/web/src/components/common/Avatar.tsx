/**
 * @fileoverview A reusable Avatar component that displays user profile images or initials
 * with support for different sizes, shapes, and fallback states. Implements Material
 * Design 3 principles and meets WCAG 2.1 Level AA accessibility standards.
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import classNames from 'classnames'; // v2.3.2
import { User } from '../../types/user.types';
import styles from './Avatar.module.css';

/**
 * Props interface for the Avatar component
 */
interface AvatarProps {
  /** User object containing profile information */
  user: User | null;
  /** Size variant of the avatar */
  size?: 'small' | 'medium' | 'large';
  /** Shape variant of the avatar */
  shape?: 'circle' | 'square';
  /** Optional additional CSS classes */
  className?: string;
  /** Custom alt text for accessibility */
  alt?: string;
  /** Optional error handler for image loading failures */
  onError?: (error: Error) => void;
}

/**
 * Extracts and formats initials from a user's name
 * @param name - The full name to extract initials from
 * @returns Formatted initials string
 */
const getInitials = (name: string): string => {
  if (!name) return '';

  // Remove special characters and extra spaces
  const cleanName = name.replace(/[^a-zA-Z\s]/g, '').trim();
  const words = cleanName.split(/\s+/);

  if (words.length === 0) return '';

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (
    (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  );
};

/**
 * Avatar component that displays user profile images or initials with
 * comprehensive accessibility support and fallback handling.
 */
const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'medium',
  shape = 'circle',
  className,
  alt,
  onError,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Handles image loading errors with fallback to initials
   */
  const handleImageError = useCallback((error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageError(true);
    setIsLoading(false);
    onError?.(new Error('Avatar image failed to load'));
  }, [onError]);

  /**
   * Handles successful image load
   */
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Generate component class names
  const avatarClasses = classNames(
    styles.avatar,
    styles[`avatar-${size}`],
    styles[`avatar-${shape}`],
    {
      [styles['avatar-loading']]: isLoading,
    },
    className
  );

  // Generate accessible alt text
  const altText = alt || `${user?.name || 'User'}'s avatar`;

  // Early return for no user
  if (!user) {
    return (
      <div 
        className={classNames(avatarClasses, styles['avatar-fallback'])}
        role="img"
        aria-label="Anonymous user avatar"
      >
        ?
      </div>
    );
  }

  // Show initials if no image or image error
  if (!user.profileImage || imageError) {
    return (
      <div 
        className={classNames(avatarClasses, styles['avatar-fallback'])}
        role="img"
        aria-label={altText}
      >
        {getInitials(user.name)}
      </div>
    );
  }

  // Render image avatar
  return (
    <div 
      className={avatarClasses}
      role="img"
      aria-label={altText}
    >
      <img
        src={user.profileImage}
        alt={altText}
        className={styles['avatar-image']}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
};

export default Avatar;

// CSS Module styles
const cssModule = `
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.avatar-small {
  width: 32px;
  height: 32px;
  font-size: 12px;
  min-width: 32px;
}

.avatar-medium {
  width: 40px;
  height: 40px;
  font-size: 16px;
  min-width: 40px;
}

.avatar-large {
  width: 48px;
  height: 48px;
  font-size: 20px;
  min-width: 48px;
}

.avatar-circle {
  border-radius: 50%;
}

.avatar-square {
  border-radius: 4px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-loading {
  opacity: 0.7;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--md-sys-color-surface-variant);
  color: var(--md-sys-color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@media (prefers-reduced-motion: reduce) {
  .avatar {
    transition: none;
  }
}

@media (forced-colors: active) {
  .avatar {
    border: 1px solid CanvasText;
  }
}
`;