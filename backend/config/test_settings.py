from . import settings as base_settings

for _name in dir(base_settings):
    if _name.isupper():
        globals()[_name] = getattr(base_settings, _name)

SECRET_KEY = base_settings.SECRET_KEY
INSTALLED_APPS = [app for app in base_settings.INSTALLED_APPS if app not in ('daphne', 'channels')]

# Use in-memory SQLite for CI tests to avoid requiring Postgres
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

