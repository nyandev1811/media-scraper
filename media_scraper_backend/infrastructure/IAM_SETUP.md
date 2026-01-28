# AWS IAM Setup Guide

This guide explains how to create an **IAM User** on AWS with the permissions required to deploy the Media Scraper infrastructure using Terraform.

## Prerequisites
*   An active AWS Account (Root account).

---

## Step 1: Create an IAM User

> **Note:** If you already have an IAM User with **AdministratorAccess**, you can skip to **Step 3: Generate Access Keys**.

1.  **Log in to AWS Console**: Go to [https://console.aws.amazon.com/](https://console.aws.amazon.com/).
2.  **Navigate to IAM**: In the search bar at the top, type `IAM` and select **IAM** from the services.
3.  **Users**: On the left sidebar, click **Users**.
4.  **Create User**: Click the orange **Create user** button.
5.  **User details**:
    *   **User name**: Enter `media-scraper-deployer` (or any name you prefer).
    *   **Access to AWS Management Console**: Leave this **unchecked** (we only need programmatic access for Terraform).
    *   Click **Next**.

## Step 2: Set Permissions

1.  **Permission options**: Select **Attach policies directly**.
2.  **Permission policies**:
    *   In the search bar, type `AmazonEC2FullAccess` and check the box next to it.
    *   *(Optional but recommended if you use S3 later)*: Type `AmazonS3FullAccess` and check it.
    *   *(For IAM operations if needed)*: `IAMReadOnlyAccess`.
    
    *Note: For this project (Terraform creating EC2), `AmazonEC2FullAccess` is the critical one. It allows Terraform to create Security Groups and EC2 Instances.*

3.  Click **Next**.
4.  **Review**: Check the details and click **Create user**.

## Step 3: Generate Access Keys

1.  You will be redirected back to the Users list. Click on the user you just created (`media-scraper-deployer`).
2.  Click the **Security credentials** tab (middle of the page).
3.  Scroll down to **Access keys** and click **Create access key**.
4.  **Access key best practices**: Select **Command Line Interface (CLI)**.
    *   Check the "I understand..." box and click **Next**.
    *   (Optional) Set a tag value like "Terraform User".
    *   Click **Create access key**.
5.  **IMPORTANT**:
    *   You will see an **Access key** and a **Secret access key**.
    *   **Download the .csv file** or copy these now. **You will not be able to see the Secret key again.**

---

## Step 4: Configure AWS CLI

On your local computer (where you run Terraform):

1.  Open your terminal.
2.  Run:
    ```bash
    aws configure
    ```
3.  Enter the details from Step 3:
    *   **AWS Access Key ID**: (Paste your key)
    *   **AWS Secret Access Key**: (Paste your secret)
    *   **Default region name**: `ap-southeast-1` (or your preferred region, e.g., `us-east-1`).
    *   **Default output format**: `json`

## Verification

To verify it works, run:
```bash
aws ec2 describe-instances
```
If you get a JSON response (even empty), your access is correctly set up!
