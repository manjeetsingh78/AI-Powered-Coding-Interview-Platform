"""
Health check and readiness probe endpoints for Kubernetes/container deployment.
"""

import logging
import os
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from datetime import datetime

logger = logging.getLogger(__name__)


class HealthStatus:
    """Health status constants."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


def check_database():
    """Check database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {"status": "ok", "latency_ms": 0}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "error", "message": str(e)}


def check_cache():
    """Check cache/Redis connectivity."""
    try:
        cache.set("health_check", "ok", timeout=10)
        value = cache.get("health_check")
        if value == "ok":
            return {"status": "ok"}
        return {"status": "error", "message": "Cache read/write failed"}
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        return {"status": "error", "message": str(e)}


def health_check_view(request):
    """Detailed health check endpoint."""
    
    checks = {
        "database": check_database(),
        "cache": check_cache(),
    }
    
    # Determine overall status
    all_ok = all(check.get("status") == "ok" for check in checks.values())
    overall_status = HealthStatus.HEALTHY if all_ok else HealthStatus.DEGRADED
    
    response_data = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": os.getenv("APP_VERSION", "unknown"),
        "checks": checks,
    }
    
    status_code = 200 if all_ok else 503
    return JsonResponse(response_data, status=status_code)


def readiness_check_view(request):
    """Readiness probe for Kubernetes/container deployment."""
    
    try:
        # Check critical dependencies
        db_check = check_database()
        
        if db_check.get("status") != "ok":
            logger.warning("Readiness check failed: database not ready")
            return JsonResponse(
                {"ready": False, "message": "Database not ready"},
                status=503,
            )
        
        return JsonResponse(
            {"ready": True, "timestamp": datetime.utcnow().isoformat()},
            status=200,
        )
    
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JsonResponse(
            {"ready": False, "message": "Internal error"},
            status=503,
        )


def liveness_check_view(request):
    """Liveness probe for Kubernetes/container deployment."""
    
    try:
        # Minimal check - just check if service is running
        return JsonResponse(
            {"alive": True, "timestamp": datetime.utcnow().isoformat()},
            status=200,
        )
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        return JsonResponse(
            {"alive": False, "message": "Internal error"},
            status=503,
        )


def metrics_view(request):
    """Prometheus metrics endpoint (placeholder for actual implementation)."""
    
    metrics_data = f"""# HELP app_requests_total Total HTTP requests processed
# TYPE app_requests_total counter
app_requests_total{{method="GET",status="200"}} 0
app_requests_total{{method="POST",status="201"}} 0
app_requests_total{{method="GET",status="404"}} 0

# HELP app_requests_duration_seconds HTTP request duration in seconds
# TYPE app_requests_duration_seconds histogram
app_requests_duration_seconds_bucket{{le="0.1"}} 0
app_requests_duration_seconds_bucket{{le="0.5"}} 0
app_requests_duration_seconds_bucket{{le="1.0"}} 0
app_requests_duration_seconds_bucket{{le="+Inf"}} 0

# HELP app_database_connections Database connection pool status
# TYPE app_database_connections gauge
app_database_connections{{pool="default"}} 0
"""
    
    return JsonResponse({"metrics": metrics_data}, status=200)
