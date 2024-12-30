# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Create ElastiCache subnet group for network isolation
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name        = "${var.cluster_id}-subnet-group"
  description = "Subnet group for Redis cluster in ${var.tags["Environment"]} environment"
  subnet_ids  = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-subnet-group"
  })
}

# Create parameter group with optimized Redis settings
resource "aws_elasticache_parameter_group" "redis_params" {
  family = var.parameter_group_family
  name   = "${var.cluster_id}-params"
  description = "Custom parameter group for Redis ${var.engine_version} cluster"

  # Memory Management
  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  # Performance Optimization
  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "lazyfree-lazy-eviction"
    value = "yes"
  }

  parameter {
    name  = "lazyfree-lazy-expire"
    value = "yes"
  }

  # Connection Management
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = var.tags
}

# Create security group for Redis cluster
resource "aws_security_group" "redis_sg" {
  name        = "${var.cluster_id}-sg"
  description = "Security group for Redis cluster in ${var.tags["Environment"]} environment"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    security_groups = var.security_group_ids
    description     = "Allow inbound Redis traffic from application security groups"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-sg"
  })
}

# Create Redis replication group with enhanced features
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = var.cluster_id
  replication_group_description = "Redis cluster for ${var.tags["Environment"]} environment"
  node_type                     = var.node_type
  number_cache_clusters         = var.num_cache_nodes
  port                         = var.port
  parameter_group_name         = aws_elasticache_parameter_group.redis_params.name
  subnet_group_name            = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids           = [aws_security_group.redis_sg.id]
  engine_version               = var.engine_version
  
  # High Availability Configuration
  automatic_failover_enabled    = var.automatic_failover_enabled
  multi_az_enabled             = var.multi_az_enabled
  auto_minor_version_upgrade   = true
  maintenance_window           = var.maintenance_window
  
  # Security Configuration
  at_rest_encryption_enabled   = var.at_rest_encryption_enabled
  transit_encryption_enabled   = var.transit_encryption_enabled
  
  # Backup Configuration
  snapshot_retention_limit     = var.snapshot_retention_limit
  snapshot_window             = var.snapshot_window
  
  # Notification Configuration
  dynamic "notification_topic_arn" {
    for_each = var.notification_topic_arn != "" ? [1] : []
    content {
      topic_arn = var.notification_topic_arn
    }
  }

  # Apply changes based on configuration
  apply_immediately           = var.apply_immediately

  tags = merge(var.tags, {
    Name = var.cluster_id
  })

  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.cluster_id}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  namespace           = "AWS/ElastiCache"
  metric_name         = "CPUUtilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = [var.notification_topic_arn]
  ok_actions         = [var.notification_topic_arn]

  dimensions = {
    CacheClusterId = var.cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.cluster_id}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  namespace           = "AWS/ElastiCache"
  metric_name         = "DatabaseMemoryUsagePercentage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = [var.notification_topic_arn]
  ok_actions         = [var.notification_topic_arn]

  dimensions = {
    CacheClusterId = var.cluster_id
  }

  tags = var.tags
}