/**
 * @fileoverview Central index file for image assets used throughout the web application.
 * Implements Material Design 3 principles and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

// Types
type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type ImageFormat = 'webp' | 'png' | 'svg' | 'jpg';
type PriorityLevel = 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'inProgress' | 'review' | 'done';
type ProjectCategory = 'development' | 'design' | 'marketing' | 'other';
type ProjectStatus = 'active' | 'onHold' | 'completed' | 'cancelled';
type EmptyStateType = 'noTasks' | 'noProjects' | 'noResults' | 'error';
type TaskIconType = 'priority' | 'status';
type ProjectIconType = 'category' | 'status';

interface ImageAsset {
  path: string;
  alt: string;
  sizes: Record<ImageSize, string>;
  format?: ImageFormat;
}

interface ResponsiveImageSet {
  srcset: string;
  sizes: string;
}

// Global Constants
export const IMAGE_BASE_PATH = '/assets/images/';
export const IMAGE_CDN_URL = 'https://cdn.taskmaster.com/assets/images/';
export const DEFAULT_IMAGE_FORMAT: ImageFormat = 'webp';

export const SUPPORTED_IMAGE_FORMATS: ImageFormat[] = ['webp', 'png', 'svg', 'jpg'];
export const IMAGE_CATEGORIES = ['avatars', 'logos', 'icons', 'backgrounds', 'empty-states'];
export const IMAGE_SIZES: ImageSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
export const DEVICE_BREAKPOINTS = ['320px', '768px', '1024px', '1440px'];

// Utility Functions
/**
 * Generates optimized image path with CDN support and format fallbacks
 * @param imageName - Base name of the image
 * @param size - Desired image size
 * @param format - Desired image format
 * @returns Full CDN path to the optimized image asset
 */
export const getImagePath = (
  imageName: string,
  size: ImageSize,
  format: ImageFormat = DEFAULT_IMAGE_FORMAT
): string => {
  const timestamp = process.env.BUILD_TIME || Date.now();
  return `${IMAGE_CDN_URL}${imageName}/${size}.${format}?v=${timestamp}`;
};

/**
 * Generates srcset and sizes attributes for responsive images
 * @param asset - Image asset configuration
 * @returns Object containing srcset and sizes attributes
 */
export const getResponsiveImageSet = (asset: ImageAsset): ResponsiveImageSet => {
  const srcset = IMAGE_SIZES.map(size => 
    `${asset.sizes[size]} ${size === 'xs' ? '320w' : 
      size === 'sm' ? '768w' : 
      size === 'md' ? '1024w' : 
      size === 'lg' ? '1440w' : 
      size === 'xl' ? '1920w' : '2560w'}`
  ).join(', ');

  const sizes = '(max-width: 320px) 320px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, (max-width: 1440px) 1440px, 1920px';

  return { srcset, sizes };
};

// Image Assets
export const defaultAvatar: ImageAsset = {
  path: `${IMAGE_BASE_PATH}avatars/default-avatar`,
  alt: 'Default user avatar',
  sizes: {
    xs: getImagePath('avatars/default-avatar', 'xs'),
    sm: getImagePath('avatars/default-avatar', 'sm'),
    md: getImagePath('avatars/default-avatar', 'md'),
    lg: getImagePath('avatars/default-avatar', 'lg'),
    xl: getImagePath('avatars/default-avatar', 'xl'),
    '2xl': getImagePath('avatars/default-avatar', '2xl')
  }
};

export const logoLight: ImageAsset = {
  path: `${IMAGE_BASE_PATH}logos/logo-light`,
  alt: 'Task Master logo - Light theme',
  sizes: {
    xs: getImagePath('logos/logo-light', 'xs'),
    sm: getImagePath('logos/logo-light', 'sm'),
    md: getImagePath('logos/logo-light', 'md'),
    lg: getImagePath('logos/logo-light', 'lg'),
    xl: getImagePath('logos/logo-light', 'xl'),
    '2xl': getImagePath('logos/logo-light', '2xl')
  }
};

export const logoDark: ImageAsset = {
  path: `${IMAGE_BASE_PATH}logos/logo-dark`,
  alt: 'Task Master logo - Dark theme',
  sizes: {
    xs: getImagePath('logos/logo-dark', 'xs'),
    sm: getImagePath('logos/logo-dark', 'sm'),
    md: getImagePath('logos/logo-dark', 'md'),
    lg: getImagePath('logos/logo-dark', 'lg'),
    xl: getImagePath('logos/logo-dark', 'xl'),
    '2xl': getImagePath('logos/logo-dark', '2xl')
  }
};

export const taskIcons: Record<TaskIconType, Record<PriorityLevel | TaskStatus, ImageAsset>> = {
  priority: {
    high: {
      path: `${IMAGE_BASE_PATH}icons/priority-high`,
      alt: 'High priority indicator',
      sizes: {
        xs: getImagePath('icons/priority-high', 'xs', 'svg'),
        sm: getImagePath('icons/priority-high', 'sm', 'svg'),
        md: getImagePath('icons/priority-high', 'md', 'svg'),
        lg: getImagePath('icons/priority-high', 'lg', 'svg'),
        xl: getImagePath('icons/priority-high', 'xl', 'svg'),
        '2xl': getImagePath('icons/priority-high', '2xl', 'svg')
      }
    },
    medium: {
      path: `${IMAGE_BASE_PATH}icons/priority-medium`,
      alt: 'Medium priority indicator',
      sizes: {
        xs: getImagePath('icons/priority-medium', 'xs', 'svg'),
        sm: getImagePath('icons/priority-medium', 'sm', 'svg'),
        md: getImagePath('icons/priority-medium', 'md', 'svg'),
        lg: getImagePath('icons/priority-medium', 'lg', 'svg'),
        xl: getImagePath('icons/priority-medium', 'xl', 'svg'),
        '2xl': getImagePath('icons/priority-medium', '2xl', 'svg')
      }
    },
    low: {
      path: `${IMAGE_BASE_PATH}icons/priority-low`,
      alt: 'Low priority indicator',
      sizes: {
        xs: getImagePath('icons/priority-low', 'xs', 'svg'),
        sm: getImagePath('icons/priority-low', 'sm', 'svg'),
        md: getImagePath('icons/priority-low', 'md', 'svg'),
        lg: getImagePath('icons/priority-low', 'lg', 'svg'),
        xl: getImagePath('icons/priority-low', 'xl', 'svg'),
        '2xl': getImagePath('icons/priority-low', '2xl', 'svg')
      }
    }
  } as Record<PriorityLevel, ImageAsset>,
  status: {
    todo: {
      path: `${IMAGE_BASE_PATH}icons/status-todo`,
      alt: 'To-do status indicator',
      sizes: {
        xs: getImagePath('icons/status-todo', 'xs', 'svg'),
        sm: getImagePath('icons/status-todo', 'sm', 'svg'),
        md: getImagePath('icons/status-todo', 'md', 'svg'),
        lg: getImagePath('icons/status-todo', 'lg', 'svg'),
        xl: getImagePath('icons/status-todo', 'xl', 'svg'),
        '2xl': getImagePath('icons/status-todo', '2xl', 'svg')
      }
    }
    // ... similar structure for other status icons
  } as Record<TaskStatus, ImageAsset>
};

export const projectIcons: Record<ProjectIconType, Record<ProjectCategory | ProjectStatus, ImageAsset>> = {
  category: {
    development: {
      path: `${IMAGE_BASE_PATH}icons/category-development`,
      alt: 'Development project category',
      sizes: {
        xs: getImagePath('icons/category-development', 'xs', 'svg'),
        sm: getImagePath('icons/category-development', 'sm', 'svg'),
        md: getImagePath('icons/category-development', 'md', 'svg'),
        lg: getImagePath('icons/category-development', 'lg', 'svg'),
        xl: getImagePath('icons/category-development', 'xl', 'svg'),
        '2xl': getImagePath('icons/category-development', '2xl', 'svg')
      }
    }
    // ... similar structure for other category icons
  } as Record<ProjectCategory, ImageAsset>,
  status: {
    active: {
      path: `${IMAGE_BASE_PATH}icons/status-active`,
      alt: 'Active project status',
      sizes: {
        xs: getImagePath('icons/status-active', 'xs', 'svg'),
        sm: getImagePath('icons/status-active', 'sm', 'svg'),
        md: getImagePath('icons/status-active', 'md', 'svg'),
        lg: getImagePath('icons/status-active', 'lg', 'svg'),
        xl: getImagePath('icons/status-active', 'xl', 'svg'),
        '2xl': getImagePath('icons/status-active', '2xl', 'svg')
      }
    }
    // ... similar structure for other status icons
  } as Record<ProjectStatus, ImageAsset>
};

export const emptyStateImages: Record<EmptyStateType, ImageAsset> = {
  noTasks: {
    path: `${IMAGE_BASE_PATH}empty-states/no-tasks`,
    alt: 'No tasks found illustration',
    illustration: 'Illustration showing an empty task list',
    sizes: {
      xs: getImagePath('empty-states/no-tasks', 'xs'),
      sm: getImagePath('empty-states/no-tasks', 'sm'),
      md: getImagePath('empty-states/no-tasks', 'md'),
      lg: getImagePath('empty-states/no-tasks', 'lg'),
      xl: getImagePath('empty-states/no-tasks', 'xl'),
      '2xl': getImagePath('empty-states/no-tasks', '2xl')
    }
  }
  // ... similar structure for other empty states
};