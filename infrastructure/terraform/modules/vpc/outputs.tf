# VPC Outputs
output "vpc_id" {
  description = "The ID of the created VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the created VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs (if enabled)"
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[*].id : []
}

# Route Table Outputs
output "route_table_ids" {
  description = "Map of route table IDs for public and private subnets"
  value = {
    public  = aws_route_table.public.id
    private = aws_route_table.private[*].id
  }
}

# VPC Flow Log Output
output "vpc_flow_log_id" {
  description = "ID of the VPC Flow Log"
  value       = aws_flow_log.main.id
}

# Availability Zones Output
output "availability_zones" {
  description = "List of availability zones used for VPC subnets"
  value       = var.availability_zones
}

# VPC Endpoint Outputs
output "vpc_endpoints" {
  description = "Map of VPC Endpoint IDs for AWS services"
  value = {
    s3        = aws_vpc_endpoint.s3.id
    dynamodb  = aws_vpc_endpoint.dynamodb.id
  }
}

# Network ACL Outputs
output "network_acl_ids" {
  description = "Map of Network ACL IDs for public and private subnets"
  value = {
    public  = aws_subnet.public[*].network_acl_id
    private = aws_subnet.private[*].network_acl_id
  }
}

# Internet Gateway Output
output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

# CloudWatch Log Group Output
output "flow_log_group_name" {
  description = "Name of the CloudWatch Log Group for VPC Flow Logs"
  value       = aws_cloudwatch_log_group.flow_log.name
}