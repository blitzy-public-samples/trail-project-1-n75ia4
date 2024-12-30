# Task Management System - Staging Environment Configuration
# Version: 1.5.0+

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  # Configure backend for state management
  backend "s3" {
    bucket         = "task-management-terraform-state"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = "staging"
      Project     = "TaskManagementSystem"
      ManagedBy   = "Terraform"
    }
  }
}

# Root module configuration for staging environment
module "root" {
  source = "../../main"

  # Environment Configuration
  environment = "staging"
  region      = "us-west-2"

  # Network Configuration
  vpc_cidr           = "10.1.0.0/16"  # Staging VPC CIDR range
  availability_zones = ["us-west-2a", "us-west-2b"]  # Dual-AZ for cost optimization

  # EKS Configuration - Reduced size for staging
  eks_cluster_version    = "1.27"
  eks_node_instance_type = "t3.large"  # Cost-optimized instance type
  eks_min_nodes         = 2  # Minimum nodes for HA
  eks_max_nodes         = 4  # Maximum nodes for scaling
  eks_desired_nodes     = 2  # Default running nodes

  # RDS Configuration - Optimized for staging workload
  rds_instance_class       = "db.r6g.large"  # Right-sized for staging
  rds_multi_az            = false  # Single AZ for cost savings
  rds_backup_retention    = 7  # Reduced backup retention for staging
  rds_monitoring_interval = 60  # Standard monitoring interval
  rds_instance_count     = 1  # Single instance for staging

  # ElastiCache Configuration
  elasticache_node_type         = "cache.r6g.large"  # Right-sized for staging
  elasticache_num_cache_nodes   = 2  # Minimum for HA
  elasticache_parameter_family  = "redis7"
  elasticache_engine_version    = "7.0"
  elasticache_snapshot_retention = 7  # Reduced retention for staging

  # S3 Configuration
  s3_versioning_enabled = true
  s3_lifecycle_rules = {
    staging_lifecycle = {
      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = 365
      }
    }
  }

  # Cost Optimization Features
  enable_auto_shutdown = true  # Automatic shutdown of non-prod resources
  enable_spot_instances = true  # Use spot instances where possible

  # Resource Tags
  tags = {
    Environment     = "staging"
    Project         = "task-management-system"
    ManagedBy       = "terraform"
    CostCenter      = "staging-infrastructure"
    DataProtection  = "standard"
    SecurityLevel   = "high"
  }
}

# Outputs for staging environment
output "vpc_id" {
  description = "ID of the staging VPC"
  value       = module.root.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for staging EKS cluster"
  value       = module.root.eks_cluster_endpoint
  sensitive   = true
}

output "database_endpoint" {
  description = "Endpoint for staging RDS cluster"
  value       = module.root.database_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Endpoint for staging Redis cluster"
  value       = module.root.redis_endpoint
  sensitive   = true
}

output "storage_bucket" {
  description = "Name of the staging S3 storage bucket"
  value       = module.root.storage_bucket
}

output "cluster_security_group_id" {
  description = "Security group ID for the staging EKS cluster"
  value       = module.root.cluster_security_group_id
}

output "database_security_group_id" {
  description = "Security group ID for the staging RDS instance"
  value       = module.root.database_security_group_id
}

output "redis_security_group_id" {
  description = "Security group ID for the staging Redis cluster"
  value       = module.root.redis_security_group_id
}