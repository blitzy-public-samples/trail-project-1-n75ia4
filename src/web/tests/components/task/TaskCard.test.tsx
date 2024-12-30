import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, describe, it, beforeEach } from 'vitest';
import { DndProvider, useDrag, useDrop } from 'react-dnd-test-utils';

import TaskCard from '../../../../src/components/task/TaskCard';
import { Task, TaskStatus, TaskPriority } from '../../../../src/types/task.types';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ThemeMode } from '../../../../src/constants/theme.constants';

// Mock the hooks
vi.mock('../../../../src/hooks/useTheme');
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null
  })
}));

// Mock task data
const mockTask: Task = {
  id: 'task-123',
  title: 'Test Task',
  description: 'Test task description',
  status: TaskStatus.TODO,
  priority: TaskPriority.HIGH,
  assigneeId: 'user-123',
  projectId: 'project-123',
  dueDate: new Date('2024-03-15'),
  attachments: ['file1.pdf', 'file2.jpg'],
  tags: ['important', 'frontend'],
  metadata: {},
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01')
};

// Mock handlers
const mockHandlers = {
  onStatusChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn()
};

// Setup function for common test configuration
const setup = (props = {}, { isDraggable = true, isHighContrast = false } = {}) => {
  (useTheme as jest.Mock).mockReturnValue({
    themeMode: ThemeMode.LIGHT,
    isHighContrast,
    contrastRatio: isHighContrast ? 7 : 4.5
  });

  return render(
    <DndProvider>
      <TaskCard
        task={mockTask}
        {...mockHandlers}
        isDraggable={isDraggable}
        {...props}
      />
    </DndProvider>
  );
};

describe('TaskCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders task information correctly', () => {
      setup();

      // Verify basic task information
      expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      expect(screen.getByText(mockTask.description)).toBeInTheDocument();
      expect(screen.getByText(mockTask.status)).toBeInTheDocument();
      expect(screen.getByText(mockTask.priority)).toBeInTheDocument();

      // Verify date formatting
      expect(screen.getByText('Mar 15, 2024')).toBeInTheDocument();

      // Verify attachments indicator
      expect(screen.getByText('📎 2')).toBeInTheDocument();
    });

    it('applies correct accessibility attributes', () => {
      setup();

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', `Task: ${mockTask.title}`);

      const status = screen.getByRole('status', { name: mockTask.status });
      expect(status).toBeInTheDocument();

      const priority = screen.getByRole('status', { name: `Priority: ${mockTask.priority}` });
      expect(priority).toBeInTheDocument();

      const actions = screen.getByRole('toolbar');
      expect(actions).toHaveAttribute('aria-label', 'Task actions');
    });

    it('renders in high contrast mode correctly', () => {
      setup({}, { isHighContrast: true });

      const card = screen.getByRole('article');
      expect(card).toHaveClass('highContrast');
    });
  });

  describe('Interactions', () => {
    it('handles status change correctly', async () => {
      setup();

      const statusButton = screen.getByRole('button', { name: 'Change status' });
      await userEvent.click(statusButton);

      expect(mockHandlers.onStatusChange).toHaveBeenCalledWith(
        mockTask.id,
        TaskStatus.IN_PROGRESS
      );
    });

    it('handles edit action correctly', async () => {
      setup();

      const editButton = screen.getByRole('button', { name: 'Edit task' });
      await userEvent.click(editButton);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockTask.id);
    });

    it('handles delete action with confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      confirmSpy.mockReturnValue(true);
      
      setup();

      const deleteButton = screen.getByRole('button', { name: 'Delete task' });
      await userEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockTask.id);
    });
  });

  describe('Drag and Drop', () => {
    it('supports keyboard-based drag and drop', async () => {
      setup();

      const card = screen.getByRole('article');
      
      // Start drag with keyboard
      await userEvent.tab();
      await userEvent.keyboard('{Space}');
      
      expect(card).toHaveAttribute('aria-grabbed', 'true');

      // End drag
      await userEvent.keyboard('{Space}');
      expect(card).toHaveAttribute('aria-grabbed', 'false');
    });

    it('disables drag and drop when isDraggable is false', () => {
      setup({}, { isDraggable: false });

      const card = screen.getByRole('article');
      expect(card).not.toHaveClass('isDraggable');
    });
  });

  describe('Theme Support', () => {
    it('applies correct theme-based styles', () => {
      (useTheme as jest.Mock).mockReturnValue({
        themeMode: ThemeMode.DARK,
        isHighContrast: false,
        contrastRatio: 4.5
      });

      setup();

      const card = screen.getByRole('article');
      expect(card).toHaveClass('darkMode');
    });

    it('handles theme transitions correctly', async () => {
      const { rerender } = setup();

      (useTheme as jest.Mock).mockReturnValue({
        themeMode: ThemeMode.DARK,
        isHighContrast: false,
        contrastRatio: 4.5
      });

      rerender(
        <DndProvider>
          <TaskCard task={mockTask} {...mockHandlers} />
        </DndProvider>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle('transition: transform 200ms ease');
    });
  });

  describe('Error Handling', () => {
    it('handles status change errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockHandlers.onStatusChange.mockRejectedValueOnce(new Error('Update failed'));

      setup();

      const statusButton = screen.getByRole('button', { name: 'Change status' });
      await userEvent.click(statusButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update task status:',
        expect.any(Error)
      );
    });

    it('handles delete errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockHandlers.onDelete.mockRejectedValueOnce(new Error('Delete failed'));
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      setup();

      const deleteButton = screen.getByRole('button', { name: 'Delete task' });
      await userEvent.click(deleteButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete task:',
        expect.any(Error)
      );
    });
  });
});