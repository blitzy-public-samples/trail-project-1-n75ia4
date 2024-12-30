# Redis Cluster Identification
output "redis_cluster_id" {
  value       = aws_elasticache_replication_group.redis_cluster.id
  description = "The ID of the ElastiCache Redis cluster"
}

# Endpoint Information
output "primary_endpoint_address" {
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
  description = "The primary endpoint address for Redis write operations"
}

output "reader_endpoint_address" {
  value       = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
  description = "The reader endpoint address for load-balanced read operations"
}

output "configuration_endpoint_address" {
  value       = aws_elasticache_replication_group.redis_cluster.configuration_endpoint_address
  description = "The configuration endpoint address for cluster mode operations"
}

# Security Configuration
output "security_group_id" {
  value       = aws_security_group.redis_sg.id
  description = "The ID of the security group associated with the Redis cluster"
}

output "vpc_id" {
  value       = aws_security_group.redis_sg.vpc_id
  description = "The ID of the VPC where the Redis cluster is deployed"
}

# Connection Information
output "port" {
  value       = var.port
  description = "The port number used for Redis connections"
}

# Version Information
output "engine_version" {
  value       = var.engine_version
  description = "The version of the Redis engine running on the cluster"
}

# High Availability Configuration
output "multi_az_enabled" {
  value       = var.multi_az_enabled
  description = "Whether Multi-AZ is enabled for the Redis cluster"
}

output "automatic_failover_enabled" {
  value       = var.automatic_failover_enabled
  description = "Whether automatic failover is enabled for the Redis cluster"
}

# Security Features
output "encryption_at_rest_enabled" {
  value       = var.at_rest_encryption_enabled
  description = "Whether encryption at rest is enabled for the Redis cluster"
}

output "encryption_in_transit_enabled" {
  value       = var.transit_encryption_enabled
  description = "Whether encryption in transit is enabled for the Redis cluster"
}

# Performance Configuration
output "node_type" {
  value       = var.node_type
  description = "The instance type of the Redis cluster nodes"
}

output "number_of_nodes" {
  value       = var.num_cache_nodes
  description = "The number of nodes in the Redis cluster"
}

# Maintenance Information
output "maintenance_window" {
  value       = var.maintenance_window
  description = "The maintenance window for the Redis cluster"
}

# Backup Configuration
output "backup_retention_period" {
  value       = var.snapshot_retention_limit
  description = "The number of days for which backups are retained"
}

output "backup_window" {
  value       = var.snapshot_window
  description = "The daily time range during which automated backups are created"
}