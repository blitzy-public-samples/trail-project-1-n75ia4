# Project and Environment Configuration
project_name = "task-management-system"
environment  = "staging"
aws_region   = "us-west-2"  # Primary region for staging environment

# VPC and Network Configuration
vpc_cidr            = "10.1.0.0/16"  # Dedicated CIDR range for staging
availability_zones  = ["us-west-2a", "us-west-2b"]  # Dual AZ setup for staging

# EKS Configuration
eks_cluster_version    = "1.27"  # Latest stable version as per tech spec
eks_node_instance_type = "t3.xlarge"  # Cost-optimized for staging workloads
eks_node_group_sizes = {
  min_size     = 2
  max_size     = 6
  desired_size = 3
}

# Database Configuration
rds_instance_class = "db.r6g.xlarge"  # Balanced performance for staging
rds_engine_version = "15.3"
multi_az_enabled   = false  # Single AZ for staging to optimize costs

# Cache Configuration
elasticache_node_type    = "cache.r6g.large"  # Right-sized for staging workloads
elasticache_cluster_size = 2  # Minimum HA setup for staging

# Backup Configuration
backup_retention_days = 7  # Reduced retention for staging environment

# Monitoring Configuration
enable_detailed_monitoring = true
log_retention_days        = 14  # Reduced retention for staging logs

# Security Configuration
allowed_cidr_blocks = [
  "10.0.0.0/8",    # Internal corporate network
  "172.16.0.0/12"  # VPN network
]

# Resource Tagging
tags = {
  ManagedBy    = "terraform"
  Project      = "task-management-system"
  Environment  = "staging"
  CostCenter   = "task-mgmt-system"
  Owner        = "platform-team"
  Terraform    = "true"
}

# Cost Management
cost_center = "task-mgmt-staging"

# Scaling Configuration
autoscaling_metrics_enabled = true

# Storage Lifecycle Configuration
s3_lifecycle_rules = {
  logs = {
    enabled                   = true
    transition_to_standard_ia = 15
    transition_to_glacier     = 45
    expiration_days          = 90
  }
  backups = {
    enabled                   = true
    transition_to_standard_ia = 15
    transition_to_glacier     = 30
    expiration_days          = 90
  }
}