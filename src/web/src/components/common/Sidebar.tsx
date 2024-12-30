import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useMediaQuery, Drawer, List, ListItem, ListItemIcon, ListItemText, Collapse } from '@mui/material';
import classNames from 'classnames';
import { useAuth } from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';

// Material Icons for navigation items
import DashboardIcon from '@mui/icons-material/Dashboard';
import TaskIcon from '@mui/icons-material/Assignment';
import ProjectIcon from '@mui/icons-material/Folder';
import TeamIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Assessment';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

// Constants
const SIDEBAR_WIDTH = 280;
const MOBILE_BREAKPOINT = 768;

// Interfaces
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children?: React.ReactNode;
  elevation?: number;
  variant?: 'permanent' | 'temporary';
  role?: string;
  'aria-label'?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiredRole: string[];
  children?: NavigationItem[];
}

// Navigation configuration with role-based access
const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'GUEST']
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: <TaskIcon />,
    path: '/tasks',
    requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER'],
    children: [
      {
        id: 'active-tasks',
        label: 'Active Tasks',
        icon: <TaskIcon />,
        path: '/tasks/active',
        requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER']
      },
      {
        id: 'completed-tasks',
        label: 'Completed Tasks',
        icon: <TaskIcon />,
        path: '/tasks/completed',
        requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER']
      }
    ]
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: <ProjectIcon />,
    path: '/projects',
    requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'],
    children: [
      {
        id: 'active-projects',
        label: 'Active Projects',
        icon: <ProjectIcon />,
        path: '/projects/active',
        requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']
      },
      {
        id: 'project-board',
        label: 'Project Board',
        icon: <ProjectIcon />,
        path: '/projects/board',
        requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']
      }
    ]
  },
  {
    id: 'team',
    label: 'Team',
    icon: <TeamIcon />,
    path: '/team',
    requiredRole: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <ReportIcon />,
    path: '/reports',
    requiredRole: ['ADMIN', 'PROJECT_MANAGER']
  }
];

const Sidebar: React.FC<SidebarProps> = memo(({
  isOpen,
  onClose,
  className,
  elevation = 8,
  variant = 'permanent',
  role = 'navigation',
  'aria-label': ariaLabel = 'Main navigation'
}) => {
  const { isAuthenticated, user, userRole } = useAuth();
  const { themeMode } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle window resize with debouncing
  const handleResize = useCallback(() => {
    const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
    setIsMobile(newIsMobile);
    if (newIsMobile && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Handle clicks outside sidebar on mobile
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      isMobile &&
      isOpen &&
      sidebarRef.current &&
      !sidebarRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  }, [isMobile, isOpen, onClose]);

  // Set up event listeners
  useEffect(() => {
    const debouncedResize = debounce(handleResize, 250);
    window.addEventListener('resize', debouncedResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleResize, handleClickOutside]);

  // Toggle nested navigation items
  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  };

  // Render navigation items with role-based access control
  const renderNavigationItems = useCallback((items: NavigationItem[]) => {
    return items.map(item => {
      // Check role-based access
      if (!item.requiredRole.includes(userRole)) {
        return null;
      }

      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <React.Fragment key={item.id}>
          <ListItem
            button
            onClick={() => hasChildren ? toggleItem(item.id) : null}
            className={classNames('sidebar__item', {
              'sidebar__item--expanded': isExpanded
            })}
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            <ListItemIcon className="sidebar__item-icon">
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              className="sidebar__item-text"
            />
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItem>
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {renderNavigationItems(item.children)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  }, [expandedItems, userRole]);

  // Utility function for debouncing
  function debounce(fn: Function, ms: number) {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Drawer
      ref={sidebarRef}
      variant={isMobile ? 'temporary' : variant}
      open={isOpen}
      onClose={onClose}
      className={classNames('sidebar', className, {
        'sidebar--mobile': isMobile,
        'sidebar--dark': themeMode === 'dark',
        'sidebar--high-contrast': themeMode === 'high-contrast'
      })}
      classes={{
        paper: 'sidebar__paper'
      }}
      elevation={elevation}
      role={role}
      aria-label={ariaLabel}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <div className="sidebar__content">
        <List component="nav" aria-label="Main navigation">
          {renderNavigationItems(navigationItems)}
        </List>
      </div>
    </Drawer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;