"""
Enterprise-level custom exceptions and error responses.
Provides standardized error handling across the application.
"""

import logging
from typing import Optional, Dict, Any
from django.http import JsonResponse
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN
from rest_framework.status import HTTP_404_NOT_FOUND, HTTP_409_CONFLICT, HTTP_422_UNPROCESSABLE_ENTITY
from rest_framework.status import HTTP_429_TOO_MANY_REQUESTS, HTTP_500_INTERNAL_SERVER_ERROR

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception with standardized error response."""
    
    http_status: int = HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"
    details: Optional[Dict[str, Any]] = None
    
    def __init__(
        self,
        message: Optional[str] = None,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        http_status: Optional[int] = None,
    ):
        self.message = message or self.message
        self.error_code = error_code or self.error_code
        self.details = details or {}
        if http_status:
            self.http_status = http_status
        super().__init__(self.message)
    
    def to_response(self) -> JsonResponse:
        """Convert exception to JSON response."""
        response_data = {
            "error": self.message,
            "error_code": self.error_code,
        }
        if self.details:
            response_data["details"] = self.details
        return JsonResponse(response_data, status=self.http_status)


class ValidationError(AppException):
    """Raised when input validation fails."""
    http_status = HTTP_400_BAD_REQUEST
    error_code = "VALIDATION_ERROR"
    message = "Validation failed"


class DuplicateResourceError(AppException):
    """Raised when attempting to create a duplicate resource."""
    http_status = HTTP_409_CONFLICT
    error_code = "DUPLICATE_RESOURCE"
    message = "Resource already exists"


class ResourceNotFoundError(AppException):
    """Raised when a requested resource is not found."""
    http_status = HTTP_404_NOT_FOUND
    error_code = "RESOURCE_NOT_FOUND"
    message = "Resource not found"


class UnauthorizedError(AppException):
    """Raised when user is not authenticated."""
    http_status = HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"
    message = "Authentication required"


class ForbiddenError(AppException):
    """Raised when user lacks required permissions."""
    http_status = HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"
    message = "Permission denied"


class RateLimitError(AppException):
    """Raised when rate limit is exceeded."""
    http_status = HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMIT_EXCEEDED"
    message = "Too many requests. Please try again later"


class InvalidStateError(AppException):
    """Raised when operation is invalid for current state."""
    http_status = HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "INVALID_STATE"
    message = "Invalid state for requested operation"


class ExternalServiceError(AppException):
    """Raised when external service call fails."""
    http_status = HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "EXTERNAL_SERVICE_ERROR"
    message = "External service error"


class ConfigurationError(AppException):
    """Raised when application configuration is invalid."""
    http_status = HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "CONFIGURATION_ERROR"
    message = "Configuration error"


def handle_app_exception(exc: AppException, request=None) -> JsonResponse:
    """Handle AppException and log appropriately."""
    log_message = f"{exc.error_code}: {exc.message}"
    
    if exc.http_status >= 500:
        logger.error(log_message, exc_info=exc, extra={
            'error_code': exc.error_code,
            'user_id': getattr(request.user, 'id', None) if request else None,
            'path': getattr(request, 'path', None) if request else None,
        })
    else:
        logger.warning(log_message, extra={
            'error_code': exc.error_code,
            'user_id': getattr(request.user, 'id', None) if request else None,
            'path': getattr(request, 'path', None) if request else None,
        })
    
    return exc.to_response()


def handle_unexpected_error(exc: Exception, request=None) -> JsonResponse:
    """Handle unexpected exceptions with safe error message."""
    logger.error(
        f"Unexpected error: {str(exc)}",
        exc_info=exc,
        extra={
            'user_id': getattr(request.user, 'id', None) if request else None,
            'path': getattr(request, 'path', None) if request else None,
        }
    )
    
    # Don't expose internal error details to client in production
    response_data = {
        "error": "An unexpected error occurred",
        "error_code": "INTERNAL_ERROR",
    }
    return JsonResponse(response_data, status=HTTP_500_INTERNAL_SERVER_ERROR)
