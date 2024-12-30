# Core cluster outputs
output "cluster_id" {
  description = "The ID/ARN of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_version" {
  description = "The Kubernetes version of the EKS cluster"
  value       = aws_eks_cluster.main.version
}

# Sensitive cluster access information
output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
  sensitive   = true
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

# Security and networking outputs
output "cluster_security_group_ids" {
  description = "List of security group IDs attached to the EKS cluster control plane"
  value       = [aws_security_group.cluster_sg.id]
}

output "node_security_group_ids" {
  description = "List of security group IDs attached to the EKS worker nodes"
  value       = [aws_security_group.node_sg.id]
}

output "cluster_vpc_config" {
  description = "VPC configuration for the EKS cluster"
  value = {
    vpc_id             = var.vpc_id
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.cluster_sg.id]
  }
}

# Node group information
output "node_groups" {
  description = "Map of node group configurations including status, scaling, and instance details"
  value = {
    for ng_key, ng in aws_eks_node_group.main : ng_key => {
      node_group_id    = ng.id
      status          = ng.status
      scaling_config  = ng.scaling_config
      instance_types  = ng.instance_types
      disk_size      = ng.disk_size
      labels         = ng.labels
      taints         = ng.taint
    }
  }
}

# IAM configuration outputs
output "cluster_role_arn" {
  description = "ARN of the IAM role used by the EKS cluster"
  value       = aws_iam_role.cluster_role.arn
}

output "node_role_arn" {
  description = "ARN of the IAM role used by the EKS worker nodes"
  value       = aws_iam_role.node_role.arn
}

# OIDC provider outputs
output "oidc_provider_arn" {
  description = "ARN of the OIDC Provider for EKS service accounts"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC Provider for EKS service accounts"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Encryption configuration
output "cluster_encryption_config" {
  description = "KMS encryption configuration for the EKS cluster"
  value = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }
}

# Logging configuration
output "cluster_log_group_name" {
  description = "Name of the CloudWatch Log Group for EKS cluster logs"
  value       = aws_cloudwatch_log_group.eks.name
}

output "enabled_cluster_log_types" {
  description = "List of enabled control plane logging types"
  value       = aws_eks_cluster.main.enabled_cluster_log_types
}

# Network configuration
output "cluster_network_config" {
  description = "Network configuration details for the EKS cluster"
  value = {
    service_ipv4_cidr = aws_eks_cluster.main.kubernetes_network_config[0].service_ipv4_cidr
    ip_family         = aws_eks_cluster.main.kubernetes_network_config[0].ip_family
  }
}