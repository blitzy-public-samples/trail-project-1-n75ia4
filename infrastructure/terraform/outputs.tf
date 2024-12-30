# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC where all resources are deployed"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "vpc_private_subnet_ids" {
  description = "List of private subnet IDs where application resources are deployed"
  value       = module.vpc.private_subnet_ids
  sensitive   = false
}

output "vpc_public_subnet_ids" {
  description = "List of public subnet IDs for internet-facing resources"
  value       = module.vpc.public_subnet_ids
  sensitive   = false
}

# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for the EKS cluster API server"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster for kubectl configuration"
  value       = module.eks.cluster_id
  sensitive   = false
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
  sensitive   = false
}

# Database Outputs
output "database_endpoint" {
  description = "Writer endpoint for the RDS Aurora PostgreSQL cluster"
  value       = module.rds.cluster_endpoint
  sensitive   = false
}

output "database_reader_endpoint" {
  description = "Reader endpoint for the RDS Aurora PostgreSQL cluster"
  value       = module.rds.reader_endpoint
  sensitive   = false
}

output "database_security_group_id" {
  description = "Security group ID for the RDS cluster"
  value       = module.rds.security_group_id
  sensitive   = false
}

# Redis Cache Outputs
output "redis_endpoint" {
  description = "Primary endpoint for the Redis ElastiCache cluster"
  value       = module.elasticache.redis_endpoint
  sensitive   = false
}

output "redis_security_group_id" {
  description = "Security group ID for the Redis cluster"
  value       = module.elasticache.redis_security_group_id
  sensitive   = false
}

# Storage Outputs
output "storage_bucket_name" {
  description = "Name of the S3 bucket for file storage"
  value       = module.s3.bucket_name
  sensitive   = false
}

output "storage_bucket_arn" {
  description = "ARN of the S3 bucket for IAM policy configuration"
  value       = module.s3.bucket_arn
  sensitive   = false
}

# Network Outputs
output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
  sensitive   = false
}

output "nat_gateway_ips" {
  description = "List of NAT Gateway public IPs for outbound internet access"
  value       = module.vpc.nat_gateway_ids
  sensitive   = false
}

# Monitoring Outputs
output "vpc_flow_log_group" {
  description = "CloudWatch Log Group name for VPC flow logs"
  value       = module.vpc.flow_log_group_name
  sensitive   = false
}

# Additional Infrastructure Outputs
output "vpc_endpoints" {
  description = "Map of VPC Endpoint IDs for AWS services"
  value       = module.vpc.vpc_endpoints
  sensitive   = false
}

output "availability_zones" {
  description = "List of availability zones used in the deployment"
  value       = module.vpc.availability_zones
  sensitive   = false
}