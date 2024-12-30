# Task Management System - Main Terraform Configuration
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

  # Configure backend for state management (adjust based on your environment)
  backend "s3" {
    bucket         = "task-management-terraform-state"
    key            = "infrastructure/terraform.tfstate"
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
      Environment = var.environment
      Project     = "TaskManagementSystem"
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module for networking infrastructure
module "vpc" {
  source = "./modules/vpc"

  project_name          = "task-management"
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i)]
  private_subnet_cidrs = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i + length(var.availability_zones))]
  enable_nat_gateway   = true
  
  tags = {
    Environment = var.environment
    CostCenter  = "infrastructure"
  }
}

# EKS Module for container orchestration
module "eks" {
  source = "./modules/eks"

  cluster_name    = "task-management-${var.environment}"
  cluster_version = "1.27"
  vpc_id          = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  node_groups = {
    application = {
      instance_types = ["t3.large"]
      disk_size      = 100
      desired_size   = 3
      min_size       = 2
      max_size       = 5
      labels = {
        role = "application"
      }
    }
    monitoring = {
      instance_types = ["t3.medium"]
      disk_size      = 50
      desired_size   = 2
      min_size       = 1
      max_size       = 3
      labels = {
        role = "monitoring"
      }
    }
  }
}

# RDS Module for PostgreSQL database
module "rds" {
  source = "./modules/rds"

  identifier_prefix = "task-management-${var.environment}"
  engine_version    = "15.4"
  instance_class    = "db.r6g.xlarge"
  database_name     = "taskmanagement"
  master_username   = "dbadmin"
  master_password   = var.db_password # Should be provided through secure means

  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  
  backup_retention_period = 30
  preferred_backup_window = "03:00-05:00"
  monitoring_interval    = 30

  tags = {
    Environment = var.environment
    CostCenter  = "database"
  }
}

# ElastiCache Module for Redis caching
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id       = "task-management-${var.environment}"
  node_type        = "cache.r6g.large"
  num_cache_nodes  = 2
  engine_version   = "7.0"
  port            = 6379

  subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.eks.cluster_security_group_id]

  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  maintenance_window    = "sun:05:00-sun:07:00"
  snapshot_window      = "03:00-05:00"
  snapshot_retention_limit = 7

  tags = {
    Environment = var.environment
    CostCenter  = "caching"
  }
}

# S3 Module for file storage
module "s3" {
  source = "./modules/s3"

  bucket_name = "task-management-${var.environment}-storage"
  environment = var.environment
  enable_versioning = true
  enable_encryption = true

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

  tags = {
    Environment = var.environment
    CostCenter  = "storage"
  }
}

# Outputs for reference by other configurations
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "database_endpoint" {
  description = "Endpoint for RDS cluster"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Endpoint for Redis cluster"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "storage_bucket" {
  description = "Name of the S3 storage bucket"
  value       = module.s3.bucket_name
}