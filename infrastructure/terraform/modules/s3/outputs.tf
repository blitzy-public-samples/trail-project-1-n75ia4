# Output definitions for AWS S3 bucket module
# Provider version: hashicorp/aws ~> 5.0

# The unique identifier of the S3 bucket
# Used for resource referencing and integration with other AWS services
output "bucket_id" {
  description = "The unique identifier of the created S3 bucket used for resource referencing"
  value       = aws_s3_bucket.main.id
}

# The Amazon Resource Name (ARN) of the S3 bucket
# Critical for IAM policy configuration and cross-service integration
output "bucket_arn" {
  description = "The Amazon Resource Name (ARN) of the S3 bucket used for IAM policies and cross-service access"
  value       = aws_s3_bucket.main.arn
}

# The fully-qualified domain name of the S3 bucket
# Used for endpoint configuration in application services
output "bucket_domain_name" {
  description = "The fully-qualified domain name of the S3 bucket used for endpoint configuration"
  value       = aws_s3_bucket.main.bucket_domain_name
}