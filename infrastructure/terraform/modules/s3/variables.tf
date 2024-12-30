# S3 bucket name variable with validation for AWS naming requirements
variable "bucket_name" {
  description = "Name of the S3 bucket to be created for the Task Management System"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be lowercase alphanumeric characters and hyphens, starting and ending with alphanumeric"
  }
}

# Environment variable to control deployment environment settings
variable "environment" {
  description = "Deployment environment for the S3 bucket (dev/staging/prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Versioning control for maintaining file version history
variable "enable_versioning" {
  description = "Enable versioning for the S3 bucket to maintain file version history"
  type        = bool
  default     = true
}

# Encryption control for data security compliance
variable "enable_encryption" {
  description = "Enable server-side encryption (AES-256) for the S3 bucket"
  type        = bool
  default     = true
}

# Complex type for defining lifecycle rules including transitions and expirations
variable "lifecycle_rules" {
  description = "Lifecycle rules for S3 bucket objects including transitions and expirations"
  type = map(object({
    transition = list(object({
      days          = number
      storage_class = string
    }))
    expiration = object({
      days = number
    })
  }))
  default = {
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

# Resource tagging for cost allocation and resource management
variable "tags" {
  description = "Resource tags to be applied to the S3 bucket"
  type        = map(string)
  default = {
    Project    = "TaskManagementSystem"
    ManagedBy  = "Terraform"
  }
}