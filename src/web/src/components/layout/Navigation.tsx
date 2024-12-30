/**
 * @fileoverview Enhanced Navigation component implementing secure navigation,
 * accessibility features, and analytics tracking based on Material Design 3.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  Divider,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Task as TaskIcon,
  Folder as FolderIcon,
  Group as GroupIcon,
  BarChart as BarChartIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { PRIVATE_ROUTES } from '../../constants/routes.constants';
import { useAuth } from '../../hooks/useAuth';

// Navigation item interface with security metadata
interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  requiredRole?: string;
  analyticsId: string;
  ariaLabel: string;
}

// Props interface with security context
interface NavigationProps {
  isMobile: boolean;
  onClose: () => void;
  securityContext?: {
    allowedRoutes: string[];
    userPermissions: string[];
  };
}

/**
 * Enhanced Navigation component with security features and accessibility
 */
const Navigation: React.FC<NavigationProps> = ({
  isMobile,
  onClose,
  securityContext
}) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, checkRouteAccess } = useAuth();
  const [activeRoute, setActiveRoute] = useState<string>('');

  // Navigation items with security metadata
  const navigationItems: NavigationItem[] = [
    {
      path: PRIVATE_ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: <DashboardIcon />,
      analyticsId: 'nav_dashboard',
      ariaLabel: 'Navigate to Dashboard'
    },
    {
      path: PRIVATE_ROUTES.TASKS,
      label: 'Tasks',
      icon: <TaskIcon />,
      analyticsId: 'nav_tasks',
      ariaLabel: 'Navigate to Tasks'
    },
    {
      path: PRIVATE_ROUTES.PROJECTS,
      label: 'Projects',
      icon: <FolderIcon />,
      analyticsId: 'nav_projects',
      ariaLabel: 'Navigate to Projects'
    },
    {
      path: PRIVATE_ROUTES.TEAM,
      label: 'Team',
      icon: <GroupIcon />,
      analyticsId: 'nav_team',
      ariaLabel: 'Navigate to Team'
    },
    {
      path: PRIVATE_ROUTES.REPORTS,
      label: 'Reports',
      icon: <BarChartIcon />,
      analyticsId: 'nav_reports',
      ariaLabel: 'Navigate to Reports'
    }
  ];

  // Update active route with security validation
  useEffect(() => {
    const validateAndSetRoute = async () => {
      if (isAuthenticated && location.pathname) {
        const hasAccess = await checkRouteAccess(location.pathname);
        if (hasAccess) {
          setActiveRoute(location.pathname);
        }
      }
    };
    validateAndSetRoute();
  }, [location, isAuthenticated, checkRouteAccess]);

  // Enhanced navigation handler with security and analytics
  const handleNavigation = useCallback(async (item: NavigationItem) => {
    try {
      // Security checks
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }

      const hasAccess = await checkRouteAccess(item.path);
      if (!hasAccess) {
        throw new Error('Insufficient permissions');
      }

      // Track navigation attempt
      console.debug('Navigation attempt:', {
        path: item.path,
        user: user?.id,
        timestamp: new Date().toISOString()
      });

      // Perform navigation
      navigate(item.path);
      setActiveRoute(item.path);

      // Close mobile navigation if needed
      if (isMobile) {
        onClose();
      }
    } catch (error) {
      console.error('Navigation failed:', error);
      // Handle navigation error (e.g., show notification)
    }
  }, [isAuthenticated, user, navigate, isMobile, onClose, checkRouteAccess]);

  // Drawer content with accessibility enhancements
  const drawerContent = (
    <Box
      role="navigation"
      aria-label="Main navigation"
      sx={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton
            onClick={onClose}
            aria-label="Close navigation menu"
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      <Divider />

      <List component="nav" aria-label="Main navigation list">
        {navigationItems.map((item) => (
          <Tooltip
            key={item.path}
            title={item.label}
            placement="right"
            arrow
          >
            <ListItem
              button
              onClick={() => handleNavigation(item)}
              selected={activeRoute === item.path}
              aria-current={activeRoute === item.path ? 'page' : undefined}
              aria-label={item.ariaLabel}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '20',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main + '30',
                  }
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: activeRoute === item.path
                    ? theme.palette.primary.main
                    : 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  color: activeRoute === item.path
                    ? theme.palette.primary.main
                    : 'inherit'
                }}
              />
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? true : undefined}
      onClose={isMobile ? onClose : undefined}
      ModalProps={{
        keepMounted: true // Better mobile performance
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: theme.shadows[3]
        }
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Navigation;