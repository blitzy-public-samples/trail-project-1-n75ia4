/**
 * @fileoverview Express router configuration for project management endpoints
 * Implements secure routing with enhanced monitoring and error handling
 * @version 1.0.0
 */

// External imports
import express, { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Internal imports
import { ProjectController } from '../controllers/project.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/user.types';
import { enhancedLogger as logger } from '../utils/logger.util';
import { createError } from '../utils/error.util';
import { StatusCode } from '../constants/status-codes';
import { ErrorCode } from '../constants/error-codes';
import { ProjectQueryParams } from '../types/project.types';

// Initialize router
const projectRouter: Router = express.Router();

// Initialize controller
const projectController = new ProjectController();

// Configure security headers
projectRouter.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"]
    }
  },
  referrerPolicy: { policy: 'same-origin' }
}));

// Configure rate limiting
const projectRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

projectRouter.use(projectRateLimiter);

/**
 * GET /api/v1/projects
 * Retrieves paginated list of projects with filtering
 */
projectRouter.get('/',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('Retrieving projects list', {
        correlationId: req.correlationId,
        query: req.query
      });

      const queryParams: ProjectQueryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        status: req.query.status as any,
        priority: req.query.priority as any,
        search: req.query.search as string
      };

      const projects = await projectController.getProjects(queryParams);

      logger.info('Projects retrieved successfully', {
        correlationId: req.correlationId,
        count: projects.data.length
      });

      res.json(projects);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/projects/:id
 * Retrieves a specific project by ID
 */
projectRouter.get('/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('Retrieving project details', {
        correlationId: req.correlationId,
        projectId: req.params.id
      });

      const project = await projectController.getProjectById(req.params.id);

      if (!project) {
        throw createError(
          'Project not found',
          StatusCode.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          req.correlationId
        );
      }

      logger.info('Project retrieved successfully', {
        correlationId: req.correlationId,
        projectId: req.params.id
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/projects
 * Creates a new project
 */
projectRouter.post('/',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('Creating new project', {
        correlationId: req.correlationId,
        userId: req.user?.userId
      });

      const project = await projectController.createProject(req.body);

      logger.info('Project created successfully', {
        correlationId: req.correlationId,
        projectId: project.id
      });

      res.status(StatusCode.CREATED).json(project);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/projects/:id
 * Updates an existing project
 */
projectRouter.put('/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('Updating project', {
        correlationId: req.correlationId,
        projectId: req.params.id,
        userId: req.user?.userId
      });

      const project = await projectController.updateProject(
        req.params.id,
        req.body
      );

      logger.info('Project updated successfully', {
        correlationId: req.correlationId,
        projectId: req.params.id
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/projects/:id
 * Deletes a project
 */
projectRouter.delete('/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.PROJECT_MANAGER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('Deleting project', {
        correlationId: req.correlationId,
        projectId: req.params.id,
        userId: req.user?.userId
      });

      await projectController.deleteProject(req.params.id);

      logger.info('Project deleted successfully', {
        correlationId: req.correlationId,
        projectId: req.params.id
      });

      res.status(StatusCode.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }
);

export default projectRouter;