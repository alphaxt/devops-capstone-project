# PocketLedger Expense Tracker

PocketLedger is a Node.js, Express, EJS, and PostgreSQL expense tracker.

## Application Port

The application is available on port `3000`.

After starting the container, open:

http://localhost:3000

Health check:

http://localhost:3000/health

## Run with Docker Compose

The application and PostgreSQL database run as separate containers.

1. Copy `.env.example` to `.env`.
2. Replace the placeholder values in `.env`.
3. Start the services:

```bash
docker compose up -d --build
```

## Run with Kubernetes/Minikube

### Prerequisites

- **Kubectl**: Kubernetes command-line tool
- **Minikube**: Local Kubernetes cluster

### Deployment Steps

1. **Start Minikube**:

```bash
minikube start --driver=docker
```

2. **Set up Kubernetes namespace and secrets**:

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets from .env values
kubectl -n pocketledger create secret generic pocketledger-secrets \
  --from-literal=POSTGRES_USER=your_username \
  --from-literal=POSTGRES_PASSWORD=your_password \
  --from-literal=POSTGRES_DB=your_database
```

3. **Deploy PostgreSQL**:

```bash
kubectl apply -f k8s/postgres.yaml
```

4. **Deploy the application**:

```bash
kubectl apply -f k8s/app.yaml
```

5. **Access the application**:

Get the Minikube IP:

```bash
minikube ip
```

Access the application at `http://<minikube-ip>:30080`

Or use `minikube service`:

```bash
minikube service pocketledger-app -n pocketledger --url
```

6. **Health check**:

```bash
kubectl -n pocketledger get pods
kubectl -n pocketledger logs <pocketledger-pod-name>
```

### Clean Up

To remove all resources:

```bash
kubectl delete -f k8s/
minikube stop
```

## Deploy with Terraform (AWS)

### Prerequisites

- **Terraform**: Infrastructure as Code (>= 1.8.0)
- **AWS CLI**: Installed and configured with credentials
- **SSH Key**: Public key for EC2 access

### Deployment Steps

1. **Configure AWS credentials**:

```bash
aws configure
```

2. **Copy and update Terraform variables**:

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
```

Edit `infra/terraform/terraform.tfvars` with your values:

```hcl
aws_region      = "us-east-1"
project_name    = "pocketledger"
instance_type   = "t3.micro"
admin_cidr      = "YOUR_PUBLIC_IP/32"
public_key_path = "C:/Users/YOUR_USERNAME/.ssh/pocketledger-ec2.pub"
app_port        = 3000
```

3. **Initialize and apply Terraform**:

```bash
cd infra/terraform
terraform init
terraform validate
terraform plan
terraform apply -auto-approve
```

4. **Access the application**:

After deployment, Terraform outputs will show:

- `public_ip`: EC2 public IP address
- `app_url`: Full URL to access PocketLedger

5. **Deploy application to EC2**:

SSH into the EC2 instance:

```bash
ssh -i ~/.ssh/pocketledger-ec2.pub ubuntu@<public_ip>
```

Clone and deploy the application:

```bash
cd /opt/pocketledger
git clone <your-repo-url> .
cp .env.example .env
# Edit .env with database credentials
docker-compose -f deploy/docker-compose.ec2.yml up -d --build
```

### Clean Up

To destroy all Terraform-managed resources:

```bash
cd infra/terraform
terraform destroy -auto-approve
```

## CI/CD Pipeline

GitHub Actions automatically runs whenever code is pushed to the `main` branch.

The workflow:

1. Installs the Node.js dependencies.
2. Runs the automated tests.
3. Builds the Docker image.
4. Logs in to Docker Hub using GitHub Secrets.
5. Pushes `latest`, build-number, and commit-SHA image tags.

Docker Hub credentials are stored as the `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN` GitHub repository secrets. No registry credentials are
stored in the repository.

