# VERSION & CHANGE MANAGEMENT GUIDE

Complete guide for managing versions and deploying changes to your enterprise platform.

## 📦 Semantic Versioning Format

Your project uses **MAJOR.MINOR.PATCH** versioning:

```
v2.1.3
↑ ↑ ↑
│ │ └─ PATCH: Bug fixes, hotfixes (0-999)
│ └─── MINOR: New features, enhancements (0-999)
└───── MAJOR: Breaking changes, major features (0-999)
```

**Examples**:
- `v1.0.0` → Initial release
- `v1.1.0` → Added new interview categories feature
- `v1.1.1` → Fixed bug in code execution
- `v2.0.0` → Redesigned API (breaking change)

---

## 🔄 Version Lifecycle

### 1. Development Phase

**Branch naming**:
```
feature/description-of-change
bugfix/description-of-bug
hotfix/critical-issue-name
```

**Example branches**:
```
feature/ai-powered-hints
feature/leaderboard-redesign
bugfix/jwt-token-expiration
hotfix/security-sql-injection
```

**Local development**:
```bash
# Start feature
git checkout -b feature/my-feature develop

# Make changes
git add .
git commit -m "feat: Add new feature description"

# Push
git push origin feature/my-feature
```

### 2. Testing Phase

**Automatic Testing** (via Jenkins):
- Unit tests
- Integration tests
- Code linting
- Code coverage
- SAST scanning
- SCA scanning
- Container scanning

**Manual Testing** (in staging):
- User acceptance testing
- Performance testing
- Security testing
- Smoke testing

### 3. Review & Approval

**For Feature Branches**:
```bash
# Create Pull Request
git push origin feature/my-feature
# On GitHub: Open Pull Request to develop

# Required checks:
- ✅ CI/CD pipeline passing
- ✅ Code coverage > 80%
- ✅ No critical security issues
- ✅ At least 1 approval

# Merge with: "Squash and merge"
```

### 4. Release Phase

**Version Bumping**:

```bash
# On develop branch after all PRs merged

# Bump version in package.json
npm version minor  # or major, patch

# This creates:
# - Updated package.json
# - Git tag (v1.1.0)
# - Git commit

# Push changes
git push origin develop
git push origin v1.1.0
```

### 5. Production Deployment

**Create Release PR**:
```bash
# Merge develop → main
git checkout main
git pull origin main
git merge --no-ff develop

# This triggers:
# - Approval gate in Jenkins
# - Blue-green or canary deployment
# - Production monitoring
```

---

## 📋 Version Types & Procedures

### MAJOR Version (Breaking Changes)

**When to Use**:
- API endpoint changes/removal
- Database schema changes
- Authentication mechanism changes
- Data model restructuring
- Dependency major version upgrade

**Process**:

1. **Plan & Document**
   ```markdown
   # Breaking Changes v2.0.0
   
   ## API Changes
   - Removed: POST /api/v1/submissions (use /api/v2/submissions)
   - Changed: GET /api/problems now requires authentication
   
   ## Database Changes
   - New table: user_preferences
   - Renamed: interview_problems → interview_questions
   
   ## Migration Steps
   1. Deploy v1.9.x first
   2. Run database migrations
   3. Deploy v2.0.0
   ```

2. **Development** (2-4 weeks)
   ```bash
   git checkout -b feature/major-api-redesign develop
   
   # Make breaking changes
   # Update API endpoints
   # Create migrations
   
   git push origin feature/major-api-redesign
   ```

3. **Testing** (48+ hours)
   - All tests must pass
   - Zero critical security issues
   - Performance benchmarks acceptable
   - Full UAT in staging

4. **Review** (2+ approvals)
   - Code review required
   - Architecture review required
   - Security review required

5. **Release**
   ```bash
   npm version major
   # Bumps 1.2.3 → 2.0.0
   git push origin main
   git push origin v2.0.0
   ```

6. **Deployment**
   - Jenkins triggers approval gate
   - Select: `DEPLOY_STRATEGY=blue-green`
   - Keep previous version available for 1 week
   - Monitor 24+ hours

7. **Post-Deployment**
   - Create GitHub release with migration guide
   - Update API documentation
   - Notify users of changes
   - Support plan for questions

### MINOR Version (New Features)

**When to Use**:
- New features
- New API endpoints
- Performance improvements
- Non-breaking enhancements

**Process**:

1. **Development** (1-2 weeks)
   ```bash
   git checkout -b feature/leaderboard develop
   
   # Add new feature
   # Add tests (> 80% coverage)
   
   git push origin feature/leaderboard
   ```

2. **Testing** (12+ hours)
   - Staging deployment
   - Smoke tests
   - Security scanning

3. **Review** (1 approval)
   ```bash
   # Create PR on GitHub
   # Wait for approval
   # Merge with "Squash and merge"
   ```

4. **Release**
   ```bash
   npm version minor
   # Bumps 1.2.3 → 1.3.0
   ```

5. **Deployment**
   - Auto-deploy to production
   - Use rolling update
   - Monitor for 2-4 hours

### PATCH Version (Bug Fixes)

**When to Use**:
- Bug fixes
- Security patches (non-critical)
- Performance optimizations
- Documentation updates

**Process**:

1. **Development** (Quick)
   ```bash
   git checkout -b bugfix/jwt-expiration develop
   
   # Fix bug
   # Add test for bug
   
   git push origin bugfix/jwt-expiration
   ```

2. **Testing** (2+ hours)
   - Targeted testing
   - Regression testing

3. **Review** (1 approval)

4. **Release**
   ```bash
   npm version patch
   # Bumps 1.2.3 → 1.2.4
   ```

5. **Deployment**
   - Auto-deploy to production
   - Use rolling update

### HOTFIX Version (Critical Issues)

**When to Use**:
- Production outages
- Critical security vulnerabilities
- Data loss issues

**Process**:

1. **Emergency Branch**
   ```bash
   git checkout -b hotfix/critical-security main
   
   # Fix issue immediately
   # Skip extensive testing
   
   git push origin hotfix/critical-security
   ```

2. **Quick Testing** (30 minutes)
   - Verify fix works
   - Basic regression tests

3. **Immediate Release**
   ```bash
   npm version patch
   # Bumps 1.2.3 → 1.2.4
   ```

4. **Immediate Deployment**
   - Direct production deployment
   - Bypass approval gate for critical issues
   - Create PR after deployment

5. **Post-Incident**
   - Document incident
   - Add tests to prevent recurrence
   - Post-mortem meeting

---

## 🚀 Jenkins Version Management

Your Jenkins pipeline automatically handles versioning:

### Automatic Version Detection

```groovy
// In Jenkinsfile, automatically detects version from:
env.GIT_VERSION = sh(returnStdout: true, 
  script: 'git describe --tags --always').trim()
// Result: v1.2.3 or commit hash
```

### Version-Based Deployments

```groovy
// Helm deployment includes version
helm upgrade interview-platform \
  ... \
  --set image.tag=$GIT_VERSION
```

### Release Management

```groovy
if (params.CREATE_RELEASE == true) {
  bash scripts/deploy/create_release.sh \
    --version $GIT_VERSION \
    --release-type $RELEASE_TYPE
}
```

---

## 📊 Version Deployment Matrix

| Type | Git Branch | Approval | Strategy | Time to Prod | Rollback |
|------|-----------|----------|----------|-------------|----------|
| MAJOR | feature/... | 2+ | Blue-Green | 48+ hours | 1 week |
| MINOR | feature/... | 1+ | Rolling | 12+ hours | 24 hours |
| PATCH | bugfix/... | 1+ | Rolling | 2 hours | Immediate |
| HOTFIX | hotfix/... | 0 | Rolling | 15 min | Immediate |

---

## 🔄 Git Workflow Example

### Example: Deploying Feature to Production

```bash
# 1. START FEATURE (Day 1)
git checkout -b feature/new-dashboard develop
echo "// New dashboard code" > dashboard.jsx
git add dashboard.jsx
git commit -m "feat: Add new dashboard interface"
git push origin feature/new-dashboard

# Jenkins CI automatically runs:
# - Tests ✅
# - Linting ✅
# - SonarQube ✅
# - Snyk ✅

# 2. CREATE PULL REQUEST (Day 1)
# On GitHub: Create PR to develop
# Team reviews code
# 1+ approval received

# 3. MERGE TO DEVELOP (Day 1)
# On GitHub: Merge with "Squash and merge"

# Jenkins auto-deploys to staging
# Team tests for 12+ hours

# 4. CREATE RELEASE (Day 2)
git checkout main
git pull origin main
git merge --no-ff develop

# Update version
npm version minor  # 1.2.3 → 1.3.0

git push origin main
git push origin v1.3.0

# 5. JENKINS DEPLOYMENT (Day 2)
# Jenkins detects v1.3.0
# Approval gate triggered
# Select: DEPLOY_STRATEGY=rolling
# Deploy to production
# Monitor for 4 hours

# 6. VERIFY IN PRODUCTION (Day 2)
# Check dashboard is live
# Monitor error rates
# Collect user feedback
```

---

## 🔍 Viewing Versions

### Current Version
```bash
# From git tag
git describe --tags --always

# From package.json
npm view . version

# From Kubernetes
kubectl get deployment -n production -o yaml | grep image:
```

### Version History
```bash
# List all versions
git tag -l

# View changes in version
git log v1.2.3...v1.2.4

# View deployment history
kubectl rollout history deployment/interview-platform -n production
```

---

## 🔀 Rollback Procedures

### Automatic Rollback (Deployment Failure)

```bash
# If deployment has < 1% uptime after 10 minutes:
# Jenkins automatically triggers rollback

# Previous version restored
# Alerts sent to team
# Incident response starts
```

### Manual Rollback (Production Issue)

```bash
# If issue detected after deployment:

# Option 1: Rollback to previous Helm release
helm rollback interview-platform 1 -n production

# Option 2: Deploy previous Docker image
helm upgrade interview-platform \
  ... \
  --set image.tag=v1.2.3  # Previous version

# Option 3: Git revert
git revert HEAD  # Creates new commit that undoes changes
git push origin main
# Jenkins auto-deploys this revert
```

### Rollback Timeline

| Scenario | Action | Time |
|----------|--------|------|
| Deployment fails | Auto-rollback | < 2 min |
| Health check fails | Manual review + rollback | < 5 min |
| Error rate spike | Alert + manual decision | 5-15 min |
| Data corruption | Stop services + restore backup | 30+ min |

---

## 📈 Version Metrics

Track these metrics for each version:

```json
{
  "version": "v1.3.0",
  "deploy_date": "2026-05-19",
  "deploy_strategy": "rolling",
  "deploy_duration": "8 minutes",
  "uptime_after_24h": "99.95%",
  "error_rate_change": "-0.02%",
  "performance_change": "+5% faster",
  "incidents": 0,
  "rollback_required": false
}
```

---

## ✅ Pre-Deployment Checklist

Before any deployment:

- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] SAST: 0 critical/high issues
- [ ] SCA: 0 critical/high vulnerabilities
- [ ] Container scan: 0 critical issues
- [ ] Staging tested and approved
- [ ] Performance benchmarks acceptable
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Change window approved

---

## 🎯 Version Release Checklist

### Before Release
- [ ] Feature branch tests all passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped correctly
- [ ] Git tag created

### During Release
- [ ] Jenkins pipeline running
- [ ] Approval gate triggered (if required)
- [ ] Staging deployment verified
- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] Monitoring alerts active

### After Release
- [ ] GitHub release created
- [ ] Release notes published
- [ ] Team notified
- [ ] Stakeholders updated
- [ ] Monitoring for 24 hours
- [ ] Performance baseline recorded

---

**Your project now has professional version and change management!** ✨

For pipeline details, see: `docs/JENKINS_SETUP.md`
For deployment strategies, see: `ENTERPRISE_ARCHITECTURE.md`
