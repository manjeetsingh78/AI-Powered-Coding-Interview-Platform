from .settings import *

# Use in-memory SQLite for CI tests to avoid requiring Postgres
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable channels/ASGI layers for unit tests where not needed
INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in ('daphne', 'channels')]
