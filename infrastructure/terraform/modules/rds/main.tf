# Provider and Terraform version constraints
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

# DB subnet group for multi-AZ deployment
resource "aws_db_subnet_group" "main" {
  name        = "${var.identifier_prefix}-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for ${var.identifier_prefix} RDS Aurora cluster"

  tags = merge(var.tags, {
    Name = "${var.identifier_prefix}-subnet-group"
  })
}

# Enhanced security group with strict access controls
resource "aws_security_group" "rds" {
  name        = "${var.identifier_prefix}-sg"
  description = "Security group for ${var.identifier_prefix} RDS Aurora cluster"
  vpc_id      = var.vpc_id

  # PostgreSQL ingress rule
  ingress {
    from_port        = 5432
    to_port          = 5432
    protocol         = "tcp"
    cidr_blocks      = ["10.0.0.0/8"] # Adjust based on your VPC CIDR
    description      = "PostgreSQL access from internal VPC"
  }

  # Allow all egress for database connections
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    description      = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.identifier_prefix}-sg"
  })
}

# KMS key for encryption at rest
resource "aws_kms_key" "rds" {
  description             = "KMS key for ${var.identifier_prefix} RDS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.identifier_prefix}-kms"
  })
}

# RDS Aurora PostgreSQL cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier     = "${var.identifier_prefix}-cluster"
  engine                = "aurora-postgresql"
  engine_version        = var.engine_version
  database_name         = var.database_name
  master_username       = var.master_username
  master_password       = var.master_password

  # High availability and backup configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  availability_zones     = data.aws_availability_zones.available.names
  storage_encrypted      = true
  kms_key_id            = aws_kms_key.rds.arn
  
  # Backup settings as per requirements
  backup_retention_period    = var.backup_retention_period
  preferred_backup_window    = var.preferred_backup_window
  preferred_maintenance_window = "sun:04:00-sun:05:00"
  
  # Enhanced monitoring and security features
  enabled_cloudwatch_logs_exports = ["postgresql"]
  iam_database_authentication_enabled = true
  
  # Production safety settings
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.identifier_prefix}-final-snapshot"
  apply_immediately   = false

  tags = merge(var.tags, {
    Name = "${var.identifier_prefix}-cluster"
  })
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.identifier_prefix}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]
}

# RDS cluster instances
resource "aws_rds_cluster_instance" "instances" {
  count                   = 2 # Primary + Read replica for HA
  identifier             = "${var.identifier_prefix}-instance-${count.index + 1}"
  cluster_identifier     = aws_rds_cluster.main.id
  instance_class         = var.instance_class
  engine                 = "aurora-postgresql"
  engine_version         = var.engine_version

  # Performance and monitoring configuration
  performance_insights_enabled          = true
  performance_insights_retention_period = 7 # Days
  monitoring_interval                   = var.monitoring_interval
  monitoring_role_arn                  = aws_iam_role.rds_enhanced_monitoring.arn

  # Instance settings
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true
  publicly_accessible       = false

  tags = merge(var.tags, {
    Name = "${var.identifier_prefix}-instance-${count.index + 1}"
  })
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "cluster_endpoint" {
  description = "Writer endpoint for the RDS cluster"
  value       = aws_rds_cluster.main.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint for the RDS cluster"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "cluster_resource_id" {
  description = "Resource ID of the RDS cluster"
  value       = aws_rds_cluster.main.cluster_resource_id
}