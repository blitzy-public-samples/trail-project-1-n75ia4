-- PostgreSQL 15+ Migration: Initial Database Setup
-- Description: Establishes core database schema with comprehensive features
-- Version: 0000_initial_setup
-- Created At: CURRENT_TIMESTAMP

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID support
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- GiST index support
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption support
CREATE EXTENSION IF NOT EXISTS "tablefunc";      -- Advanced table functions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query statistics

-- Create Enum Types
CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'PROJECT_MANAGER',
    'TEAM_LEAD',
    'TEAM_MEMBER',
    'GUEST'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING_APPROVAL'
);

CREATE TYPE project_status AS ENUM (
    'PLANNING',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED'
);

CREATE TYPE task_status AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'COMPLETED',
    'BLOCKED',
    'ARCHIVED'
);

CREATE TYPE task_priority AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);

CREATE TYPE notification_type AS ENUM (
    'TASK_ASSIGNED',
    'COMMENT_ADDED',
    'STATUS_CHANGED',
    'DUE_DATE_APPROACHING'
);

-- Create Tables with Partitioning and Advanced Features

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'TEAM_MEMBER',
    status user_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
) PARTITION BY RANGE (created_at);

-- Create Users Partitions
CREATE TABLE users_current PARTITION OF users
    FOR VALUES FROM (TIMESTAMP '2024-01-01') TO (TIMESTAMP '2025-01-01');

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    status project_status NOT NULL DEFAULT 'PLANNING',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT project_dates_check CHECK (start_date <= end_date),
    EXCLUDE USING gist (
        owner_id WITH =,
        tstzrange(start_date, end_date) WITH &&
    )
) PARTITION BY RANGE (created_at);

-- Create Projects Partitions
CREATE TABLE projects_current PARTITION OF projects
    FOR VALUES FROM (TIMESTAMP '2024-01-01') TO (TIMESTAMP '2025-01-01');

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES projects(id),
    assignee_id UUID REFERENCES users(id),
    status task_status NOT NULL DEFAULT 'TODO',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT task_hours_check CHECK (estimated_hours >= 0 AND actual_hours >= 0)
) PARTITION BY RANGE (created_at);

-- Create Tasks Partitions
CREATE TABLE tasks_current PARTITION OF tasks
    FOR VALUES FROM (TIMESTAMP '2024-01-01') TO (TIMESTAMP '2025-01-01');

-- Comments Table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1
) PARTITION BY RANGE (created_at);

-- Create Comments Partitions
CREATE TABLE comments_current PARTITION OF comments
    FOR VALUES FROM (TIMESTAMP '2024-01-01') TO (TIMESTAMP '2025-01-01');

-- Attachments Table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id),
    user_id UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT attachment_size_check CHECK (file_size > 0)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Create Optimized Indexes

-- Users Indexes
CREATE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_search ON users USING gin (
    (to_tsvector('english', name || ' ' || email))
);

-- Projects Indexes
CREATE INDEX idx_projects_owner ON projects (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_dates ON projects USING gist (
    tstzrange(start_date, end_date)
) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_search ON projects USING gin (
    (to_tsvector('english', name || ' ' || COALESCE(description, '')))
);

-- Tasks Indexes
CREATE INDEX idx_tasks_project ON tasks (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON tasks (priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks (due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_search ON tasks USING gin (
    (to_tsvector('english', title || ' ' || COALESCE(description, '')))
);

-- Comments Indexes
CREATE INDEX idx_comments_task ON comments (task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user ON comments (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments (parent_id) WHERE deleted_at IS NULL;

-- Attachments Indexes
CREATE INDEX idx_attachments_task ON attachments (task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_user ON attachments (user_id) WHERE deleted_at IS NULL;

-- Audit Logs Indexes
CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

-- Create Triggers for Automated Timestamps and Versioning

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Updated At Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Audit Logging Trigger Function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), NEW.user_id);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.user_id);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), OLD.user_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create Audit Triggers
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_changes();

-- Add Table Comments
COMMENT ON TABLE users IS 'Stores user accounts with role-based access control';
COMMENT ON TABLE projects IS 'Stores project information with ownership and date ranges';
COMMENT ON TABLE tasks IS 'Stores task information with assignment and priority';
COMMENT ON TABLE comments IS 'Stores task comments with threading support';
COMMENT ON TABLE attachments IS 'Stores task attachments with file metadata';
COMMENT ON TABLE audit_logs IS 'Stores audit trail of all data changes';

-- Add Column Comments
COMMENT ON COLUMN users.role IS 'User role determining access permissions';
COMMENT ON COLUMN projects.status IS 'Current status of the project';
COMMENT ON COLUMN tasks.priority IS 'Task priority level';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated hours to complete the task';
COMMENT ON COLUMN attachments.content_hash IS 'SHA-256 hash of file content for integrity verification';