from django.urls import re_path, path

from . import consumers
from .ai_consumer import AIEvaluationConsumer

websocket_urlpatterns = [
    re_path(r'ws/interview/(?P<interview_id>\w+)/$', consumers.InterviewConsumer.as_asgi()),
    path('ws/ai_evaluation/<str:interview_id>/', AIEvaluationConsumer.as_asgi()),
]
