# Required Variables
variable "cluster_id" {
  type        = string
  description = "Unique identifier for the Redis cluster. Must be between 1-50 characters, containing only lowercase letters, numbers, and hyphens"
}

# Instance Configuration
variable "node_type" {
  type        = string
  description = "The compute and memory capacity of the nodes. As per spec using r6g series for memory optimization"
  default     = "cache.r6g.large"
}

variable "num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the cluster. For high availability, recommended minimum is 2"
  default     = 2
}

variable "engine_version" {
  type        = string
  description = "Version number of the Redis cache engine. Must be 7.0 or higher as per specifications"
  default     = "7.0"
}

variable "port" {
  type        = number
  description = "Port number on which Redis accepts connections"
  default     = 6379
}

variable "parameter_group_family" {
  type        = string
  description = "The family of the Redis cache parameter group"
  default     = "redis7"
}

# High Availability Configuration
variable "automatic_failover_enabled" {
  type        = bool
  description = "Specifies whether a read-only replica will be automatically promoted to read/write primary if the existing primary fails"
  default     = true
}

# Security Configuration
variable "at_rest_encryption_enabled" {
  type        = bool
  description = "Whether to enable encryption at rest for the Redis cluster. Required for compliance and data security"
  default     = true
}

variable "transit_encryption_enabled" {
  type        = bool
  description = "Whether to enable encryption in transit for Redis connections. Required for data security"
  default     = true
}

# Maintenance Configuration
variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window for the Redis cluster (UTC). Format: ddd:hh24:mi-ddd:hh24:mi"
  default     = "sun:05:00-sun:07:00"
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the Redis cluster resources"
  default = {
    Environment = "production"
    Service     = "cache"
    Managed_by  = "terraform"
  }
}

# Network Configuration
variable "subnet_ids" {
  type        = list(string)
  description = "List of VPC subnet IDs for the Redis cluster deployment. Required for network isolation"
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs to associate with the Redis cluster"
}

# Backup Configuration
variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days for which ElastiCache retains automatic cache cluster snapshots"
  default     = 7
}

variable "snapshot_window" {
  type        = string
  description = "Daily time range during which automated backups are created (UTC). Format: hh24:mi-hh24:mi"
  default     = "03:00-05:00"
}

# Performance Configuration
variable "maxmemory_policy" {
  type        = string
  description = "The eviction policy for the Redis cluster when maximum memory is reached"
  default     = "volatile-lru"
}

variable "notification_topic_arn" {
  type        = string
  description = "ARN of an SNS topic for ElastiCache notifications"
  default     = ""
}

# Advanced Configuration
variable "apply_immediately" {
  type        = bool
  description = "Whether changes should be applied immediately or during the next maintenance window"
  default     = false
}

variable "multi_az_enabled" {
  type        = bool
  description = "Specifies whether to enable Multi-AZ support for the Redis cluster"
  default     = true
}