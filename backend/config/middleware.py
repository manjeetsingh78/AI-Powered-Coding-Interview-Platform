"""
Enterprise middleware for request/response logging and error handling.
"""

import logging
import json
import time
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from config.exceptions import AppException, handle_unexpected_error

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log all HTTP requests and responses with performance metrics."""
    
    EXCLUDED_PATHS = ['/health/', '/metrics/', '/static/', '/media/']
    SENSITIVE_FIELDS = {'password', 'token', 'secret', 'authorization', 'api_key', 'credit_card'}
    
    def should_log_path(self, path):
        """Check if path should be logged."""
        return not any(path.startswith(excluded) for excluded in self.EXCLUDED_PATHS)
    
    def sanitize_data(self, data):
        """Remove sensitive information from logged data."""
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            if key.lower() in self.SENSITIVE_FIELDS:
                sanitized[key] = "***REDACTED***"
            elif isinstance(value, dict):
                sanitized[key] = self.sanitize_data(value)
            else:
                sanitized[key] = value
        return sanitized
    
    def process_request(self, request):
        """Log incoming request."""
        if not self.should_log_path(request.path):
            return None
        
        # Store request start time
        request._start_time = time.time()
        
        # Log request
        log_data = {
            'method': request.method,
            'path': request.path,
            'remote_ip': self.get_client_ip(request),
            'user_id': request.user.id if request.user.is_authenticated else None,
        }
        
        # Log request body for POST/PUT/PATCH
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if request.content_type and 'application/json' in request.content_type:
                    body = json.loads(request.body or '{}')
                    log_data['body'] = self.sanitize_data(body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        
        logger.info(f"{request.method} {request.path}", extra=log_data)
        return None
    
    def process_response(self, request, response):
        """Log response and performance metrics."""
        if not self.should_log_path(request.path):
            return response
        
        # Calculate request duration
        if hasattr(request, '_start_time'):
            duration_ms = (time.time() - request._start_time) * 1000
        else:
            duration_ms = 0
        
        # Log response
        log_data = {
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': round(duration_ms, 2),
            'user_id': request.user.id if request.user.is_authenticated else None,
        }
        
        # Warn if request is slow
        if duration_ms > 1000:
            logger.warning(f"Slow request: {request.method} {request.path}", extra=log_data)
        else:
            logger.info(f"{request.method} {request.path} - {response.status_code}", extra=log_data)
        
        return response
    
    @staticmethod
    def get_client_ip(request):
        """Extract client IP from request."""
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')


class ErrorHandlingMiddleware(MiddlewareMixin):
    """Global error handling middleware."""
    
    def process_exception(self, request, exception):
        """Handle exceptions globally."""
        
        # Handle AppException
        if isinstance(exception, AppException):
            logger.warning(
                f"{exception.error_code}: {exception.message}",
                extra={'error_code': exception.error_code, 'path': request.path},
            )
            return exception.to_response()
        
        # Handle unexpected exceptions
        logger.error(
            f"Unexpected error: {str(exception)}",
            exc_info=exception,
            extra={'path': request.path},
        )
        return handle_unexpected_error(exception, request)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses."""
    
    def process_response(self, request, response):
        """Add security headers."""
        
        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:;"
        )
        
        # Referrer policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Feature policy
        response['Permissions-Policy'] = (
            'geolocation=(), '
            'microphone=(), '
            'camera=(), '
            'payment=()'
        )
        
        return response


class CORSLoggingMiddleware(MiddlewareMixin):
    """Log CORS-related issues."""
    
    def process_response(self, request, response):
        """Log CORS headers for debugging."""
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Credentials',
            'Access-Control-Allow-Methods',
        ]
        
        if any(header in response for header in cors_headers):
            logger.debug(
                f"CORS response for {request.method} {request.path}",
                extra={
                    'origin': request.META.get('HTTP_ORIGIN'),
                    'cors_headers': {k: response.get(k) for k in cors_headers if k in response},
                }
            )
        
        return response
