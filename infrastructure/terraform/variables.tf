# Terraform v1.5+ required

# Project Configuration
variable "project_name" {
  type        = string
  description = "Project identifier used for resource naming and tagging"
  default     = "task-management-system"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# AWS Configuration
variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
}

# Networking Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for high availability deployment"
}

# EKS Configuration
variable "eks_cluster_version" {
  type        = string
  description = "Kubernetes version for EKS cluster"
  default     = "1.27"
}

variable "eks_node_instance_types" {
  type        = map(string)
  description = "EC2 instance types for EKS node groups per environment"
  default = {
    dev     = "t3.large"
    staging = "t3.xlarge"
    prod    = "m5.2xlarge"
  }
}

variable "eks_node_group_sizes" {
  type = map(object({
    min_size     = number
    max_size     = number
    desired_size = number
  }))
  description = "EKS node group scaling configuration per environment"
  default = {
    dev = {
      min_size     = 2
      max_size     = 4
      desired_size = 2
    }
    staging = {
      min_size     = 2
      max_size     = 6
      desired_size = 3
    }
    prod = {
      min_size     = 3
      max_size     = 10
      desired_size = 5
    }
  }
}

# Database Configuration
variable "rds_instance_class" {
  type        = string
  description = "RDS instance class for PostgreSQL database"
  default     = "db.r6g.xlarge"
}

variable "rds_engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "15.3"
}

# Cache Configuration
variable "elasticache_node_type" {
  type        = string
  description = "ElastiCache node type for Redis cluster"
  default     = "cache.r6g.large"
}

variable "elasticache_cluster_size" {
  type        = number
  description = "Number of nodes in ElastiCache Redis cluster"
  default     = 2
}

# Backup Configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups"
  default     = 30
}

# Storage Configuration
variable "s3_lifecycle_rules" {
  type = map(object({
    enabled                       = bool
    transition_to_standard_ia     = number
    transition_to_glacier         = number
    expiration_days              = number
  }))
  description = "Lifecycle rules for S3 buckets per storage class"
  default = {
    logs = {
      enabled                   = true
      transition_to_standard_ia = 30
      transition_to_glacier     = 90
      expiration_days          = 365
    }
    backups = {
      enabled                   = true
      transition_to_standard_ia = 30
      transition_to_glacier     = 60
      expiration_days          = 365
    }
  }
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  type        = bool
  description = "Enable detailed CloudWatch monitoring for resources"
  default     = true
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain CloudWatch logs"
  default     = 30
}

# Security Configuration
variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of CIDR blocks allowed to access the VPC"
  default     = []
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    ManagedBy = "terraform"
    Project   = "task-management-system"
  }
}

# Cost Management
variable "cost_center" {
  type        = string
  description = "Cost center identifier for resource billing"
  default     = "task-mgmt-system"
}

# Scaling Configuration
variable "autoscaling_metrics_enabled" {
  type        = bool
  description = "Enable detailed metrics for auto scaling groups"
  default     = true
}

# High Availability Configuration
variable "multi_az_enabled" {
  type        = map(bool)
  description = "Enable Multi-AZ deployment per environment"
  default = {
    dev     = false
    staging = false
    prod    = true
  }
}