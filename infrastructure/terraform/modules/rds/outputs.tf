# Primary cluster endpoint for write operations
output "cluster_endpoint" {
  description = "The writer endpoint for the RDS Aurora PostgreSQL cluster. Use this endpoint for write operations."
  value       = aws_rds_cluster.main.endpoint
  sensitive   = false
}

# Reader endpoint for read operations in multi-AZ setup
output "reader_endpoint" {
  description = "The reader endpoint for the RDS Aurora PostgreSQL cluster. Use this endpoint for read operations to distribute load."
  value       = aws_rds_cluster.main.reader_endpoint
  sensitive   = false
}

# Port number for database connections
output "port" {
  description = "The port number on which the PostgreSQL cluster accepts connections (default: 5432)."
  value       = aws_rds_cluster.main.port
  sensitive   = false
}

# Security group ID for network access control
output "security_group_id" {
  description = "The ID of the security group controlling network access to the RDS cluster."
  value       = aws_security_group.rds.id
  sensitive   = false
}

# Cluster identifier for reference in other resources
output "cluster_identifier" {
  description = "The unique identifier of the RDS Aurora PostgreSQL cluster."
  value       = aws_rds_cluster.main.cluster_identifier
  sensitive   = false
}

# Database name for application configuration
output "database_name" {
  description = "The name of the default database created in the PostgreSQL cluster."
  value       = aws_rds_cluster.main.database_name
  sensitive   = false
}

# Cluster ARN for IAM and other AWS service integration
output "cluster_arn" {
  description = "The ARN (Amazon Resource Name) of the RDS Aurora PostgreSQL cluster."
  value       = aws_rds_cluster.main.arn
  sensitive   = false
}

# KMS key ID for encryption management
output "kms_key_id" {
  description = "The ID of the KMS key used for encrypting the RDS cluster data."
  value       = aws_rds_cluster.main.kms_key_id
  sensitive   = false
}

# Cluster resource ID for CloudWatch and other AWS integrations
output "cluster_resource_id" {
  description = "The unique resource ID assigned to the RDS cluster, useful for CloudWatch and other AWS service integration."
  value       = aws_rds_cluster.main.cluster_resource_id
  sensitive   = false
}

# Availability zones for the cluster instances
output "availability_zones" {
  description = "The Availability Zones in which cluster instances are deployed for high availability."
  value       = aws_rds_cluster.main.availability_zones
  sensitive   = false
}

# Enhanced monitoring role ARN for monitoring configuration
output "monitoring_role_arn" {
  description = "The ARN of the IAM role used for enhanced RDS monitoring."
  value       = aws_iam_role.rds_enhanced_monitoring.arn
  sensitive   = false
}