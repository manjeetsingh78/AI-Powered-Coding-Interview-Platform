"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from my_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function:  from other_app.urls import urls
    2. Add a URL to urlpatterns:  path('', include(('other_app.urls', 'other_app'), namespace='other_app'))
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from apps.authentication.views import home_view
from config.health_checks import (
    health_check_view,
    readiness_check_view,
    liveness_check_view,
    metrics_view,
)


def health_view(request):
    """Health check endpoint for AWS load balancer."""
    return JsonResponse({
        "status": "ok",
        "service": "interview-platform-api",
    }, status=200)


urlpatterns = [
    path('', home_view),
    path('health/', health_check_view, name='health'),
    path('ready/', readiness_check_view, name='ready'),
    path('alive/', liveness_check_view, name='alive'),
    path('metrics/', metrics_view, name='metrics'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/problems/', include('apps.problems.urls')),
    path('api/submissions/', include('apps.submissions.urls')),
    path('api/workflows/', include('apps.workflows.urls')),
]
