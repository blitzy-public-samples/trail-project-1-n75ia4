# EKS Cluster Configuration
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.cluster_version))
    error_message = "Cluster version must be 1.27 or higher for enterprise-grade stability and features."
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where EKS cluster will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for EKS node groups. Must be spread across multiple availability zones for high availability."

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability deployment across multiple AZs."
  }
}

# Node Group Configuration
variable "node_group_config" {
  type = map(object({
    instance_types = list(string)
    desired_size   = number
    min_size      = number
    max_size      = number
    disk_size     = number
    capacity_type = string
  }))
  description = "Configuration for EKS node groups including instance types and scaling parameters"

  validation {
    condition = alltrue([
      for k, v in var.node_group_config : 
        length(v.instance_types) > 0 &&
        v.min_size <= v.desired_size &&
        v.desired_size <= v.max_size &&
        v.disk_size >= 20 &&
        contains(["ON_DEMAND", "SPOT"], v.capacity_type)
    ])
    error_message = "Invalid node group configuration. Check instance types, scaling parameters, disk size (min 20GB), and capacity type (ON_DEMAND or SPOT)."
  }
}

# Logging and Monitoring
variable "enabled_cluster_log_types" {
  type        = list(string)
  description = "List of EKS cluster logging types to enable for monitoring and debugging"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  validation {
    condition = alltrue([
      for log_type in var.enabled_cluster_log_types :
        contains(["api", "audit", "authenticator", "controllerManager", "scheduler"], log_type)
    ])
    error_message = "Invalid log type specified. Allowed values: api, audit, authenticator, controllerManager, scheduler."
  }
}

# Security Configuration
variable "encryption_config" {
  type = object({
    enabled = bool
    kms_key_arn = string
  })
  description = "Configuration for EKS cluster encryption"
  default = {
    enabled = true
    kms_key_arn = ""
  }
}

variable "endpoint_private_access" {
  type        = bool
  description = "Enable private API server endpoint access"
  default     = true
}

variable "endpoint_public_access" {
  type        = bool
  description = "Enable public API server endpoint access"
  default     = false
}

variable "public_access_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks that can access the public API server endpoint"
  default     = []
}

# Network Policy Configuration
variable "enable_network_policy" {
  type        = bool
  description = "Enable Calico network policy support"
  default     = true
}

# IRSA Configuration
variable "enable_irsa" {
  type        = bool
  description = "Enable IAM roles for service accounts"
  default     = true
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Resource tags to apply to all EKS resources"
  default     = {}

  validation {
    condition     = can([for k, v in var.tags : regex("^[\\w\\s\\-\\.\\:\\/@]+$", v)])
    error_message = "Tag values can only contain alphanumeric characters, spaces, and .-:/@"
  }
}

# Add-ons Configuration
variable "cluster_addons" {
  type = map(object({
    version               = string
    resolve_conflicts    = string
    service_account_role_arn = string
  }))
  description = "Map of cluster addon configurations to enable"
  default = {
    vpc-cni = {
      version               = "v1.12.0"
      resolve_conflicts    = "OVERWRITE"
      service_account_role_arn = ""
    }
    coredns = {
      version               = "v1.9.3"
      resolve_conflicts    = "OVERWRITE"
      service_account_role_arn = ""
    }
    kube-proxy = {
      version               = "v1.27.1"
      resolve_conflicts    = "OVERWRITE"
      service_account_role_arn = ""
    }
  }
}

# Kubernetes API Server Configuration
variable "kubernetes_api_config" {
  type = object({
    service_ipv4_cidr = string
    ip_family         = string
  })
  description = "Configuration for the Kubernetes API server"
  default = {
    service_ipv4_cidr = "172.20.0.0/16"
    ip_family         = "ipv4"
  }

  validation {
    condition     = can(cidrhost(var.kubernetes_api_config.service_ipv4_cidr, 0))
    error_message = "service_ipv4_cidr must be a valid CIDR block."
  }
}