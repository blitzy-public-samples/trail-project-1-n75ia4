# Task Management System - Development Environment Configuration
# Version: 1.5.0+

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Development environment state configuration
  backend "s3" {
    bucket         = "task-management-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock-dev"
  }
}

# AWS Provider configuration for development region
provider "aws" {
  region = "us-west-2"  # Development region

  default_tags {
    tags = {
      Environment = "development"
      ManagedBy   = "terraform"
      Project     = "task-management-system"
      CostCenter  = "development"
    }
  }
}

# Development VPC Configuration
module "vpc" {
  source = "../../modules/vpc"

  project_name        = "task-management"
  environment         = "development"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-west-2a"]  # Single AZ for dev environment
  public_subnet_cidrs = ["10.0.1.0/24"]
  private_subnet_cidrs = ["10.0.2.0/24"]
  enable_nat_gateway = true

  tags = {
    Environment = "development"
    CostCenter  = "infrastructure"
  }
}

# Development EKS Configuration
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "task-management-dev"
  cluster_version = "1.27"
  vpc_id          = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  node_groups = {
    application = {
      instance_types = ["t3.medium"]  # Cost-optimized instance type for dev
      disk_size      = 50
      desired_size   = 2
      min_size       = 1
      max_size       = 3
      labels = {
        role = "application"
        environment = "development"
      }
    }
  }
}

# Development RDS Configuration
module "rds" {
  source = "../../modules/rds"

  identifier_prefix = "task-management-dev"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"  # Cost-optimized instance for dev
  database_name     = "taskmanagement"
  master_username   = "devadmin"
  master_password   = var.db_password

  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  
  backup_retention_period = 7  # Reduced backup retention for dev
  preferred_backup_window = "03:00-04:00"
  monitoring_interval    = 60

  tags = {
    Environment = "development"
    CostCenter  = "database"
  }
}

# Development ElastiCache Configuration
module "elasticache" {
  source = "../../modules/elasticache"

  cluster_id           = "task-management-dev"
  node_type           = "cache.t3.medium"  # Cost-optimized instance for dev
  num_cache_nodes     = 1  # Single node for dev environment
  engine_version      = "7.0"
  port                = 6379

  subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.eks.cluster_security_group_id]

  automatic_failover_enabled = false  # Disabled for dev environment
  multi_az_enabled          = false   # Single AZ for dev
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  maintenance_window = "sun:05:00-sun:06:00"
  snapshot_window   = "03:00-04:00"
  snapshot_retention_limit = 3  # Reduced retention for dev

  tags = {
    Environment = "development"
    CostCenter  = "caching"
  }
}

# Development S3 Configuration
module "s3" {
  source = "../../modules/s3"

  bucket_name = "task-management-dev-storage"
  environment = "development"
  enable_versioning = true
  enable_encryption = true

  lifecycle_rules = {
    dev_lifecycle = {
      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        }
      ]
      expiration = {
        days = 90  # Shorter retention for dev environment
      }
    }
  }

  tags = {
    Environment = "development"
    CostCenter  = "storage"
  }
}

# Development-specific outputs
output "vpc_id" {
  description = "Development VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Development EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "database_endpoint" {
  description = "Development RDS endpoint"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Development Redis endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

# Development-specific debug endpoints
output "debug_endpoints" {
  description = "Development debug endpoints and configurations"
  value = {
    kubectl_config_command = "aws eks update-kubeconfig --name task-management-dev --region us-west-2"
    vpc_details = {
      vpc_id = module.vpc.vpc_id
      private_subnet_ids = module.vpc.private_subnet_ids
      public_subnet_ids  = module.vpc.public_subnet_ids
    }
    monitoring_endpoints = {
      cloudwatch_log_group = "/aws/eks/task-management-dev/cluster"
      vpc_flow_logs       = module.vpc.flow_log_group_name
    }
  }
  sensitive = true
}