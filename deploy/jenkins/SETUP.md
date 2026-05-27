# Jenkins CI Setup

This file describes how to configure Jenkins credentials and ECR repositories so the `Jenkinsfile` can run on your AWS-hosted Jenkins instance.

1. Jenkins Credentials

- AWS Credentials (two secret text entries):
  - `aws-access-key` : your AWS access key id (as Secret Text)
  - `aws-secret-key` : your AWS secret access key (as Secret Text)

  Alternatively, use the Jenkins AWS Credentials Plugin and bind a single credential.

- Kubeconfig (Secret Text or Secret File):
  - `kubeconfig` : contents of your kubeconfig file for the EKS cluster. The pipeline writes this to a temporary file and sets `KUBECONFIG`.

- Integration DB credentials (optional):
  - `integration-db-creds` : a Jenkins `Username with password` credential where the username will be used as `INTEGRATION_DB_USER` and the password as `INTEGRATION_DB_PASSWORD`. If present, the pipeline will use these credentials for integration tests when Docker is not available.

- Slack webhook (optional):
  - `slack-webhook` : Secret Text containing a Slack Incoming Webhook URL. When set, the pipeline will post success/failure notifications to the webhook.

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

Optional tooling and credentials

- Snyk: If you use Snyk for container scanning, create a Jenkins Secret Text credential named `snyk-token` containing your Snyk API token. The pipeline will run `snyk test --docker <image>` when the token is present and the `snyk` CLI is installed on the agent.

If Docker requires sudo on your agent, ensure the Jenkins user can run `sudo docker` without a password, or add the Jenkins user to the `docker` group.

5. Test the pipeline

- Create a Multibranch Pipeline or a Pipeline job that checks out this repo and runs the `Jenkinsfile`.
- Trigger a build from a branch or commit. Watch the console log for credential and Docker access errors.

If you want me to add an alternative Jenkinsfile binding for the AWS plugin (`withAWS`) or to change credential types, tell me which Jenkins credential plugins you have available and I will update the pipeline accordingly.

Frontend dependency notes

- The pipeline expects the frontend `package.json` to reference `@monaco-editor/react` and `react-sketch-canvas`. If `npm install --legacy-peer-deps` fails on your machine or Jenkins agent, run the following locally to resolve and regenerate `package-lock.json` and then commit the updated lockfile:

```bash
cd frontend
npm install @monaco-editor/react@latest react-sketch-canvas@latest --legacy-peer-deps
npm install --legacy-peer-deps
git add package-lock.json && git commit -m "chore: update frontend lockfile for monaco/sketch libs" && git push
```

If your CI environment has no outbound internet access for npm, you will need to provide a prepared `node_modules` tarball or an internal npm registry mirror that hosts these packages.
