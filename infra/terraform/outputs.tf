output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "EC2 public IPv4 address"
  value       = aws_instance.app.public_ip
}

output "app_url" {
  description = "Public PocketLedger URL"
  value       = "http://${aws_instance.app.public_ip}:${var.app_port}"
}

output "security_group_id" {
  description = "Application Security Group ID"
  value       = aws_security_group.app.id
}
