"""
Pydantic validation schemas for request/response validation.
Provides enterprise-level input validation.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime


class PaginationBase(BaseModel):
    """Base pagination model."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str = Field(description="Error message")
    error_code: str = Field(description="Machine-readable error code")
    details: Optional[dict] = Field(default=None, description="Additional error details")


class ListResponse(BaseModel):
    """Standard list response."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    data: list = Field(description="List of items")
    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Items per page")
    has_more: bool = Field(description="Whether more items exist")


# Authentication schemas
class LoginRequest(BaseModel):
    """User login request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr = Field(description="User email")
    password: str = Field(min_length=6, max_length=128, description="User password")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Password cannot be empty or whitespace')
        return v


class RegisterRequest(BaseModel):
    """User registration request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    username: str = Field(min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(description="Email address")
    password: str = Field(min_length=8, max_length=128, description="Password")
    password_confirm: str = Field(min_length=8, max_length=128, description="Password confirmation")
    role: str = Field(default="candidate", description="User role")
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Username cannot be empty')
        if not v.replace('_', '').isalnum():
            raise ValueError('Username can only contain alphanumeric characters and underscores')
        return v.strip().lower()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Password cannot be empty')
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
    
    def validate_passwords_match(self):
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')


class VerifyAccountRequest(BaseModel):
    """Account verification request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr = Field(description="Email address")
    code: str = Field(min_length=4, max_length=10, description="Verification code")


class RequestPasswordResetRequest(BaseModel):
    """Password reset request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr = Field(description="Email address")


class ConfirmPasswordResetRequest(BaseModel):
    """Password reset confirmation."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr = Field(description="Email address")
    code: str = Field(min_length=4, max_length=10, description="Reset code")
    password: str = Field(min_length=8, max_length=128, description="New password")
    password_confirm: str = Field(min_length=8, max_length=128, description="Password confirmation")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Password cannot be empty')
        return v
    
    def validate_passwords_match(self):
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')


class UserResponse(BaseModel):
    """User response."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    id: int = Field(description="User ID")
    username: str = Field(description="Username")
    email: str = Field(description="Email address")
    role: str = Field(description="User role")
    is_verified: bool = Field(description="Whether email is verified")
    is_active: bool = Field(description="Whether account is active")
    created_at: Optional[datetime] = Field(description="Creation timestamp")


class TokenResponse(BaseModel):
    """Token response."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    access: str = Field(description="Access token")
    refresh: str = Field(description="Refresh token")
    user: UserResponse = Field(description="User information")


# Problem schemas
class CreateProblemRequest(BaseModel):
    """Create problem request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    title: str = Field(min_length=3, max_length=200, description="Problem title")
    description: str = Field(min_length=10, description="Problem description")
    difficulty: str = Field(description="Difficulty level")
    tags: List[str] = Field(default_factory=list, description="Problem tags")


class SubmissionRequest(BaseModel):
    """Code submission request."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    problem_id: int = Field(ge=1, description="Problem ID")
    language: str = Field(description="Programming language")
    code: str = Field(min_length=1, description="Source code")


# Validation utility
def validate_request(data: dict, schema: type[BaseModel]) -> tuple[bool, BaseModel | dict]:
    """Validate request data against schema."""
    try:
        validated = schema(**data)
        return True, validated
    except Exception as e:
        errors = {}
        if hasattr(e, 'errors'):
            for error in e.errors():
                field = error['loc'][0]
                errors[field] = error['msg']
        return False, {"validation_errors": errors or str(e)}
