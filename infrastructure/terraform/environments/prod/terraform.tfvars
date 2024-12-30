# Core Configuration
# version: terraform ~> 1.5
project_name = "task-management-system"
environment  = "prod"
aws_region   = "us-west-2"

# VPC Configuration
vpc_config = {
  vpc_cidr = "10.0.0.0/16"
  availability_zones = [
    "us-west-2a",
    "us-west-2b",
    "us-west-2c"
  ]
  public_subnet_cidrs = [
    "10.0.1.0/24",
    "10.0.2.0/24",
    "10.0.3.0/24"
  ]
  private_subnet_cidrs = [
    "10.0.4.0/24",
    "10.0.5.0/24",
    "10.0.6.0/24"
  ]
  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_vpn_gateway     = true
  enable_flow_logs       = true
  flow_logs_retention_days = 90
}

# EKS Configuration
eks_config = {
  cluster_version = "1.27"
  cluster_logging = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]
  node_groups = {
    application = {
      instance_types = ["t3.large"]
      desired_size   = 3
      min_size      = 2
      max_size      = 10
      disk_size     = 100
    }
    system = {
      instance_types = ["t3.medium"]
      desired_size   = 2
      min_size      = 2
      max_size      = 4
      disk_size     = 50
    }
  }
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
}

# RDS Configuration
rds_config = {
  instance_class           = "db.r6g.xlarge"
  allocated_storage       = 100
  max_allocated_storage   = 500
  multi_az               = true
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  performance_insights_enabled = true
  deletion_protection    = true
}

# ElastiCache Configuration
elasticache_config = {
  node_type                  = "cache.r6g.large"
  num_cache_nodes           = 2
  parameter_group_family    = "redis6.x"
  engine_version           = "6.x"
  automatic_failover_enabled = true
  multi_az_enabled         = true
}

# Monitoring Configuration
monitoring_config = {
  enable_enhanced_monitoring = true
  monitoring_interval       = 30
  create_alarms            = true
  alarm_actions            = ["arn:aws:sns:us-west-2:*:production-alerts"]
}

# Resource Tags
tags = {
  Environment        = "production"
  Project           = "task-management-system"
  ManagedBy         = "terraform"
  Owner             = "devops-team"
  BusinessUnit      = "engineering"
  CostCenter        = "prod-infrastructure"
  Compliance        = "sox-compliant"
  BackupPolicy      = "daily"
  DataClassification = "confidential"
}