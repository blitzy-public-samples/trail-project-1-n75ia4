# Backend configuration for Task Management System Infrastructure
# Required Terraform version: >= 1.5.0
# AWS Provider version: ~> 5.0

terraform {
  # Backend configuration for remote state storage
  backend "s3" {
    # Primary state storage configuration
    bucket         = "task-management-terraform-state"
    key            = "terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    dynamodb_table = "task-management-terraform-locks"

    # Workspace-based state management
    workspace_key_prefix = var.environment

    # Enhanced security features
    force_path_style               = false
    skip_credentials_validation    = false
    skip_metadata_api_check       = false
    skip_region_validation        = false

    # State locking configuration
    dynamodb_table_tags = {
      Name        = "task-management-terraform-locks"
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = "task-management-system"
    }

    # S3 bucket configuration
    versioning {
      enabled    = true
      mfa_delete = true
    }

    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm = "AES256"
        }
        bucket_key_enabled = true
      }
    }

    # Cross-region replication for disaster recovery
    replication_configuration {
      role = "arn:aws:iam::account:role/service-role/s3-backup-role"
      rules {
        id       = "state-backup"
        status   = "Enabled"
        priority = 1

        destination {
          bucket        = "task-management-terraform-state-backup"
          storage_class = "STANDARD_IA"
          
          # Enable encryption for replicated objects
          encryption_configuration {
            replica_kms_key_id = "arn:aws:kms:secondary-region:account:key/backup-key"
          }
        }
      }
    }

    # Lifecycle rules for state management
    lifecycle_rule {
      enabled = true

      noncurrent_version_transition {
        days          = 30
        storage_class = "STANDARD_IA"
      }

      noncurrent_version_transition {
        days          = 60
        storage_class = "GLACIER"
      }

      noncurrent_version_expiration {
        days = 90
      }

      abort_incomplete_multipart_upload_days = 7
    }

    # Access logging configuration
    logging {
      target_bucket = "task-management-access-logs"
      target_prefix = "terraform-state/"
    }
  }

  # Required provider configuration
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Minimum required Terraform version
  required_version = ">= 1.5.0"
}

# Additional backend-related configurations
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "task-management-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "task-management-terraform-locks"
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "task-management-system"
  }
}

# S3 bucket policy for state storage
resource "aws_s3_bucket_policy" "state_bucket" {
  bucket = "task-management-terraform-state"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnforceTLSRequestsOnly"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          "arn:aws:s3:::task-management-terraform-state",
          "arn:aws:s3:::task-management-terraform-state/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport": "false"
          }
        }
      },
      {
        Sid    = "EnforceKMSEncryption"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = [
          "arn:aws:s3:::task-management-terraform-state/*"
        ]
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption": "AES256"
          }
        }
      }
    ]
  })
}