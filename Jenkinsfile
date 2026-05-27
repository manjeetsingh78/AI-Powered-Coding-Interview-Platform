#!/usr/bin/env groovy

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 90, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
    disableConcurrentBuilds()
    skipDefaultCheckout()
  }

  parameters {
    booleanParam(name: 'RUN_EXTRA_CHECKS', defaultValue: false, description: 'Run preflight, backend tests, report uploads, integration tests, and frontend validation')
  }

  triggers {
    githubPush()
  }

  environment {
    CI = 'true'
    PYTHONUNBUFFERED = '1'
    NODE_OPTIONS = '--max_old_space_size=4096'
    PYTHON_BIN = 'python3.11'
    SECRET_KEY = 'ci-temporary-secret'
    AWS_REGION = ''
    AWS_ACCOUNT_ID = ''
    ECR_REPO_BACKEND = 'interview-backend'
    ECR_REPO_FRONTEND = 'interview-frontend'
    SNYK_TOKEN = ''
    DISCORD_WEBHOOK = ''
    REPORTS_S3_BUCKET = ''
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_COMMIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          env.GIT_BRANCH_NAME = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
          env.GIT_VERSION = sh(returnStdout: true, script: 'git describe --tags --always || echo v0.0.0').trim()
          env.COMMIT = env.GIT_COMMIT_SHORT

          echo "Build: ${env.GIT_COMMIT_SHORT} on ${env.GIT_BRANCH_NAME} (${env.GIT_VERSION})"
        }
      }
    }

    stage('Load AWS Credentials') {
      steps {
        script {
          try {
            withCredentials([string(credentialsId: 'aws-account-id', variable: 'AWS_ACCOUNT_ID_CRED'), string(credentialsId: 'aws-region', variable: 'AWS_REGION_CRED'), string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK_CRED'), string(credentialsId: 'reports-s3-bucket', variable: 'REPORTS_S3_BUCKET_CRED')]) {
              if (AWS_ACCOUNT_ID_CRED?.trim()) { env.AWS_ACCOUNT_ID = "${AWS_ACCOUNT_ID_CRED}" }
              if (AWS_REGION_CRED?.trim()) { env.AWS_REGION = "${AWS_REGION_CRED}" }
              if (DISCORD_WEBHOOK_CRED?.trim()) { env.DISCORD_WEBHOOK = "${DISCORD_WEBHOOK_CRED}" }
              if (REPORTS_S3_BUCKET_CRED?.trim()) { env.REPORTS_S3_BUCKET = "${REPORTS_S3_BUCKET_CRED}" }
              if (env.AWS_ACCOUNT_ID?.trim() && env.AWS_REGION?.trim()) {
                env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
              }
              echo "Loaded AWS, Discord webhook, and Reports S3 bucket from Jenkins credentials."
            }
          } catch (e) {
            echo 'Some credentials (aws-account-id/aws-region/discord-webhook/reports-s3-bucket) not found in Jenkins; using defaults in environment.'
          }
        }
      }
    }
    stage('Preflight') {
      when {
        expression { params.RUN_EXTRA_CHECKS }
      }
      steps {
        sh '''
          set -eux
          python3.11 - <<'PY'
import sys
major, minor = sys.version_info[:2]
if (major, minor) < (3, 10):
    raise SystemExit(f"Python 3.10+ is required, but Jenkins has {major}.{minor}")
print(f"Python version OK: {major}.{minor}")
PY
        '''
      }
    }

    stage('Backend') {
      when {
        expression { params.RUN_EXTRA_CHECKS }
      }
      steps {
        dir('backend') {
          sh '''
            set -eux
            if ! python3.11 -m pip --version >/dev/null 2>&1; then
              python3.11 -m ensurepip --upgrade || sudo dnf install -y python3.11-pip
            fi
            python3.11 -m pip install --upgrade pip setuptools wheel
            python3.11 -m pip install -r requirements.txt
            python3.11 -m pip install pytest pytest-cov pytest-django black flake8 pylint pylint-django bandit safety

            export SECRET_KEY='ci-temporary-secret'
            export DEBUG=True
            export DJANGO_SETTINGS_MODULE=config.test_settings

            python3.11 -m black .
            python3.11 -m flake8 --max-line-length=120 --exclude=migrations,venv
            python3.11 -m pylint apps/ config/ manage.py --disable=all --enable=E,F --disable=E1101,E0307
            python3.11 -m pytest --junitxml=junit.xml --cov=apps --cov=config --cov-report=term-missing -v
            python3.11 -m bandit -r apps/ config/ -f json -o bandit-report.json || true
            python3.11 -m safety check --json > safety-report.json || true
          '''
        }
      }
      post {
        always {
          dir('backend') {
            junit testResults: 'junit.xml', allowEmptyResults: true, skipPublishingChecks: true
            archiveArtifacts artifacts: 'junit.xml,bandit-report.json,safety-report.json', allowEmptyArchive: true
          }
        }
      }
    }

    stage('Upload Reports to S3') {
      when {
        allOf {
          expression { params.RUN_EXTRA_CHECKS }
          expression { env.REPORTS_S3_BUCKET?.trim() }
        }
      }
      steps {
        script {
          dir('backend') {
            sh '''
              set -eux
              aws s3 cp junit.xml s3://${REPORTS_S3_BUCKET}/${GIT_COMMIT_SHORT}/backend/junit.xml || true
              aws s3 cp bandit-report.json s3://${REPORTS_S3_BUCKET}/${GIT_COMMIT_SHORT}/backend/bandit-report.json || true
              aws s3 cp safety-report.json s3://${REPORTS_S3_BUCKET}/${GIT_COMMIT_SHORT}/backend/safety-report.json || true
            '''
          }
          dir('.') {
            // also attempt to upload frontend artifacts if present
            sh '''
              set -eux
              if [ -f frontend/coverage/lcov.info ]; then
                aws s3 cp frontend/coverage/lcov.info s3://${REPORTS_S3_BUCKET}/${GIT_COMMIT_SHORT}/frontend/lcov.info || true
              fi
            '''
          }
        }
      }
    }

    stage('Integration Tests (Postgres)') {
      when {
        expression { params.RUN_EXTRA_CHECKS }
      }
      steps {
        dir('backend') {
          script {
            // Try to run integration tests using Jenkins-stored DB creds if available,
            // otherwise fall back to existing INTEGRATION_DB_* env vars or ephemeral Docker.
            try {
              withCredentials([usernamePassword(credentialsId: 'integration-db-creds', usernameVariable: 'INTEGRATION_DB_USER', passwordVariable: 'INTEGRATION_DB_PASSWORD')]) {
                echo 'Using Jenkins credential integration-db-creds for integration DB user/password'
                sh '''
                  set -eux
                  # Determine Docker command accessibility. Try docker, then sudo docker.
                  DOCKER_CMD=""
                  if docker info >/dev/null 2>&1; then
                    DOCKER_CMD=docker
                  elif sudo -n docker info >/dev/null 2>&1; then
                    DOCKER_CMD="sudo docker"
                  else
                    DOCKER_CMD=""
                  fi

                  if [ -n "$DOCKER_CMD" ]; then
                    $DOCKER_CMD pull postgres:18
                    $DOCKER_CMD run -d --name ci-postgres -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=ci_db -p 5433:5432 postgres:18
                  else
                    echo "Docker CLI not available to the Jenkins user. Falling back to INTEGRATION_DB_* env vars (credential provided for user/password)."
                  fi

                  if [ -n "$DOCKER_CMD" ]; then
                    for i in $(seq 1 60); do
                      if $DOCKER_CMD exec ci-postgres pg_isready -U ci >/dev/null 2>&1; then
                        break
                      fi
                      sleep 1
                    done

                    export DB_HOST=127.0.0.1
                    export DB_PORT=5433
                    export DB_NAME=ci_db
                    export DB_USER=ci
                    export DB_PASSWORD=ci
                  else
                    export DB_HOST=${INTEGRATION_DB_HOST}
                    export DB_PORT=${INTEGRATION_DB_PORT:-5432}
                    export DB_NAME=${INTEGRATION_DB_NAME:-interview_platform_db}
                    export DB_USER=${INTEGRATION_DB_USER:-$INTEGRATION_DB_USER}
                    export DB_PASSWORD=${INTEGRATION_DB_PASSWORD:-$INTEGRATION_DB_PASSWORD}
                  fi

                  python3.11 -m pip install -r requirements.txt
                  python3.11 manage.py migrate --noinput
                  python3.11 -m pytest --junitxml=integration-junit.xml --cov=apps --cov=config --cov-report=term-missing -v

                  if [ -n "$DOCKER_CMD" ]; then
                    $DOCKER_CMD rm -f ci-postgres || true
                  fi
                '''
              }
            } catch (e) {
              echo 'integration-db-creds not found or failed to bind — falling back to prior behavior using INTEGRATION_DB_* or Docker'
              sh '''
                set -eux
                # Determine Docker command accessibility. Try docker, then sudo docker.
                DOCKER_CMD=""
                if docker info >/dev/null 2>&1; then
                  DOCKER_CMD=docker
                elif sudo -n docker info >/dev/null 2>&1; then
                  DOCKER_CMD="sudo docker"
                else
                  DOCKER_CMD=""
                fi

                if [ -n "$DOCKER_CMD" ]; then
                  $DOCKER_CMD pull postgres:18
                  $DOCKER_CMD run -d --name ci-postgres -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=ci_db -p 5433:5432 postgres:18
                else
                  echo "Docker CLI not available to the Jenkins user."
                  if [ -n "${INTEGRATION_DB_HOST:-}" ]; then
                    echo "Falling back to INTEGRATION_DB_HOST=${INTEGRATION_DB_HOST}";
                  else
                    echo "No Docker access and no INTEGRATION_DB_HOST configured — skipping integration tests.";
                    exit 0
                  fi
                fi

                if [ -n "$DOCKER_CMD" ]; then
                  for i in $(seq 1 60); do
                    if $DOCKER_CMD exec ci-postgres pg_isready -U ci >/dev/null 2>&1; then
                      break
                    fi
                    sleep 1
                  done

                  export DB_HOST=127.0.0.1
                  export DB_PORT=5433
                  export DB_NAME=ci_db
                  export DB_USER=ci
                  export DB_PASSWORD=ci
                else
                  export DB_HOST=${INTEGRATION_DB_HOST}
                  export DB_PORT=${INTEGRATION_DB_PORT:-5432}
                  export DB_NAME=${INTEGRATION_DB_NAME:-interview_platform_db}
                  export DB_USER=${INTEGRATION_DB_USER}
                  export DB_PASSWORD=${INTEGRATION_DB_PASSWORD}
                fi

                python3.11 -m pip install -r requirements.txt
                python3.11 manage.py migrate --noinput
                python3.11 -m pytest --junitxml=integration-junit.xml --cov=apps --cov=config --cov-report=term-missing -v

                if [ -n "$DOCKER_CMD" ]; then
                  $DOCKER_CMD rm -f ci-postgres || true
                fi
              '''
            }
          }
        }
      }
      post {
        always {
          dir('backend') {
            junit testResults: 'integration-junit.xml', allowEmptyResults: true, skipPublishingChecks: true
            archiveArtifacts artifacts: 'integration-junit.xml', allowEmptyArchive: true
          }
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        script {
          withCredentials([string(credentialsId: 'aws-account-id', variable: 'AWS_ACCOUNT_ID_CRED'), string(credentialsId: 'aws-region', variable: 'AWS_REGION_CRED')]) {
            def ecrRegistry = "${AWS_ACCOUNT_ID_CRED?.trim()}.dkr.ecr.${AWS_REGION_CRED?.trim()}.amazonaws.com"
            if (!AWS_ACCOUNT_ID_CRED?.trim() || !AWS_REGION_CRED?.trim()) {
              error("ECR registry is not configured. Check aws-account-id and aws-region Jenkins credentials.")
            }
            withEnv([
              "COMMIT=${env.GIT_COMMIT_SHORT}",
              "ECR_REGISTRY=${ecrRegistry}"
            ]) {
              parallel backend: {
                dir('backend') {
                  sh '''
                    set -eux
                    docker build -t ${ECR_REPO_BACKEND}:${COMMIT} .
                    docker tag ${ECR_REPO_BACKEND}:${COMMIT} ${ECR_REGISTRY}/${ECR_REPO_BACKEND}:${COMMIT}
                  '''
                }
              }, frontend: {
                dir('frontend') {
                  sh '''
                    set -eux
                    docker build -t ${ECR_REPO_FRONTEND}:${COMMIT} .
                    docker tag ${ECR_REPO_FRONTEND}:${COMMIT} ${ECR_REGISTRY}/${ECR_REPO_FRONTEND}:${COMMIT}
                  '''
                }
              }
            }
          }
        }
      }
    }

    stage('Push Images to ECR & Scan') {
      steps {
        script {
          withCredentials([string(credentialsId: 'aws-account-id', variable: 'AWS_ACCOUNT_ID_CRED'), string(credentialsId: 'aws-region', variable: 'AWS_REGION_CRED')]) {
            def ecrRegistry = "${AWS_ACCOUNT_ID_CRED?.trim()}.dkr.ecr.${AWS_REGION_CRED?.trim()}.amazonaws.com"
            if (!AWS_ACCOUNT_ID_CRED?.trim() || !AWS_REGION_CRED?.trim()) {
              error("ECR registry is not configured. Check aws-account-id and aws-region Jenkins credentials.")
            }
            withEnv([
              'AWS_REGION=' + AWS_REGION_CRED,
              'ECR_REGISTRY=' + ecrRegistry,
              'COMMIT=' + env.GIT_COMMIT_SHORT
            ]) {
              sh 'set -eux; aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}'
              parallel push_backend: {
                sh '''
                  set -eux
                  docker push ${ECR_REGISTRY}/${ECR_REPO_BACKEND}:${COMMIT}
                '''
              }, push_frontend: {
                sh '''
                  set -eux
                  docker push ${ECR_REGISTRY}/${ECR_REPO_FRONTEND}:${COMMIT}
                '''
              }

              if (params.RUN_EXTRA_CHECKS) {
                parallel scan_backend: {
                  sh '''
                    set -eux
                    if command -v trivy >/dev/null 2>&1; then
                      trivy image --exit-code 1 --severity HIGH,CRITICAL ${ECR_REGISTRY}/${ECR_REPO_BACKEND}:${COMMIT} || true
                    fi
                    if command -v snyk >/dev/null 2>&1 && [ -n "${SNYK_TOKEN:-}" ]; then
                      echo "$SNYK_TOKEN" | snyk auth || true
                      snyk test --docker ${ECR_REGISTRY}/${ECR_REPO_BACKEND}:${COMMIT} || true
                    fi
                  '''
                }, scan_frontend: {
                  sh '''
                    set -eux
                    if command -v trivy >/dev/null 2>&1; then
                      trivy image --exit-code 1 --severity HIGH,CRITICAL ${ECR_REGISTRY}/${ECR_REPO_FRONTEND}:${COMMIT} || true
                    fi
                    if command -v snyk >/dev/null 2>&1 && [ -n "${SNYK_TOKEN:-}" ]; then
                      echo "$SNYK_TOKEN" | snyk auth || true
                      snyk test --docker ${ECR_REGISTRY}/${ECR_REPO_FRONTEND}:${COMMIT} || true
                    fi
                  '''
                }
              }
            }
          }
        }
      }
    }

    stage('Deploy to EKS (Helm)') {
      steps {
        script {
          withCredentials([string(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_CONTENT')]) {
            sh '''
              set -eux
              echo "$KUBECONFIG_CONTENT" > kubeconfig
              export KUBECONFIG=$(pwd)/kubeconfig
              # Deploy backend and frontend releases in parallel via helm (chart must accept overrides)
              helm upgrade --install interview-backend ./deploy/helm/interview-platform --set image.backend=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${COMMIT} --set image.frontend.skip=true &
              helm upgrade --install interview-frontend ./deploy/helm/interview-platform --set image.frontend=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${COMMIT} --set image.backend.skip=true &
              wait
            '''
          }
        }
      }
    }

    stage('Frontend') {
      when {
        expression { params.RUN_EXTRA_CHECKS }
      }
      steps {
        dir('frontend') {
          sh '''
            set -eux
            npm install --legacy-peer-deps
            npm run lint
            npm run coverage || npm run test
            npm run build
          '''
        }
      }
      post {
        always {
          dir('frontend') {
            archiveArtifacts artifacts: 'coverage/**,dist/**', allowEmptyArchive: true
          }
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    success {
      script {
        echo 'Pipeline completed successfully.'
          try {
          withCredentials([string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK')]) {
            sh '''
              payload=$(printf '{"content":"Jenkins: %s #%s succeeded - %s"}' "${JOB_NAME}" "${BUILD_NUMBER}" "${BUILD_URL}")
              curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK" || true
            '''
          }
        } catch (e) {
          echo 'No discord-webhook credential configured, skipping Discord notification.'
        }
      }
    }
    failure {
      script {
        echo 'Pipeline failed. Check the first failing stage.'
        try {
          withCredentials([string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK')]) {
            sh '''
              payload=$(printf '{"content":"Jenkins: %s #%s failed - %s"}' "${JOB_NAME}" "${BUILD_NUMBER}" "${BUILD_URL}")
              curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK" || true
            '''
          }
        } catch (e) {
          echo 'No discord-webhook credential configured, skipping Discord notification.'
        }
      }
    }
  }
}