from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
	ROLE_CANDIDATE = "candidate"
	ROLE_RECRUITER = "recruiter"
	ROLE_ADMIN = "admin"
	ROLE_USER_LEGACY = "user"
	ROLE_INTERVIEWER_LEGACY = "interviewer"

	ROLE_CHOICES = (
		(ROLE_CANDIDATE, "Candidate"),
		(ROLE_RECRUITER, "Recruiter"),
		(ROLE_ADMIN, "Admin"),
		(ROLE_USER_LEGACY, "User (Legacy)"),
		(ROLE_INTERVIEWER_LEGACY, "Interviewer (Legacy)"),
	)

	email = models.EmailField(unique=True)
	role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CANDIDATE)
	is_verified = models.BooleanField(default=False)
	verification_code = models.CharField(max_length=10, blank=True)
	verification_code_expires_at = models.DateTimeField(null=True, blank=True)
	password_reset_code = models.CharField(max_length=10, blank=True)
	password_reset_code_expires_at = models.DateTimeField(null=True, blank=True)

	def save(self, *args, **kwargs):
		if self.role == self.ROLE_ADMIN:
			self.is_staff = True
			self.is_superuser = True
		super().save(*args, **kwargs)

	def __str__(self):
		return f"{self.username} ({self.role})"


class Company(models.Model):
	name = models.CharField(max_length=255, unique=True)
	domain = models.CharField(max_length=255, blank=True)
	website = models.URLField(blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return self.name


class UserProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
	company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True)
	bio = models.TextField(blank=True)
	skills = models.JSONField(default=list, blank=True)
	linkedin_url = models.URLField(blank=True)
	github_url = models.URLField(blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"Profile<{self.user.username}>"
