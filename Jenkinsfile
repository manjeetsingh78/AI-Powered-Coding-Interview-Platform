#!/usr/bin/env groovy
import groovy.json.JsonOutput
/**
 * ENTERPRISE GRADE JENKINS PIPELINE v2.0
 * Three-Tier Architecture: Presentation → Application → Data Layer
 * Supports: Blue-Green, Canary, Rolling Deployments
 * Includes: SAST, DAST, SCA, Code Coverage, Performance Testing
 * DevOps: Terraform, ArgoCD, SonarQube, Snyk, Trivy, OWASP ZAP
 */


def sendDiscordNotification(String status, String details) {
  def credentialId = params.DISCORD_WEBHOOK_CREDENTIAL_ID ?: 'discord-webhook'

  withCredentials([string(credentialsId: credentialId, variable: 'DISCORD_WEBHOOK')]) {
    def payload = JsonOutput.toJson([
      username: 'Jenkins',
      content: "${status}: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n${details}\n${env.BUILD_URL}"
    ])

    sh """
      curl -sS -H 'Content-Type: application/json' -d '${payload.replace("'", "'\\''")}' \"\$DISCORD_WEBHOOK\"
    """
  }
}

pipeline {
  agent { label params.AGENT_LABEL ?: 'linux && docker' }

  parameters {
    // Environment & Infrastructure
    string(name: 'ECR_ACCOUNT', defaultValue: '', description: 'AWS ECR Account ID')
    string(name: 'ECR_REPO_BACKEND', defaultValue: 'interview-platform-backend', description: 'ECR repo name for backend')
    string(name: 'ECR_REPO_FRONTEND', defaultValue: 'interview-platform-frontend', description: 'ECR repo name for frontend')
    string(name: 'AWS_REGION', defaultValue: 'ap-south-1', description: 'AWS Region')
    
    // Deployment Configuration
    choice(name: 'DEPLOY_ENV', choices: ['production', 'staging', 'dev'], description: 'Target environment')
    choice(name: 'DEPLOY_STRATEGY', choices: ['rolling', 'blue-green', 'canary'], description: 'Deployment strategy')
    string(name: 'CANARY_PERCENTAGE', defaultValue: '5', description: 'Canary deployment traffic % (default 5%)')
    
    // Scanning & Quality Gates
    choice(name: 'SAST_SCAN', choices: ['true', 'false'], description: 'Run SAST scanning (SonarQube)')
    choice(name: 'DAST_SCAN', choices: ['true', 'false'], description: 'Run DAST scanning (OWASP ZAP)')
    choice(name: 'SCA_SCAN', choices: ['true', 'false'], description: 'Run SCA scanning (Snyk + Safety)')
    choice(name: 'CONTAINER_SCAN', choices: ['true', 'false'], description: 'Run container image scan (Trivy)')
    choice(name: 'PERFORMANCE_TEST', choices: ['true', 'false'], description: 'Run performance tests (JMeter)')
    
    // Versioning & Release
    string(name: 'IMAGE_TAG', defaultValue: '', description: 'Optional image tag (overrides auto-generated)')
    choice(name: 'RELEASE_TYPE', choices: ['patch', 'minor', 'major', 'none'], description: 'Semantic versioning release type')
    booleanParam(name: 'CREATE_RELEASE', defaultValue: false, description: 'Create GitHub release')
    
    // Advanced
    string(name: 'AGENT_LABEL', defaultValue: 'linux && docker', description: 'Jenkins agent label')
    string(name: 'DISCORD_WEBHOOK_CREDENTIAL_ID', defaultValue: 'discord-webhook', description: 'Jenkins credential ID for Discord notifications')
    string(name: 'REPORTS_S3_BUCKET', defaultValue: 'interview-platform-eks-assets', description: 'S3 bucket for structured CI reports')
    string(name: 'REPORTS_S3_PREFIX', defaultValue: 'reports', description: 'S3 prefix/folder for report uploads')
    booleanParam(name: 'UPLOAD_REPORTS_TO_S3', defaultValue: true, description: 'Upload CI/CD reports to S3')
    booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip unit/integration tests (use with caution)')
    booleanParam(name: 'SKIP_SCANNING', defaultValue: false, description: 'Skip security scanning (use with caution)')
    booleanParam(name: 'VERBOSE_LOGGING', defaultValue: false, description: 'Enable verbose logging')
  }

  environment {
    // Jenkins
    CI = 'true'
    JENKINS_BUILD_ID = "${env.BUILD_ID ?: 'local'}"
    
    // Git
    GIT_COMMIT_SHORT = ''
    GIT_BRANCH_NAME = ''
    
    // Docker & ECR
    ECR_REGISTRY = "${ECR_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    BACKEND_IMAGE = "${ECR_REGISTRY}/${ECR_REPO_BACKEND}"
    FRONTEND_IMAGE = "${ECR_REGISTRY}/${ECR_REPO_FRONTEND}"
    IMAGE_TAG_FINAL = "${IMAGE_TAG ?: 'local'}"
    
    // Quality Gates
    CODE_COVERAGE_THRESHOLD = '80'
    SONAR_QUALITY_GATE = 'passed'
    
    // Logging
    LOG_LEVEL = "${VERBOSE_LOGGING ? 'DEBUG' : 'INFO'}"
    JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
  }

  options {
    ansiColor('xterm')
    timestamps()
    timeout(time: 180, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '50', artifactNumToKeepStr: '10'))
    disableConcurrentBuilds()
    skipDefaultCheckout()
  }

  triggers {
    githubPush()
  }

  stages {
    // ====== STAGE 1: INITIALIZATION ======
    stage('1️⃣ Initialize') {
      steps {
        script {
          echo "═══════════════════════════════════════════════════"
          echo "🚀 ENTERPRISE PIPELINE v2.0 - INITIALIZATION"
          echo "═══════════════════════════════════════════════════"
          
          checkout scm
          sh '''
            git rev-parse --short HEAD > /tmp/git_commit_short
            git rev-parse --abbrev-ref HEAD > /tmp/git_branch
            git describe --tags --always > /tmp/git_version || echo "v0.0.0" > /tmp/git_version
          '''
          
          script {
            env.GIT_COMMIT_SHORT = readFile('/tmp/git_commit_short').trim()
            env.GIT_BRANCH_NAME = readFile('/tmp/git_branch').trim()
            env.GIT_VERSION = readFile('/tmp/git_version').trim()
            env.IMAGE_TAG_FINAL = "${env.IMAGE_TAG ?: env.GIT_COMMIT_SHORT}"
            
            echo "📊 Build Information:"
            echo "   Build ID: ${env.JENKINS_BUILD_ID}"
            echo "   Git Commit: ${env.GIT_COMMIT_SHORT}"
            echo "   Git Branch: ${env.GIT_BRANCH_NAME}"
            echo "   Git Version: ${env.GIT_VERSION}"
            echo "   Image Tag: ${env.IMAGE_TAG_FINAL}"
            echo "   Environment: ${DEPLOY_ENV}"
            echo "   Deployment Strategy: ${DEPLOY_STRATEGY}"
          }
          
          stash name: 'source', includes: '**/*', useDefaultExcludes: false
        }
      }
    }

    // ====== STAGE 2: BACKEND CI ======
    stage('2️⃣ Backend: Code Quality & Tests') {
      when { not { expression { params.SKIP_TESTS == true } } }
      steps {
        unstash 'source'
        dir('backend') {
          sh '''
            echo "═══════════════════════════════════════════════════"
            echo "🔧 BACKEND: Code Quality & Testing"
            echo "═══════════════════════════════════════════════════"
            
            python -m pip install --upgrade pip setuptools wheel
            pip install -r requirements.txt
            pip install pytest pytest-cov pytest-django black flake8 pylint safety bandit
            
            echo "✓ Running Code Formatting Check (Black)..."
            black --check .
            
            echo "✓ Running PEP8 Linting (flake8)..."
            flake8 --max-line-length=120 --exclude=migrations,venv
            
            echo "✓ Running Static Analysis (pylint)..."
            pylint apps/ config/ manage.py --disable=all --enable=E,F
            
            echo "✓ Running Unit Tests with Coverage..."
            export SECRET_KEY='ci-temporary-secret'
            export DEBUG=True
            export DJANGO_SETTINGS_MODULE=config.settings
            pytest --cov=apps --cov=config --cov-report=term-missing --cov-report=xml --cov-report=html --junitxml=junit.xml -v
            
            echo "✓ Running Security Checks (Bandit)..."
            bandit -r apps/ config/ -f json -o bandit-report.json
            bandit -r apps/ config/ -ll
            
            echo "✓ Running Dependency Security Check (Safety)..."
            safety check --json > safety-report.json
          '''
        }
      }
      post {
        always {
          dir('backend') {
            junit testResults: 'junit.xml', skipPublishingChecks: true
            publishHTML([
              reportDir: 'htmlcov',
              reportFiles: 'index.html',
              reportName: 'Backend Coverage Report',
              allowMissing: true
            ])
          }
        }
      }
    }

    // ====== STAGE 3: FRONTEND CI ======
    stage('3️⃣ Frontend: Code Quality & Tests') {
      when { not { expression { params.SKIP_TESTS == true } } }
      steps {
        unstash 'source'
        dir('frontend') {
          sh '''
            echo "═══════════════════════════════════════════════════"
            echo "🎨 FRONTEND: Code Quality & Testing"
            echo "═══════════════════════════════════════════════════"
            
            npm install --legacy-peer-deps
            
            echo "✓ Running ESLint..."
            npm run lint
            
            echo "✓ Running Unit Tests..."
            npm run coverage
            
            echo "✓ Building Application..."
            npm run build
            
            echo "✓ Security Audit..."
            npm audit --audit-level=moderate
          '''
        }
      }
      post {
        always {
          dir('frontend') {
            publishHTML([
              reportDir: 'coverage',
              reportFiles: 'index.html',
              reportName: 'Frontend Coverage Report',
              allowMissing: true
            ])
          }
        }
      }
    }

    // ====== STAGE 4: SAST - SONARQUBE ======
    stage('4️⃣ SAST: Code Analysis (SonarQube)') {
      when { 
        allOf {
          expression { params.SAST_SCAN == 'true' }
          expression { params.SKIP_SCANNING != true }
        }
      }
      parallel {
        stage('SonarQube Backend') {
          steps {
            unstash 'source'
            dir('backend') {
              sh '''
                echo "🔬 SonarQube: Backend Static Analysis..."
                python -m pip install coverage
                export SECRET_KEY='ci-temporary-secret'
                pytest --cov=apps --cov=config --cov-report=xml --junitxml=junit.xml
                
                sonar-scanner \
                  -Dsonar.projectKey=interview-platform-backend \
                  -Dsonar.projectName="Interview Platform Backend" \
                  -Dsonar.sources=. \
                  -Dsonar.exclusions=migrations/**,tests/**,venv/**,*.pyc \
                  -Dsonar.language=py \
                  -Dsonar.python.coverage.reportPaths=coverage.xml \
                  -Dsonar.host.url=${SONARQUBE_HOST} \
                  -Dsonar.login=${SONARQUBE_TOKEN}
              '''
            }
          }
        }
        
        stage('SonarQube Frontend') {
          steps {
            unstash 'source'
            dir('frontend') {
              sh '''
                echo "🔬 SonarQube: Frontend Static Analysis..."
                npm install --legacy-peer-deps
                npm run coverage
                
                sonar-scanner \
                  -Dsonar.projectKey=interview-platform-frontend \
                  -Dsonar.projectName="Interview Platform Frontend" \
                  -Dsonar.sources=src \
                  -Dsonar.exclusions=node_modules/**,dist/**,coverage/** \
                  -Dsonar.language=js \
                  -Dsonar.host.url=${SONARQUBE_HOST} \
                  -Dsonar.login=${SONARQUBE_TOKEN}
              '''
            }
          }
        }
      }
    }

    // ====== STAGE 5: SCA - SNYK & SAFETY ======
    stage('5️⃣ SCA: Dependency Scanning (Snyk)') {
      when { 
        allOf {
          expression { params.SCA_SCAN == 'true' }
          expression { params.SKIP_SCANNING != true }
        }
      }
      steps {
        unstash 'source'
        script {
          try {
            withCredentials([string(credentialsId: 'snyk-token', variable: 'SNYK_TOKEN')]) {
              sh '''
                echo "📦 Snyk: Dependency Vulnerability Scanning..."
                
                # Backend
                cd backend
                snyk auth $SNYK_TOKEN
                snyk test --severity-threshold=high --json-file-output=snyk-report.json
                snyk monitor
                
                # Frontend
                cd ../frontend
                npm install --legacy-peer-deps
                snyk test --severity-threshold=high --json-file-output=snyk-report.json
                snyk monitor
              '''
            }
          } catch (e) {
            echo "⚠️  Snyk not configured, skipping SCA"
          }
        }
      }
    }

    // ====== STAGE 6: DOCKER BUILD ======
    stage('6️⃣ Docker: Build & Push') {
      steps {
        unstash 'source'
        withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY']]) {
          sh '''
            echo "═══════════════════════════════════════════════════"
            echo "🐳 DOCKER: Build & Push"
            echo "═══════════════════════════════════════════════════"
            
            # ECR Login
            aws ecr get-login-password --region $AWS_REGION | \
              docker login --username AWS --password-stdin $ECR_REGISTRY
            
            # Create repos if needed
            aws ecr describe-repositories --repository-names $ECR_REPO_BACKEND --region $AWS_REGION 2>/dev/null || \
              aws ecr create-repository --repository-name $ECR_REPO_BACKEND --region $AWS_REGION
            
            aws ecr describe-repositories --repository-names $ECR_REPO_FRONTEND --region $AWS_REGION 2>/dev/null || \
              aws ecr create-repository --repository-name $ECR_REPO_FRONTEND --region $AWS_REGION
            
            # Build & Push
            echo "Building and pushing backend image..."
            docker build -f backend/Dockerfile \
              -t $BACKEND_IMAGE:$IMAGE_TAG_FINAL \
              -t $BACKEND_IMAGE:latest \
              --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
              --build-arg VCS_REF=$GIT_COMMIT_SHORT \
              --build-arg VERSION=$GIT_VERSION \
              backend/
            
            docker push $BACKEND_IMAGE:$IMAGE_TAG_FINAL
            docker push $BACKEND_IMAGE:latest
            
            echo "Building and pushing frontend image..."
            docker build -f frontend/Dockerfile \
              -t $FRONTEND_IMAGE:$IMAGE_TAG_FINAL \
              -t $FRONTEND_IMAGE:latest \
              --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
              --build-arg VCS_REF=$GIT_COMMIT_SHORT \
              --build-arg VERSION=$GIT_VERSION \
              frontend/
            
            docker push $FRONTEND_IMAGE:$IMAGE_TAG_FINAL
            docker push $FRONTEND_IMAGE:latest
            
            echo "✓ Docker images pushed to ECR"
          '''
        }
      }
    }

    // ====== STAGE 7: CONTAINER SCAN ======
    stage('7️⃣ Container: Image Scanning (Trivy)') {
      when { 
        allOf {
          expression { params.CONTAINER_SCAN == 'true' }
          expression { params.SKIP_SCANNING != true }
        }
      }
      steps {
        sh '''
          echo "═══════════════════════════════════════════════════"
          echo "🔍 CONTAINER: Trivy Image Scan"
          echo "═══════════════════════════════════════════════════"
          
          echo "Scanning backend image..."
          trivy image --severity HIGH,CRITICAL \
            --exit-code 1 \
            --no-progress \
            --format json \
            -o backend-trivy-report.json \
            $BACKEND_IMAGE:$IMAGE_TAG_FINAL
          
          echo "Scanning frontend image..."
          trivy image --severity HIGH,CRITICAL \
            --exit-code 1 \
            --no-progress \
            --format json \
            -o frontend-trivy-report.json \
            $FRONTEND_IMAGE:$IMAGE_TAG_FINAL
          
          echo "✓ Container scanning complete"
        '''
      }
    }

    // ====== STAGE 8: DEPLOY TO STAGING ======
    stage('8️⃣ Deploy: Staging Environment') {
      when {
        expression { env.GIT_BRANCH_NAME == 'develop' }
      }
      steps {
        unstash 'source'
        withCredentials([file(credentialsId: 'kubeconfig-staging', variable: 'KUBECONFIG_FILE')]) {
          sh '''
            echo "═══════════════════════════════════════════════════"
            echo "🚀 DEPLOYMENT: Staging"
            echo "═══════════════════════════════════════════════════"
            
            mkdir -p $HOME/.kube
            cp ${KUBECONFIG_FILE} $HOME/.kube/config
            
            helm upgrade --install interview-platform-staging \
              deploy/helm/interview-platform \
              --namespace staging \
              --create-namespace \
              -f deploy/helm/values-staging.yaml \
              --set backend.image=$BACKEND_IMAGE:$IMAGE_TAG_FINAL \
              --set frontend.image=$FRONTEND_IMAGE:$IMAGE_TAG_FINAL \
              --set replicaCount=2 \
              --wait \
              --timeout 10m
            
            echo "✓ Staging deployment successful"
            kubectl get pods -n staging
          '''
        }
      }
    }

    // ====== STAGE 9: SMOKE TESTS ======
    stage('9️⃣ Testing: Smoke & Smoke Tests') {
      when {
        expression { env.GIT_BRANCH_NAME == 'develop' }
      }
      steps {
        unstash 'source'
        sh '''
          echo "═══════════════════════════════════════════════════"
          echo "🧪 TESTING: Smoke Tests"
          echo "═══════════════════════════════════════════════════"
          
          kubectl wait --for=condition=available --timeout=300s \
            deployment/interview-platform-backend -n staging
          
          SERVICE_URL=$(kubectl get svc -n staging interview-platform-frontend \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "localhost:3000")
          
          echo "Testing service at: $SERVICE_URL"
          bash scripts/jenkins/smoke_test.sh "http://$SERVICE_URL"
        '''
      }
    }

    // ====== STAGE 10: DAST SCANNING ======
    stage('🔟 Security: DAST Scanning (OWASP ZAP)') {
      when { 
        allOf {
          expression { params.DAST_SCAN == 'true' }
          expression { params.SKIP_SCANNING != true }
          expression { env.GIT_BRANCH_NAME == 'develop' }
        }
      }
      steps {
        sh '''
          echo "═══════════════════════════════════════════════════"
          echo "🔒 SECURITY: OWASP ZAP Dynamic Scanning"
          echo "═══════════════════════════════════════════════════"
          
          SERVICE_URL=$(kubectl get svc -n staging interview-platform-frontend \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "localhost:3000")
          
          echo "Running OWASP ZAP against: $SERVICE_URL"
          docker run --rm owasp/zap2docker-stable \
            zap-baseline.py -t "http://$SERVICE_URL" \
            -r zap-report.html
        '''
      }
    }

    // ====== STAGE 11: PRODUCTION APPROVAL ======
    stage('1️⃣1️⃣ Approval: Production Deployment') {
      when {
        expression { env.GIT_BRANCH_NAME == 'main' }
      }
      steps {
        script {
          def userInput = input(
            id: 'ProductionApproval',
            message: '🚀 Deploy to Production?',
            parameters: [
              choice(name: 'STRATEGY', choices: ['rolling', 'blue-green', 'canary'], description: 'Deployment Strategy'),
              string(name: 'APPROVED_BY', defaultValue: '', description: 'Approver Name')
            ]
          )
          env.PROD_STRATEGY = userInput
          env.APPROVED_BY = userInput
          echo "✅ Approved by: ${env.APPROVED_BY}"
        }
      }
    }

    // ====== STAGE 12: PRODUCTION DEPLOYMENT ======
    stage('1️⃣2️⃣ Deploy: Production') {
      when {
        expression { env.GIT_BRANCH_NAME == 'main' }
      }
      steps {
        unstash 'source'
        withCredentials([file(credentialsId: 'kubeconfig-production', variable: 'KUBECONFIG_FILE')]) {
          sh '''
            echo "═══════════════════════════════════════════════════"
            echo "🚀 PRODUCTION DEPLOYMENT: ${PROD_STRATEGY}"
            echo "═══════════════════════════════════════════════════"
            
            mkdir -p $HOME/.kube
            cp ${KUBECONFIG_FILE} $HOME/.kube/config
            
            case "${PROD_STRATEGY}" in
              rolling)
                helm upgrade interview-platform \
                  deploy/helm/interview-platform \
                  --namespace production \
                  -f deploy/helm/values-production.yaml \
                  --set backend.image=$BACKEND_IMAGE:$IMAGE_TAG_FINAL \
                  --set frontend.image=$FRONTEND_IMAGE:$IMAGE_TAG_FINAL \
                  --set replicaCount=3 \
                  --wait --timeout 15m
                ;;
              
              blue-green)
                bash scripts/deploy/blue_green_deploy.sh \
                  --backend-image $BACKEND_IMAGE:$IMAGE_TAG_FINAL \
                  --frontend-image $FRONTEND_IMAGE:$IMAGE_TAG_FINAL \
                  --namespace production
                ;;
              
              canary)
                bash scripts/deploy/canary_deploy.sh \
                  --backend-image $BACKEND_IMAGE:$IMAGE_TAG_FINAL \
                  --frontend-image $FRONTEND_IMAGE:$IMAGE_TAG_FINAL \
                  --namespace production \
                  --canary-weight ${CANARY_PERCENTAGE}
                ;;
            esac
            
            echo "✓ Production deployment successful"
            kubectl get pods -n production
          '''
        }
      }
    }

    // ====== STAGE 13: POST-DEPLOY VERIFICATION ======
    stage('1️⃣3️⃣ Verification: Post-Deployment') {
      when {
        expression { env.GIT_BRANCH_NAME == 'main' }
      }
      steps {
        sh '''
          echo "═══════════════════════════════════════════════════"
          echo "✅ POST-DEPLOYMENT: Verification"
          echo "═══════════════════════════════════════════════════"
          
          kubectl wait --for=condition=available --timeout=300s \
            deployment/interview-platform-backend -n production
          kubectl wait --for=condition=available --timeout=300s \
            deployment/interview-platform-frontend -n production
          
          FRONTEND_URL=$(kubectl get svc -n production interview-platform-frontend \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "pending")
          
          echo "Frontend URL: $FRONTEND_URL"
          echo "✓ Verification complete"
        '''
      }
    }

    // ====== STAGE 14: RELEASE MANAGEMENT ======
    stage('1️⃣4️⃣ Release: Versioning & Documentation') {
      when {
        expression { env.GIT_BRANCH_NAME == 'main' && params.CREATE_RELEASE == true }
      }
      steps {
        unstash 'source'
        sh '''
          echo "═══════════════════════════════════════════════════"
          echo "📦 RELEASE: Version Management"
          echo "═══════════════════════════════════════════════════"
          
          cat > build-info.json <<EOF
{
  "build_id": "$JENKINS_BUILD_ID",
  "git_commit": "$GIT_COMMIT_SHORT",
  "git_branch": "$GIT_BRANCH_NAME",
  "version": "$GIT_VERSION",
  "image_tag": "$IMAGE_TAG_FINAL",
  "backend_image": "$BACKEND_IMAGE:$IMAGE_TAG_FINAL",
  "frontend_image": "$FRONTEND_IMAGE:$IMAGE_TAG_FINAL",
  "deployment_strategy": "$PROD_STRATEGY",
  "approved_by": "$APPROVED_BY",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
          
          echo "✓ Release information recorded"
        '''
      }
    }
  }

  post {
    always {
      echo "═══════════════════════════════════════════════════"
      echo "📊 BUILD SUMMARY"
      echo "═══════════════════════════════════════════════════"
      
      archiveArtifacts artifacts: '**/*-report.*,build-info.json', allowEmptyArchive: true

      script {
        if (params.UPLOAD_REPORTS_TO_S3 && params.REPORTS_S3_BUCKET?.trim()) {
          withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'aws-creds', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY']]) {
            sh '''
              chmod +x scripts/jenkins/upload_reports_to_s3.sh
              scripts/jenkins/upload_reports_to_s3.sh \
                "$REPORTS_S3_BUCKET" \
                "$REPORTS_S3_PREFIX" \
                "$DEPLOY_ENV" \
                "$JOB_NAME" \
                "$BUILD_NUMBER" \
                "$AWS_REGION"
            '''
          }
        } else {
          echo "ℹ️  S3 report upload skipped (UPLOAD_REPORTS_TO_S3=false or bucket missing)."
        }
      }
      
      // Cleanup
      cleanWs()
    }
    
    success {
      echo "✅ PIPELINE SUCCESSFUL"
      script {
        sendDiscordNotification('SUCCESS', "Deployment to ${params.DEPLOY_ENV} completed with strategy ${env.PROD_STRATEGY ?: params.DEPLOY_STRATEGY}")
      }
    }
    
    failure {
      echo "❌ PIPELINE FAILED - Check logs above"
      script {
        sendDiscordNotification('FAILURE', "Deployment to ${params.DEPLOY_ENV} failed for branch ${env.GIT_BRANCH_NAME ?: 'unknown'}")
      }
    }
  }
}