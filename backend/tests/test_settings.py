from django.conf import settings


def test_settings_loaded():
    # ensure Django settings module loads in test environment
    assert hasattr(settings, 'SECRET_KEY')
    assert isinstance(settings.DEBUG, bool)
