variable "aws_region" {
  description = "AWS region for the project"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name used for AWS resources"
  type        = string
  default     = "pocketledger"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "admin_cidr" {
  description = "Your public IPv4 address with /32 for SSH access"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.admin_cidr)) && endswith(var.admin_cidr, "/32")
    error_message = "admin_cidr must be one IPv4 address using /32."
  }
}

variable "public_key_path" {
  description = "Absolute path to the local SSH public key"
  type        = string
}

variable "app_port" {
  description = "Public application port"
  type        = number
  default     = 3000
}
