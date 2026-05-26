#!/usr/bin/env groovy

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 90, unit: 'MINUTES')
    disableConcurrentBuilds()
    skipDefaultCheckout()
  }

  triggers {
    githubPush()
  }

  environment {
    CI = 'true'
    PYTHONUNBUFFERED = '1'
    NODE_OPTIONS = '--max_old_space_size=4096'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_COMMIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          env.GIT_BRANCH_NAME = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
          env.GIT_VERSION = sh(returnStdout: true, script: 'git describe --tags --always || echo v0.0.0').trim()

          echo "Build: ${env.GIT_COMMIT_SHORT} on ${env.GIT_BRANCH_NAME} (${env.GIT_VERSION})"
        }
      }
    }

    stage('Backend') {
      steps {
        dir('backend') {
          sh '''
            set -eux
            python3 -m pip install --upgrade pip setuptools wheel
            python3 -m pip install -r requirements.txt
            python3 -m pip install pytest pytest-cov pytest-django black flake8 pylint bandit safety

            export SECRET_KEY='ci-temporary-secret'
            export DEBUG=True
            export DJANGO_SETTINGS_MODULE=config.settings

            black --check .
            flake8 --max-line-length=120 --exclude=migrations,venv
            pylint apps/ config/ manage.py --disable=all --enable=E,F || true
            pytest --junitxml=junit.xml --cov=apps --cov=config --cov-report=term-missing -v
            bandit -r apps/ config/ -f json -o bandit-report.json || true
            safety check --json > safety-report.json || true
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

    stage('Frontend') {
      steps {
        dir('frontend') {
          sh '''
            set -eux
            npm install --legacy-peer-deps
            npm run lint
            npm run coverage || npm run test || true
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
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed. Check the first failing stage.'
    }
  }
}