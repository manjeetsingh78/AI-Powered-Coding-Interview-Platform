from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.authentication.models import Company, User, UserProfile


@admin.register(User)
class CustomUserAdmin(UserAdmin):
	model = User
	list_display = ("id", "username", "email", "role", "is_staff", "is_active")
	list_filter = ("role", "is_staff", "is_superuser", "is_active")
	fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role", "is_verified")}),)
	add_fieldsets = UserAdmin.add_fieldsets + (("Role", {"fields": ("role", "is_verified")}),)
	search_fields = ("username", "email")
	ordering = ("id",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "domain", "is_active", "created_at")
	search_fields = ("name", "domain")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
	list_display = ("id", "user", "company", "updated_at")
	search_fields = ("user__username", "user__email", "company__name")
