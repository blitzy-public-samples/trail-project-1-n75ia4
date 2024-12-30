/**
 * @fileoverview Project controller implementing RESTful endpoints for project management
 * with comprehensive security, validation, and monitoring features.
 * @version 1.0.0
 */

// External imports - versions specified in comments
import { Request, Response } from 'express'; // ^4.18.2
import { injectable } from 'inversify'; // ^6.0.1
import { controller, httpGet, httpPost, httpPut, httpDelete } from 'inversify-express-utils'; // ^6.4.3
import { monitor, trace } from '@opentelemetry/api'; // ^1.0.0

// Internal imports
import { ProjectService } from '../services/project.service';
import { 
  IProject, 
  ICreateProjectDTO, 
  IUpdateProjectDTO, 
  IProjectQueryParams 
} from '../interfaces/project.interface';
import { 
  authenticate, 
  authorize, 
  rateLimit 
} from '../middleware/auth.middleware';
import { UserRole } from '../types/user.types';
import { enhancedLogger as logger } from '../utils/logger.util';
import { createError } from '../utils/error.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';

/**
 * Controller handling project management operations with comprehensive security
 * and monitoring features.
 */
@injectable()
@controller('/api/v1/projects')
@monitor()
@trace()
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: typeof logger
  ) {}

  /**
   * Creates a new project with validation and security checks
   * @route POST /api/v1/projects
   */
  @httpPost('/')
  @authenticate
  @authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
  @rateLimit({ windowMs: 60000, max: 100 })
  async createProject(req: Request, res: Response): Promise<Response> {
    const correlationId = req.correlationId as string;
    
    try {
      this.logger.info('Creating new project', {
        correlationId,
        userId: req.user?.userId,
        data: req.body
      });

      const projectData: ICreateProjectDTO = req.body;
      const project = await this.projectService.createProject(
        projectData,
        req.user!.userId
      );

      this.logger.info('Project created successfully', {
        correlationId,
        projectId: project.id
      });

      return res.status(StatusCode.CREATED).json({
        status: 'success',
        data: project,
        correlationId
      });

    } catch (error) {
      this.logger.error('Project creation failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw createError(
        'Failed to create project',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        correlationId
      );
    }
  }

  /**
   * Updates an existing project with validation and access control
   * @route PUT /api/v1/projects/:id
   */
  @httpPut('/:id')
  @authenticate
  @authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
  @rateLimit({ windowMs: 60000, max: 100 })
  async updateProject(req: Request, res: Response): Promise<Response> {
    const correlationId = req.correlationId as string;
    const projectId = req.params.id;

    try {
      this.logger.info('Updating project', {
        correlationId,
        projectId,
        userId: req.user?.userId
      });

      const projectData: IUpdateProjectDTO = req.body;
      const project = await this.projectService.updateProject(
        projectId,
        projectData,
        req.user!.userId
      );

      this.logger.info('Project updated successfully', {
        correlationId,
        projectId
      });

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: project,
        correlationId
      });

    } catch (error) {
      this.logger.error('Project update failed', {
        correlationId,
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw createError(
        'Failed to update project',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        correlationId
      );
    }
  }

  /**
   * Retrieves a project by ID with access control
   * @route GET /api/v1/projects/:id
   */
  @httpGet('/:id')
  @authenticate
  @authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER])
  @rateLimit({ windowMs: 60000, max: 200 })
  async getProjectById(req: Request, res: Response): Promise<Response> {
    const correlationId = req.correlationId as string;
    const projectId = req.params.id;

    try {
      this.logger.debug('Retrieving project', {
        correlationId,
        projectId,
        userId: req.user?.userId
      });

      const project = await this.projectService.getProjectById(projectId);

      if (!project) {
        throw createError(
          'Project not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          correlationId
        );
      }

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: project,
        correlationId
      });

    } catch (error) {
      this.logger.error('Project retrieval failed', {
        correlationId,
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Lists projects with filtering, pagination, and access control
   * @route GET /api/v1/projects
   */
  @httpGet('/')
  @authenticate
  @authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER])
  @rateLimit({ windowMs: 60000, max: 200 })
  async getProjects(req: Request, res: Response): Promise<Response> {
    const correlationId = req.correlationId as string;
    
    try {
      this.logger.debug('Retrieving projects', {
        correlationId,
        userId: req.user?.userId,
        query: req.query
      });

      const queryParams: IProjectQueryParams = {
        ...req.query,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const { data: projects, total } = await this.projectService.getProjects(
        queryParams,
        req.user!.userId
      );

      return res.status(StatusCode.OK).json({
        status: 'success',
        data: projects,
        meta: {
          total,
          page: queryParams.page,
          limit: queryParams.limit,
          pages: Math.ceil(total / queryParams.limit)
        },
        correlationId
      });

    } catch (error) {
      this.logger.error('Projects retrieval failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw createError(
        'Failed to retrieve projects',
        StatusCode.INTERNAL_SERVER_ERROR,
        ErrorCode.DATABASE_ERROR,
        correlationId
      );
    }
  }

  /**
   * Deletes a project with access control and validation
   * @route DELETE /api/v1/projects/:id
   */
  @httpDelete('/:id')
  @authenticate
  @authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
  @rateLimit({ windowMs: 60000, max: 50 })
  async deleteProject(req: Request, res: Response): Promise<Response> {
    const correlationId = req.correlationId as string;
    const projectId = req.params.id;

    try {
      this.logger.info('Deleting project', {
        correlationId,
        projectId,
        userId: req.user?.userId
      });

      await this.projectService.deleteProject(projectId, req.user!.userId);

      this.logger.info('Project deleted successfully', {
        correlationId,
        projectId
      });

      return res.status(StatusCode.NO_CONTENT).send();

    } catch (error) {
      this.logger.error('Project deletion failed', {
        correlationId,
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw createError(
        'Failed to delete project',
        StatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        correlationId
      );
    }
  }
}