# Jenkins CI/CD Setup & Configuration Guide

This guide walks through setting up the enterprise-grade Jenkins pipeline for the AI Powered Coding Interview Platform.

## 📋 Prerequisites

### System Requirements
- Jenkins 2.387+ (LTS)
- 8GB+ RAM
- 50GB+ disk space
- Docker installed on build agents
- Jenkins controller on the AWS EC2 instance created for this repository
- Kubernetes cluster (EKS)
- Git repository

## 🧱 Provision the Jenkins Controller

Use Terraform to create the always-on Jenkins EC2 instance, security group, IAM role, and EIP:

```bash
cd infra/terraform
terraform init
terraform apply -var-file=terraform.tfvars
```

After apply, open the Jenkins URL from Terraform output:

```bash
terraform output -raw jenkins_url
```

The instance installs Jenkins, Docker, Node.js, npm, kubectl, Helm, Terraform, and Trivy automatically through EC2 user data.

### Runtime Model
- Use the Jenkins controller on AWS as the always-on CI/CD runner.
- Do not depend on a local Jenkins installation for builds or deployments.
- Keep the pipeline source in this repository and trigger it from GitHub webhooks.
- The Jenkins controller must have both `python3` and `node/npm` available for the current one-pass pipeline.
- The Jenkins controller must have Python 3.11 available as `python3.11` for the backend stage.

### Required Jenkins Plugins

```groovy
// Install these plugins in Jenkins > Manage Jenkins > Manage Plugins

Plugins:
- Pipeline: Pipeline
- Pipeline: Stage View
- BlueOcean
- Email Extension
- Slack Notification
- GitHub
- GitHub Pull Request Builder
- AWS CodeBuild
- AWS Lambda
- SonarQube Scanner
- Snyk Security
- Kubernetes
- Docker
- Helm
- Terraform
- AnsiColor
- Timestamper
- Log Parser
- JUnit Plugin
- Cobertura Plugin
- Performance Plugin
```

### Install Command (Bash)
```bash
# SSH into Jenkins server and run:
java -jar jenkins-cli.jar -s http://localhost:8080 \
  install-plugin pipeline-model-definition \
  pipeline-stage-view \
  blueocean \
  email-ext \
  slack \
  github \
  github-pr-comment-build \
  aws-codecommit-trigger \
  sonar \
  snyk-security-scanner \
  kubernetes \
  docker-plugin \
  helm \
  terraform \
  ansicolor \
  timestamper \
  log-parser \
  junit \
  cobertura \
  performance \
  -restart
```

## 🔑 Jenkins Credentials Setup

### 1. AWS Credentials
**Path**: Manage Jenkins > Manage Credentials > System > Global Credentials

```
Credential Type: AWS Credentials
Access Key ID: [your-aws-access-key]
Secret Access Key: [your-aws-secret-key]
ID: aws-creds (must match Jenkinsfile)
```

### 2. Kubernetes Kubeconfig
```
Credential Type: Secret file
File: ~/.kube/config (staging)
ID: kubeconfig-staging

File: ~/.kube/config (production)
ID: kubeconfig-production
```

### 3. SonarQube Token
```
Credential Type: Secret text
Secret: [sonarqube-token]
ID: sonarqube-token
```

### 4. Snyk Token
```
Credential Type: Secret text
Secret: [snyk-api-token]
ID: snyk-token
```

### 5. GitHub Token
```
Credential Type: Secret text
Secret: [github-personal-access-token]
ID: jenkins-github-token
```

### 6. Slack Webhook
```
Credential Type: Secret text
Secret: [webhook-url]
ID: slack-webhook
```

### 7. Discord Webhook
```
Credential Type: Secret text
Secret: [discord-webhook-url]
ID: discord-webhook
```

## 🔧 Environment Variables Setup

**Path**: Manage Jenkins > System > Global properties

```properties
# SonarQube
SONARQUBE_HOST=https://sonarqube.example.com
SONARQUBE_TOKEN=***

# AWS
AWS_REGION=ap-south-1
AWS_ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com

# Kubernetes
KUBE_CONFIG=/var/jenkins_home/.kube/config

# Slack
SLACK_CHANNEL=#deployments
SLACK_WEBHOOK_URL=***

# Build Settings
JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8
DOCKER_REGISTRY_URL=123456789012.dkr.ecr.us-east-1.amazonaws.com
```

## 📦 Pipeline Job Configuration

### Step 1: Create New Pipeline Job

1. Open the AWS Jenkins URL from Terraform output.
2. Sign in to Jenkins on the EC2 controller.
3. Create a new Pipeline job named `interview-platform-main`.

### Step 2: Configure Pipeline

```groovy
// Pipeline section settings
Definition: Pipeline script from SCM
SCM: Git
Repository URL: https://github.com/your-org/interview-platform.git
Credentials: Select your GitHub credentials
Branch Specifier: */main
Script Path: Jenkinsfile
Lightweight checkout: Enable

Create this job on the AWS-hosted controller so builds and deploys continue even when your laptop is off.
```

### Step 3: Build Triggers

```
GitHub hook trigger for GITScm polling: Enable
Poll SCM:
  disabled
```

The webhook trigger is the active path. The pipeline no longer relies on periodic SCM polling or a local Jenkins instance.

### Step 3b: Configure GitHub Webhook

Add a webhook in your GitHub repository:

1. GitHub > Settings > Webhooks > Add webhook.
2. Payload URL: `http://<jenkins-public-ip>:8080/github-webhook/`.
3. Content type: `application/json`.
4. Trigger on push events.
5. Save the webhook and test delivery.

### Step 4: Pipeline Parameters

The Jenkinsfile includes these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| ECR_ACCOUNT | String | | AWS Account ID |
| ECR_REPO_BACKEND | String | interview-platform-backend | Backend ECR repo |
| ECR_REPO_FRONTEND | String | interview-platform-frontend | Frontend ECR repo |
| AWS_REGION | String | ap-south-1 | AWS Region |
| DEPLOY_ENV | Choice | staging/production | Target environment |
| DEPLOY_STRATEGY | Choice | rolling/blue-green/canary | Deployment strategy |
| DISCORD_WEBHOOK_CREDENTIAL_ID | String | discord-webhook | Discord webhook credential |
| SAST_SCAN | Choice | true/false | Run SonarQube |
| SCA_SCAN | Choice | true/false | Run Snyk |
| DAST_SCAN | Choice | true/false | Run OWASP ZAP |
| CONTAINER_SCAN | Choice | true/false | Run Trivy |

## 🚀 Triggering the Pipeline

### Via GitHub Webhook

1. GitHub > Settings > Webhooks > Add webhook
2. Payload URL: `https://jenkins.example.com/github-webhook/`
3. Content type: application/json
4. Events: 
   - Push events
   - Pull request events
5. Active: Enable

### Via Jenkins UI

1. Jenkins > interview-platform-main
2. Build with Parameters
3. Select parameters
4. Click Build

### Via CLI

```bash
# Install Jenkins CLI
curl -sO https://jenkins.example.com/jnlpJars/jenkins-cli.jar

# Trigger build
java -jar jenkins-cli.jar -s https://jenkins.example.com \
  build interview-platform-main \
  -p ECR_ACCOUNT=123456789012 \
  -p DEPLOY_ENV=staging \
  -p DEPLOY_STRATEGY=rolling \
  -f
```

### Via API

```bash
curl -X POST \
  https://jenkins.example.com/job/interview-platform-main/buildWithParameters \
  -u user:token \
  -d "ECR_ACCOUNT=123456789012&DEPLOY_ENV=staging&DEPLOY_STRATEGY=rolling"
```

## 📊 Monitoring Pipeline Execution

### BlueOcean View
```
Jenkins > Open Blue Ocean > Select interview-platform-main
- Visual pipeline representation
- Stage timing
- Log viewing
- Branch overview
```

### Build History
```
Jenkins > interview-platform-main > Build History
- Filter by status (success/failure)
- View build details
- Download artifacts
```

### Console Output
```
Jenkins > interview-platform-main > Build #123 > Console Output
- Real-time logs
- Stage completion times
- Error messages
```

## 🔍 Troubleshooting

### Pipeline Fails at Checkout

**Symptom**: `Hudson.remoting.ProxyException: Timeout after 10 minutes`

**Solution**:
```groovy
// In Jenkinsfile, add to options:
timeout(time: 180, unit: 'MINUTES')  // Increase from 120
```

### Docker Build Fails

**Symptom**: `docker: command not found`

**Solution**:
```bash
# Install Docker on Jenkins agent
sudo apt-get install docker.io
sudo usermod -aG docker jenkins
sudo systemctl restart docker
sudo systemctl restart jenkins
```

### SonarQube Analysis Fails

**Symptom**: `SONARQUBE_HOST or SONARQUBE_TOKEN not set`

**Solution**:
1. Verify credentials in Jenkins > Manage Credentials
2. Check environment variables are set globally
3. Test SonarQube connection:
```bash
curl -u admin:password https://sonarqube.example.com/api/system/health
```

### Kubernetes Deployment Fails

**Symptom**: `Unable to connect to cluster`

**Solution**:
```bash
# Verify kubeconfig
kubectl config current-context

# Test from Jenkins agent
kubectl --kubeconfig=/var/jenkins_home/.kube/config get nodes

# Update kubeconfig in Jenkins credentials
```

## 🔐 Security Best Practices

### 1. Credential Management
- ✅ Store all secrets in Jenkins Credentials
- ✅ Never hardcode secrets in Jenkinsfile
- ❌ Don't use admin credentials for CI/CD
- ✅ Rotate credentials every 90 days

### 2. Agent Security
- ✅ Run agents as non-root user
- ✅ Use dedicated build agents (not master)
- ✅ Keep agents in private subnets
- ✅ Use SSH authentication to agents

### 3. Pipeline Security
- ✅ Review all pipeline changes
- ✅ Use approval gates for production
- ✅ Audit all deployments
- ✅ Enable pipeline logging

### 4. Registry Access
- ✅ Use IAM roles instead of static credentials
- ✅ Scan images before pushing
- ✅ Sign Docker images
- ✅ Use private registries

## 📈 Performance Optimization

### Build Time Optimization

```groovy
// 1. Parallel Stages
stage('Parallel Tests') {
  parallel {
    stage('Backend') { ... }
    stage('Frontend') { ... }
  }
}

// 2. Cache Dependencies
sh 'docker build --cache-from interview-platform-backend:latest ...'

// 3. Skip Unnecessary Scans
when { expression { GIT_BRANCH == 'main' } }

// 4. Use Build Cache
docker buildx build --cache-type=local ...
```

### Artifact Management

```groovy
// Archive only essential artifacts
archiveArtifacts artifacts: '**/*-report.json,build-info.json'

// Use BuildDiscarder for cleanup
buildDiscarder(logRotator(numToKeepStr: '50', artifactNumToKeepStr: '10'))
```

## 📞 Support & Resources

- **Jenkins Documentation**: https://www.jenkins.io/doc/
- **Pipeline Documentation**: https://www.jenkins.io/doc/book/pipeline/
- **SonarQube Docs**: https://docs.sonarqube.org/
- **Snyk Docs**: https://support.snyk.io/
- **Kubernetes Docs**: https://kubernetes.io/docs/

---

**Your Jenkins pipeline is now enterprise-grade and production-ready!** ✨
