import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import { useNotification, useTheme, useMediaQuery } from '@mui/material'; // v5.0.0
import Table from '../../components/common/Table';
import { userApi } from '../../api/user.api';
import { 
  User, 
  UserRole, 
  UserStatus, 
  UserQueryParams 
} from '../../types/user.types';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface TeamTableColumn {
  id: string;
  label: string;
  accessor: string | ((row: User) => any);
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: User) => React.ReactNode;
}

interface SortConfig {
  id: string;
  direction: 'asc' | 'desc';
}

interface FilterState {
  roles: UserRole[];
  status: UserStatus[];
  searchTerm: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

const INITIAL_FILTERS: FilterState = {
  roles: [],
  status: [UserStatus.ACTIVE],
  searchTerm: ''
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Team: React.FC = () => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const notification = useNotification();

  // State management
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Table columns configuration
  const columns = useMemo<TeamTableColumn[]>(() => [
    {
      id: 'name',
      label: 'Name',
      accessor: 'name',
      sortable: true,
      width: '25%',
      render: (value, user) => (
        <div className="team-member-name">
          <span className="member-name">{value}</span>
          <span className="member-email">{user.email}</span>
        </div>
      )
    },
    {
      id: 'role',
      label: 'Role',
      accessor: 'role',
      sortable: true,
      width: '20%',
      render: (value: UserRole) => (
        <span className={`role-badge role-badge--${value.toLowerCase()}`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    {
      id: 'status',
      label: 'Status',
      accessor: 'status',
      sortable: true,
      width: '15%',
      render: (value: UserStatus) => (
        <span className={`status-indicator status-indicator--${value.toLowerCase()}`}>
          {value}
        </span>
      )
    },
    {
      id: 'createdAt',
      label: 'Join Date',
      accessor: 'createdAt',
      sortable: true,
      width: '20%',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: 'id',
      width: '20%',
      render: (_, user) => (
        <div className="team-member-actions">
          <button
            onClick={() => handleEditMember(user)}
            className="action-button"
            aria-label={`Edit ${user.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteMember(user.id)}
            className="action-button action-button--danger"
            aria-label={`Delete ${user.name}`}
            disabled={user.role === UserRole.ADMIN}
          >
            Delete
          </button>
        </div>
      )
    }
  ], []);

  // Fetch team members with filters and pagination
  const fetchTeamMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams: UserQueryParams = {
        page: currentPage,
        limit: PAGE_SIZE,
        roles: filters.roles,
        status: filters.status,
        searchTerm: filters.searchTerm,
        sort: sortConfig.map(sort => `${sort.id}:${sort.direction}`)
      };

      const response = await userApi.getUsers(queryParams);
      setTeamMembers(response.items);
      setTotalItems(response.total);
    } catch (err) {
      setError('Failed to load team members. Please try again.');
      notification.error({
        message: 'Error',
        description: 'Failed to load team members'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, sortConfig, notification]);

  // Handle member addition
  const handleAddMember = useCallback(async (userData: Partial<User>) => {
    try {
      await userApi.createUser({
        ...userData,
        role: userData.role || UserRole.TEAM_MEMBER,
        status: UserStatus.ACTIVE
      });
      
      notification.success({
        message: 'Success',
        description: 'Team member added successfully'
      });
      
      fetchTeamMembers();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: 'Failed to add team member'
      });
    }
  }, [fetchTeamMembers, notification]);

  // Handle member deletion
  const handleDeleteMember = useCallback(async (userId: string) => {
    try {
      await userApi.deleteUser(userId);
      
      notification.success({
        message: 'Success',
        description: 'Team member removed successfully'
      });
      
      fetchTeamMembers();
    } catch (err) {
      notification.error({
        message: 'Error',
        description: 'Failed to remove team member'
      });
    }
  }, [fetchTeamMembers, notification]);

  // Handle member editing
  const handleEditMember = useCallback(async (user: User) => {
    // Implementation for edit modal/form would go here
    console.log('Edit member:', user);
  }, []);

  // Handle sort changes
  const handleSort = useCallback((sortedColumns: SortConfig[]) => {
    setSortConfig(sortedColumns);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  }, []);

  // Initial load and filter/sort changes
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return (
    <div className="team-settings" role="region" aria-label="Team Management">
      <header className="team-settings__header">
        <h1>Team Management</h1>
        <button
          onClick={() => handleAddMember({})}
          className="add-member-button"
          aria-label="Add new team member"
        >
          Add Member
        </button>
      </header>

      <div className="team-settings__filters">
        {/* Filter controls would go here */}
      </div>

      <Table
        data={teamMembers}
        columns={columns}
        loading={loading}
        error={error}
        sortable
        multiSort
        selectable
        stickyHeader
        responsive
        pagination
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        onSort={handleSort}
        onPageChange={setCurrentPage}
        onSelect={setSelectedMembers}
        className="team-settings__table"
        emptyMessage="No team members found"
        loadingMessage="Loading team members..."
        errorMessage={error}
      />
    </div>
  );
};

export default Team;