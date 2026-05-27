# Jenkins CI Setup

This file describes how to configure Jenkins credentials and ECR repositories so the `Jenkinsfile` can run on your AWS-hosted Jenkins instance.

1. Jenkins Credentials

- AWS Credentials (two secret text entries):
  - `aws-access-key` : your AWS access key id (as Secret Text)
  - `aws-secret-key` : your AWS secret access key (as Secret Text)

  Alternatively, use the Jenkins AWS Credentials Plugin and bind a single credential.

- Kubeconfig (Secret Text or Secret File):
  - `kubeconfig` : contents of your kubeconfig file for the EKS cluster. The pipeline writes this to a temporary file and sets `KUBECONFIG`.

2. Job/Folder Environment Variables

Set the following environment variables in your Jenkins job (or as global environment vars):

- `AWS_REGION` (e.g. `us-east-1`)
- `AWS_ACCOUNT_ID` (your AWS account id)
- `ECR_REPO_BACKEND` (default: `interview-backend`)
- `ECR_REPO_FRONTEND` (default: `interview-frontend`)

3. Create ECR repositories (example using AWS CLI)

Run on a machine with AWS CLI configured or in CI where AWS creds have permissions to create repos.

```bash
aws ecr create-repository --repository-name interview-backend --region us-east-1 || true
aws ecr create-repository --repository-name interview-frontend --region us-east-1 || true
```

4. Ensure Jenkins agent has required tools

- `docker` (or sudoable docker)
- `aws` CLI
- `helm`
- `trivy` (optional, for image scanning)
- `python3.11`, `pip`
- `node` and `npm` (for frontend build)

If Docker requires sudo on your agent, ensure the Jenkins user can run `sudo docker` without a password, or add the Jenkins user to the `docker` group.

5. Test the pipeline

- Create a Multibranch Pipeline or a Pipeline job that checks out this repo and runs the `Jenkinsfile`.
- Trigger a build from a branch or commit. Watch the console log for credential and Docker access errors.

If you want me to add an alternative Jenkinsfile binding for the AWS plugin (`withAWS`) or to change credential types, tell me which Jenkins credential plugins you have available and I will update the pipeline accordingly.
