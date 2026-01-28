# Infrastructure Setup Guide

This directory contains the Infrastructure as Code (IaC) to provision and configure the AWS Server for the Media Scraper project.

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured.
- [Terraform](https://developer.hashicorp.com/terraform/install) installed.
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html) installed.

## 1. Setup AWS Credentials

If you haven't set up an IAM user yet, follow the [IAM Setup Guide](./IAM_SETUP.md).

Run:
```bash
aws configure
```

## 2. Provision Infrastructure (Terraform)

Navigate to the terraform directory:
```bash
cd terraform
```

Initialize Terraform (downloads provider plugins):
```bash
terraform init
```

Preview changes:
```bash
terraform plan
```

Apply changes (Create EC2, VPC, Security Groups):
```bash
terraform apply
```
*Type `yes` when prompted.*

This will:
1. Create an EC2 instance (Ubuntu 22.04).
2. Create a VPC/Subnet/Security Group.
3. **Generate an SSH key** named `media_scraper_key.pem` in this directory.
4. Output the **Public IP** of the instance.

**Important:** Change permissions of the generated key:
```bash
chmod 400 media_scraper_key.pem
```

## 3. Configure Server (Ansible)

Once the server is up, use Ansible to install Docker and dependencies.

Navigate to the ansible directory:
```bash
cd ../ansible
```

Create an inventory file (replace `x.x.x.x` with your new Public IP):
```bash
echo "[webserver]" > inventory
echo "x.x.x.x ansible_user=ubuntu ansible_ssh_private_key_file=../terraform/media_scraper_key.pem" >> inventory
```

Run the playbook:
```bash
ansible-playbook -i inventory playbook.yml
```

## 4. Deploy Application

SSH into your server:
```bash
ssh -i ../terraform/media_scraper_key.pem ubuntu@x.x.x.x
```

Clone your repository and run docker-compose:
```bash
git clone <your-repo-url>
cd media_scraper
docker-compose up -d --build
```
