# Project and Environment Configuration
# Version: 1.0.0
project_name = "task-management-system"
environment  = "dev"
aws_region   = "us-west-2"

# VPC and Network Configuration
vpc_cidr = "10.0.0.0/16"
# Single AZ deployment for development as per Technical Specifications section 8.1
availability_zones = [
  "us-west-2a"
]

# EKS Configuration
eks_cluster_version    = "1.27"  # Latest stable version as per Technical Specifications section 8.2
eks_node_instance_type = "t3.medium"  # Cost-effective instance for development workloads
eks_desired_capacity   = 2  # Minimal node count for development
eks_min_size          = 1
eks_max_size          = 3

# RDS Configuration
rds_instance_class    = "db.t3.medium"  # Development-appropriate instance size
rds_allocated_storage = 20  # Minimal storage for development
rds_engine_version    = "15"  # PostgreSQL version as per Technical Specifications
rds_multi_az         = false  # Single AZ deployment for development

# ElastiCache Configuration
elasticache_node_type  = "cache.t3.micro"  # Minimal instance for development
elasticache_num_nodes  = 1  # Single node for development
elasticache_port       = 6379
elasticache_parameters = {
  "maxmemory-policy" = "allkeys-lru"
}

# S3 Configuration
s3_versioning = true
s3_lifecycle_rules = {
  dev_rule = {
    enabled = true
    expiration_days = 30  # Shorter retention for development environment
  }
}

# Common Tags
tags = {
  Environment     = "development"
  Project         = "task-management-system"
  ManagedBy       = "terraform"
  Debug           = "enabled"  # Debug enabled for development environment
  CostCenter      = "dev-ops"
  DataClass       = "internal"
}

# Security Group Rules
security_group_rules = {
  allow_all_internal = {
    type        = "ingress"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
  allow_ssh = {
    type        = "ingress"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Warning: Wide open for development only
  }
}

# Monitoring Configuration
enable_detailed_monitoring = true  # Enhanced monitoring for development debugging
cloudwatch_retention_days = 7      # Shorter log retention for development
alarm_evaluation_periods  = 2
alarm_threshold_period    = 300

# Backup Configuration
backup_retention_period = 3  # Minimal backup retention for development
enable_backup_window   = true
backup_window         = "03:00-04:00"
maintenance_window    = "Mon:04:00-Mon:05:00"

# Development-specific Feature Flags
enable_debug_logging     = true
enable_dev_tools        = true
skip_final_snapshot     = true  # Skip final snapshot for easier cleanup
apply_immediately       = true  # Allow immediate changes in development