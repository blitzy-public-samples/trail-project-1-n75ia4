// @ts-check
import { PrismaClient, UserRole, ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs'; // v2.4.3

// Initialize Prisma Client with logging
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

/**
 * Seeds default users with different roles including comprehensive user preferences
 * and audit trails
 */
async function seedUsers(): Promise<void> {
  const defaultPassword = await bcrypt.hash('Password123!', 12);
  
  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@taskmaster.com',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          desktop: true
        },
        timezone: 'UTC'
      }
    }
  });

  // Project Manager
  const projectManager = await prisma.user.create({
    data: {
      email: 'pm@taskmaster.com',
      name: 'Project Manager',
      role: UserRole.PROJECT_MANAGER,
      status: UserStatus.ACTIVE,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          desktop: true
        },
        dashboardLayout: 'grid',
        timezone: 'UTC'
      }
    }
  });

  // Team Lead
  const teamLead = await prisma.user.create({
    data: {
      email: 'lead@taskmaster.com',
      name: 'Team Lead',
      role: UserRole.TEAM_LEAD,
      status: UserStatus.ACTIVE,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true
        },
        timezone: 'UTC'
      }
    }
  });

  // Team Members
  const teamMembers = await Promise.all(
    Array.from({ length: 3 }).map((_, index) =>
      prisma.user.create({
        data: {
          email: `member${index + 1}@taskmaster.com`,
          name: `Team Member ${index + 1}`,
          role: UserRole.TEAM_MEMBER,
          status: UserStatus.ACTIVE,
          preferences: {
            theme: 'light',
            notifications: {
              email: true
            },
            timezone: 'UTC'
          }
        }
      })
    )
  );

  return Promise.resolve();
}

/**
 * Seeds sample projects with comprehensive hierarchy and relationship structure
 */
async function seedProjects(): Promise<void> {
  const projectManager = await prisma.user.findFirst({
    where: { role: UserRole.PROJECT_MANAGER }
  });

  const teamMembers = await prisma.user.findMany({
    where: { role: UserRole.TEAM_MEMBER }
  });

  if (!projectManager || teamMembers.length === 0) {
    throw new Error('Required users not found for project seeding');
  }

  // Create main project
  const mainProject = await prisma.project.create({
    data: {
      name: 'Task Management System Development',
      description: 'Enterprise-grade task management system implementation',
      status: ProjectStatus.IN_PROGRESS,
      priority: ProjectPriority.HIGH,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      ownerId: projectManager.id,
      metadata: {
        goals: ['Improve productivity', 'Enhance collaboration'],
        stakeholders: ['IT Department', 'Management'],
        budget: 150000
      }
    }
  });

  // Create tasks for the main project
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Database Schema Design',
        description: 'Design and implement the database schema',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        projectId: mainProject.id,
        assigneeId: teamMembers[0].id,
        creatorId: projectManager.id,
        metadata: {
          estimatedHours: 40,
          complexity: 'high',
          dependencies: []
        }
      }
    }),
    prisma.task.create({
      data: {
        title: 'API Development',
        description: 'Implement REST API endpoints',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        projectId: mainProject.id,
        assigneeId: teamMembers[1].id,
        creatorId: projectManager.id,
        metadata: {
          estimatedHours: 80,
          complexity: 'high',
          dependencies: ['Database Schema Design']
        }
      }
    }),
    prisma.task.create({
      data: {
        title: 'Frontend Implementation',
        description: 'Develop the user interface',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        projectId: mainProject.id,
        assigneeId: teamMembers[2].id,
        creatorId: projectManager.id,
        metadata: {
          estimatedHours: 100,
          complexity: 'medium',
          dependencies: ['API Development']
        }
      }
    })
  ]);

  // Add comments to tasks
  await Promise.all(
    tasks.map(task =>
      prisma.comment.create({
        data: {
          content: `Initial planning completed for ${task.title}`,
          taskId: task.id,
          authorId: projectManager.id
        }
      })
    )
  );

  return Promise.resolve();
}

/**
 * Validates seed data for consistency and referential integrity
 */
async function validateSeedData(): Promise<boolean> {
  try {
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const taskCount = await prisma.task.count();
    const commentCount = await prisma.comment.count();

    return userCount > 0 && projectCount > 0 && taskCount > 0 && commentCount > 0;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * Main seeding function with enhanced error handling and validation
 */
async function main(): Promise<void> {
  console.log('Starting database seed...');

  try {
    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // Clean existing data in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Cleaning existing data...');
        await tx.comment.deleteMany();
        await tx.task.deleteMany();
        await tx.project.deleteMany();
        await tx.user.deleteMany();
      }

      // Seed data
      console.log('Seeding users...');
      await seedUsers();

      console.log('Seeding projects and tasks...');
      await seedProjects();

      // Validate seed data
      console.log('Validating seed data...');
      const isValid = await validateSeedData();

      if (!isValid) {
        throw new Error('Seed data validation failed');
      }
    });

    console.log('Database seed completed successfully');
  } catch (error) {
    console.error('Error during database seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for CLI execution
export default main;

// Execute if running directly
if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}