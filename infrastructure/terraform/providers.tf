# Terraform version constraint
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # AWS Provider v5.0+ for enhanced security features and latest AWS services support
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Kubernetes Provider v2.23+ for EKS management
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Primary AWS Provider configuration with enhanced security settings
provider "aws" {
  region = var.aws_region

  # Enhanced security features
  default_tags {
    tags = {
      Environment     = var.environment
      ManagedBy      = "terraform"
      Project        = "task-management-system"
      SecurityLevel  = "high"
      ComplianceReq  = "sox-2"
      LastUpdated    = timestamp()
    }
  }

  # Security best practices
  assume_role {
    role_arn     = var.assume_role_arn
    session_name = "TerraformDeployment-${var.environment}"
    external_id  = "TMS-${var.environment}"  # Enhanced security with external ID
  }
}

# Secondary AWS Provider for disaster recovery region
provider "aws" {
  alias  = "dr_region"
  region = "us-west-2" # Disaster recovery region

  # Inherit default tags from primary provider
  default_tags {
    tags = {
      Environment     = var.environment
      ManagedBy      = "terraform"
      Project        = "task-management-system"
      SecurityLevel  = "high"
      ComplianceReq  = "sox-2"
      LastUpdated    = timestamp()
      Region         = "dr"
    }
  }
}

# Kubernetes Provider configuration for EKS management
provider "kubernetes" {
  # Host and certificate configuration will be populated by EKS module
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                 = data.aws_eks_cluster_auth.cluster.token

  # Enhanced timeout settings for reliability
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      local.cluster_name,
      "--region",
      var.aws_region
    ]
  }

  # Timeouts configuration for better reliability
  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}

# Data sources for EKS authentication
data "aws_eks_cluster" "cluster" {
  name = local.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = local.cluster_name
}

# Local variables
locals {
  cluster_name = "${var.project_name}-${var.environment}-eks"
}