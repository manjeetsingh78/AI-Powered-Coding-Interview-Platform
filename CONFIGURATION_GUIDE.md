# Enterprise Configuration Guide

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### Required Variables
```env
SECRET_KEY=<generate-with-secrets-module>
DEBUG=False
DATABASE_URL=postgresql://user:pass@host:5432/db
CACHE_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
```

### 3. Initialize Database
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 4. Run Server
```bash
# Development
python manage.py runserver

# Production with Gunicorn
gunicorn config.wsgi --bind 0.0.0.0:8000 --workers 4
```

### 5. Verify Setup
```bash
# Check health
curl http://localhost:8000/health/

# Check readiness
curl http://localhost:8000/ready/

# Check liveness
curl http://localhost:8000/alive/
```

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
VITE_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

### 5. Preview Production Build
```bash
npm run preview
```

---

## Docker Deployment

### Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy code
COPY . .

# Health check
HEALTHCHECK CMD curl -f http://localhost:8000/alive/ || exit 1

# Run application
CMD ["gunicorn", "config.wsgi", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f backend
```

---

## Kubernetes Deployment

### Deployment Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: interview-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: interview-platform:latest
        ports:
        - containerPort: 8000
        
        # Liveness probe
        livenessProbe:
          httpGet:
            path: /alive/
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
          
        # Readiness probe
        readinessProbe:
          httpGet:
            path: /ready/
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          
        # Resources
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
            
        # Environment
        env:
        - name: DEBUG
          value: "False"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
```

---

## Monitoring Setup

### Sentry Integration
```python
# In settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=False,
)
```

### Prometheus Metrics
```bash
# Install Prometheus
docker run -d -p 9090:9090 prom/prometheus

# Scrape configuration
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics/'
```

### Structured Logging
All logs are automatically formatted as JSON in production:
```json
{
  "timestamp": "2024-05-17T10:30:00.000Z",
  "level": "ERROR",
  "logger": "apps.submissions.views",
  "message": "Code execution failed",
  "module": "executors",
  "function": "execute_code",
  "line": 42,
  "user_id": 123,
  "error_code": "EXECUTION_ERROR"
}
```

---

## Performance Tuning

### Database Connection Pool
```env
DB_POOL_SIZE=10
DB_POOL_TIMEOUT=30
```

### Cache Configuration
```env
CACHE_URL=redis://localhost:6379/0
# or
CACHE_URL=memcache://127.0.0.1:11211
```

### Celery Task Queue
```env
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
CELERY_TASK_TIME_LIMIT=3600
CELERY_TASK_SOFT_TIME_LIMIT=3000
```

---

## Security Checklist

### Pre-Production
- [ ] Generate strong `SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Enable `SECURE_SSL_REDIRECT`
- [ ] Set `ALLOWED_HOSTS` to production domain
- [ ] Whitelist `CORS_ALLOWED_ORIGINS`
- [ ] Enable HTTPS certificates
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Set up WAF rules
- [ ] Enable CSRF protection
- [ ] Configure secure cookies
- [ ] Enable HSTS headers

### Database Security
- [ ] Use strong PostgreSQL password
- [ ] Enable SSL connections
- [ ] Restrict network access
- [ ] Enable backups
- [ ] Test recovery procedures

### API Security
- [ ] Enable rate limiting
- [ ] Implement API versioning
- [ ] Add request signing
- [ ] Use API keys for external services
- [ ] Validate all inputs
- [ ] Sanitize error responses

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres -h localhost

# Check environment variable
echo $DATABASE_URL
```

#### 2. Health Check Failing
```bash
# Check database
curl http://localhost:8000/health/

# View logs
tail -f logs/app.log
```

#### 3. Request Queue Timeout
```python
# Increase timeout in settings
REQUEST_QUEUE_TIMEOUT = 60
REQUEST_QUEUE_MAX_RETRIES = 5
```

#### 4. Rate Limiting Too Strict
```env
RATELIMIT_LOGIN_ATTEMPTS=10
RATELIMIT_VERIFICATION_CODE_ATTEMPTS=10
```

---

## Logging Best Practices

### Development
```python
logger.debug("Detailed info", extra={'request_id': '123'})
logger.info("Important event", extra={'user_id': 456})
```

### Production
```python
# Always include context
logger.error("Operation failed", exc_info=True, extra={
    'user_id': user.id,
    'operation': 'submit_code',
    'problem_id': problem.id,
})
```

### Sensitive Data
```python
# ❌ DON'T log passwords
logger.info(f"Password: {password}")

# ✅ DO log with context
logger.info("Password reset requested", extra={'user_id': user.id})
```

---

## Rollback Procedure

### Database
```bash
# Revert last migration
python manage.py migrate <app> <migration_number>

# Reset to specific point
python manage.py migrate <app> 0001
```

### Code
```bash
# Revert to previous version
git revert <commit>
docker-compose down
docker rmi interview-platform:latest
docker-compose up -d
```

---

**Version**: 1.0.0  
**Last Updated**: May 17, 2024
