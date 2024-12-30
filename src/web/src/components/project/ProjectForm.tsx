import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form'; // v7.0+
import { useTranslation } from 'react-i18next'; // v13.0.0
import { debounce } from 'lodash'; // v4.17.21
import { 
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material'; // v5.0+
import { DatePicker } from '@mui/x-date-pickers'; // v5.0+
import { useTheme } from '../../hooks/useTheme';

// Types and Interfaces
interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  autoSave?: boolean;
  autoSaveInterval?: number;
  parentProjects?: ProjectHierarchy[];
  availableTeamMembers?: TeamMember[];
  onValidationError?: (errors: Record<string, string>) => void;
  onProgressUpdate?: (progress: number) => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  parentProjectId?: string;
  teamMembers: string[];
  priority: ProjectPriority;
  tags: string[];
}

enum ProjectStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed'
}

enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// Form validation schema
const validationSchema = {
  name: {
    required: 'Project name is required',
    minLength: { value: 3, message: 'Name must be at least 3 characters' },
    maxLength: { value: 100, message: 'Name cannot exceed 100 characters' }
  },
  description: {
    maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
  },
  startDate: {
    required: 'Start date is required',
    validate: (value: Date) => value <= new Date() || 'Start date cannot be in the past'
  },
  endDate: {
    required: 'End date is required',
    validate: (value: Date, formValues: ProjectFormData) => 
      value > formValues.startDate || 'End date must be after start date'
  }
};

// Analytics tracking
class ProjectFormAnalytics {
  private static instance: ProjectFormAnalytics;
  private formId: string;

  private constructor(formId: string) {
    this.formId = formId;
  }

  static getInstance(formId: string): ProjectFormAnalytics {
    if (!ProjectFormAnalytics.instance) {
      ProjectFormAnalytics.instance = new ProjectFormAnalytics(formId);
    }
    return ProjectFormAnalytics.instance;
  }

  trackInteraction(event: string, details?: Record<string, any>): void {
    // Implementation would connect to your analytics service
    console.debug('Form interaction:', { formId: this.formId, event, details });
  }
}

// Custom hooks
const useFormValidation = (schema: any, initialData?: ProjectFormData) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
    setValue,
    reset
  } = useForm<ProjectFormData>({
    defaultValues: initialData,
    mode: 'onChange'
  });

  const validateField = useCallback(debounce((field: string, value: any) => {
    // Field-level validation logic
  }, 300), []);

  return {
    control,
    handleSubmit,
    errors,
    isDirty,
    isValid,
    watch,
    setValue,
    reset,
    validateField
  };
};

const useAutoSave = (
  formData: ProjectFormData,
  interval: number,
  saveCallback: (data: ProjectFormData) => Promise<void>
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>(JSON.stringify(formData));

  useEffect(() => {
    if (!interval) return;

    const hasChanges = JSON.stringify(formData) !== lastSavedRef.current;
    
    if (hasChanges) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          await saveCallback(formData);
          lastSavedRef.current = JSON.stringify(formData);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, interval);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, interval, saveCallback]);
};

// Main component
export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
  autoSave = false,
  autoSaveInterval = 30000,
  parentProjects = [],
  availableTeamMembers = [],
  onValidationError,
  onProgressUpdate
}) => {
  const { t } = useTranslation();
  const { themeMode, isHighContrast } = useTheme();
  const analytics = useMemo(() => 
    ProjectFormAnalytics.getInstance(`project-form-${Date.now()}`),
    []
  );

  const {
    control,
    handleSubmit,
    errors,
    isDirty,
    isValid,
    watch,
    setValue,
    reset,
    validateField
  } = useFormValidation(validationSchema, initialData);

  const formData = watch();

  useAutoSave(formData, autoSave ? autoSaveInterval : 0, onSubmit);

  const handleFormSubmit = async (data: ProjectFormData) => {
    try {
      await onSubmit(data);
      analytics.trackInteraction('form_submit_success');
      reset(data);
    } catch (error) {
      analytics.trackInteraction('form_submit_error', { error });
      // Handle error appropriately
    }
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0 && onValidationError) {
      onValidationError(errors);
    }
  }, [errors, onValidationError]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label={t('project.form.title')}
      sx={{ width: '100%', maxWidth: 800 }}
    >
      <Stack spacing={3}>
        <Controller
          name="name"
          control={control}
          rules={validationSchema.name}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('project.form.name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              required
              fullWidth
              disabled={isLoading}
              inputProps={{
                'aria-label': t('project.form.name'),
                maxLength: 100
              }}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          rules={validationSchema.description}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('project.form.description')}
              multiline
              rows={4}
              error={!!errors.description}
              helperText={errors.description?.message}
              fullWidth
              disabled={isLoading}
              inputProps={{
                'aria-label': t('project.form.description'),
                maxLength: 1000
              }}
            />
          )}
        />

        <Stack direction="row" spacing={2}>
          <Controller
            name="startDate"
            control={control}
            rules={validationSchema.startDate}
            render={({ field }) => (
              <DatePicker
                {...field}
                label={t('project.form.startDate')}
                disabled={isLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!errors.startDate}
                    helperText={errors.startDate?.message}
                    required
                  />
                )}
              />
            )}
          />

          <Controller
            name="endDate"
            control={control}
            rules={validationSchema.endDate}
            render={({ field }) => (
              <DatePicker
                {...field}
                label={t('project.form.endDate')}
                disabled={isLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!errors.endDate}
                    helperText={errors.endDate?.message}
                    required
                  />
                )}
              />
            )}
          />
        </Stack>

        {/* Additional form fields omitted for brevity */}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {onCancel && (
            <Button
              onClick={onCancel}
              disabled={isLoading}
              aria-label={t('common.cancel')}
            >
              {t('common.cancel')}
            </Button>
          )}
          
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !isDirty || !isValid}
            aria-label={t('common.save')}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {t('common.save')}
          </Button>
        </Stack>

        {autoSave && isDirty && (
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ mt: 1, textAlign: 'right' }}
          >
            {t('common.autoSave')}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ProjectForm;