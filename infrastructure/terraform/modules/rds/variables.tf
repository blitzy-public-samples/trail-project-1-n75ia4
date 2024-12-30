# Core RDS Configuration Variables
variable "identifier_prefix" {
  type        = string
  description = "Prefix for RDS cluster and instance identifiers. Must be lowercase alphanumeric characters or hyphens."
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.identifier_prefix))
    error_message = "The identifier prefix must start with a letter and only contain lowercase letters, numbers, and hyphens."
  }
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version. Must be 15.0 or higher as per technical requirements."
  default     = "15.4"
  validation {
    condition     = tonumber(split(".", var.engine_version)[0]) >= 15
    error_message = "PostgreSQL version must be 15.0 or higher for enterprise-grade requirements."
  }
}

variable "instance_class" {
  type        = string
  description = "RDS instance class. Must be r6g family for optimal performance."
  default     = "db.r6g.xlarge"
  validation {
    condition     = can(regex("^db\\.r6g\\.", var.instance_class))
    error_message = "Instance class must be from the r6g family for production performance requirements."
  }
}

# Database Configuration Variables
variable "database_name" {
  type        = string
  description = "Name of the PostgreSQL database to create. Must be alphanumeric and between 1-63 characters."
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name)) && length(var.database_name) <= 63
    error_message = "Database name must start with a letter, contain only alphanumeric characters or underscores, and be 63 characters or less."
  }
}

variable "master_username" {
  type        = string
  description = "Master username for the RDS instance. Must be alphanumeric and between 1-63 characters."
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.master_username)) && length(var.master_username) <= 63
    error_message = "Master username must start with a letter, contain only alphanumeric characters or underscores, and be 63 characters or less."
  }
}

variable "master_password" {
  type        = string
  description = "Master password for the RDS instance. Must be at least 16 characters and contain special characters."
  sensitive   = true
  validation {
    condition     = can(regex("^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{16,}$", var.master_password))
    error_message = "Master password must be at least 16 characters and include uppercase, lowercase, numbers, and special characters."
  }
}

# Network Configuration Variables
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where RDS cluster will be deployed."
  validation {
    condition     = can(regex("^vpc-[a-f0-9]{8,}$", var.vpc_id))
    error_message = "VPC ID must be a valid vpc-* identifier."
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for RDS cluster. Must be in at least 2 different AZs for high availability."
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for multi-AZ deployment."
  }
}

# Backup and Recovery Variables
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups. Minimum 30 days required for enterprise compliance."
  default     = 30
  validation {
    condition     = var.backup_retention_period >= 30
    error_message = "Backup retention period must be at least 30 days for enterprise compliance requirements."
  }
}

variable "preferred_backup_window" {
  type        = string
  description = "Daily time range during which automated backups are created (UTC). Must be in format hh24:mi-hh24:mi."
  validation {
    condition     = can(regex("^([01][0-9]|2[0-3]):[0-5][0-9]-([01][0-9]|2[0-3]):[0-5][0-9]$", var.preferred_backup_window))
    error_message = "Backup window must be in format hh24:mi-hh24:mi and specify a valid UTC time range."
  }
}

# Monitoring and Performance Variables
variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds. Valid values: 0, 1, 5, 10, 15, 30, 60."
  default     = 30
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60 seconds."
  }
}

# Resource Tagging Variables
variable "tags" {
  type        = map(string)
  description = "Map of tags to apply to all resources. Must include environment and cost-center tags."
  default     = {}
  validation {
    condition     = contains(keys(var.tags), "Environment") && contains(keys(var.tags), "CostCenter")
    error_message = "Tags must include both Environment and CostCenter keys for resource tracking."
  }
}