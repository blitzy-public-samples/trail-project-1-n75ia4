# Task Management System - Production Environment Configuration
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

  # Production state management with encryption and locking
  backend "s3" {
    bucket         = "task-management-terraform-state-prod"
    key            = "environments/prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock-prod"
    
    # Enhanced backend configuration for production
    versioning     = true
    kms_key_id     = "alias/terraform-bucket-key"
  }
}

# AWS Provider configuration for production environment
provider "aws" {
  region = "us-west-2"

  default_tags {
    tags = {
      Environment = "production"
      Project     = "TaskManagementSystem"
      ManagedBy   = "Terraform"
      CostCenter  = "Production-Infrastructure"
    }
  }
}

# VPC Module configuration for production
module "vpc" {
  source = "../../main.tf"

  project_name = "task-management"
  environment  = "production"
  vpc_cidr     = "10.0.0.0/16"
  
  availability_zones = [
    "us-west-2a",
    "us-west-2b",
    "us-west-2c"
  ]

  # Production-grade networking configuration
  enable_nat_gateway     = true
  single_nat_gateway     = false  # Multi-AZ NAT for high availability
  enable_vpn_gateway     = true   # VPN access for secure management
  enable_transit_gateway = true   # For future network expansion

  tags = {
    Environment = "production"
    CostCenter  = "infrastructure"
  }
}

# EKS Module configuration for production
module "eks" {
  source = "../../main.tf"

  cluster_name    = "task-management-prod"
  cluster_version = "1.27"
  
  # Production-grade node configuration
  instance_types = ["r6g.xlarge"]  # As per performance requirements
  min_size       = 3
  max_size       = 10
  desired_size   = 5

  # Enhanced monitoring and autoscaling
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_prometheus        = true
  enable_container_insights = true

  # Production security settings
  enable_irsa              = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  cluster_endpoint_public_access_cidrs = ["YOUR-OFFICE-IP/32"]
}

# RDS Module configuration for production
module "rds" {
  source = "../../main.tf"

  identifier_prefix = "task-management-prod"
  engine_version    = "15.4"
  instance_class    = "db.r6g.xlarge"
  
  # High availability configuration
  multi_az               = true
  backup_retention_period = 30
  deletion_protection    = true
  
  # Performance and monitoring
  performance_insights_enabled = true
  monitoring_interval         = 30
  
  # Enhanced security
  storage_encrypted        = true
  enable_iam_auth         = true
  apply_immediately       = false
}

# ElastiCache Module configuration for production
module "elasticache" {
  source = "../../main.tf"

  cluster_id      = "task-management-prod"
  node_type       = "cache.r6g.large"
  num_cache_nodes = 3
  
  # High availability configuration
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Security and encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  # Maintenance and backup
  maintenance_window    = "sun:05:00-sun:07:00"
  snapshot_window      = "03:00-05:00"
  snapshot_retention_limit = 7
}

# S3 Module configuration for production
module "s3" {
  source = "../../main.tf"

  bucket_name = "task-management-prod-storage"
  environment = "production"
  
  # Production storage features
  enable_versioning = true
  enable_encryption = true
  
  # Lifecycle management
  lifecycle_rules = {
    backup_lifecycle = {
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
}

# Production environment outputs
output "vpc_id" {
  description = "Production VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Production EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "rds_endpoint" {
  description = "Production RDS endpoint"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Production ElastiCache Redis endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}