"""
Local development settings for quick demos.
This file imports the main settings and applies safe local overrides
so you can run the backend locally without external services.
Do NOT use in production.
"""
from .settings import *  # noqa: F401,F403

# Use a lightweight SQLite DB for local demos
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': str(BASE_DIR / 'db.sqlite3'),
    }
}

# Local defaults
DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY', 'local-dev-secret-key')
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Use console email backend locally
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Allow local CORS origins for Vite dev server
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# Static files served by Django in dev
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
