# AWS S3 Module for Task Management System
# Provider version: hashicorp/aws ~> 5.0

# Local variables for common resource tagging
locals {
  common_tags = {
    Environment         = var.environment
    Terraform          = "true"
    Module             = "s3"
    SecurityLevel      = "high"
    DataClassification = "sensitive"
  }
}

# Main S3 bucket resource with force destroy disabled for data protection
resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name
  # Prevent accidental deletion of bucket with data
  force_destroy = false

  # Merge common tags with provided tags
  tags = merge(local.common_tags, var.tags)
}

# Enable versioning for data protection and recovery
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# Configure server-side encryption using AES-256
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  count  = var.enable_encryption ? 1 : 0
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Configure lifecycle rules for backup retention and storage optimization
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.key
      status = "Enabled"

      dynamic "transition" {
        for_each = rule.value.transition
        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      expiration {
        days = rule.value.expiration.days
      }
    }
  }
}

# Block all public access for security
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable object lock configuration for compliance and data protection
resource "aws_s3_bucket_object_lock_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 30
    }
  }
}

# Configure bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Enable bucket logging for audit and compliance
resource "aws_s3_bucket_logging" "main" {
  bucket = aws_s3_bucket.main.id

  target_bucket = aws_s3_bucket.main.id
  target_prefix = "logs/"
}

# Configure CORS rules if needed for web access
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://*.taskmanagement.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Configure intelligent tiering for cost optimization
resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  name   = "EntireDataset"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}