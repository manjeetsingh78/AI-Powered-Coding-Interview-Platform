"""
Enterprise-level logging configuration with structured logging support.
Integrates with Sentry for production error tracking.
"""

import json
import logging
import logging.config
import os
import sys
from datetime import datetime
from pythonjsonlogger import jsonlogger


# Color codes for terminal output
class ColoredFormatter(logging.Formatter):
    """Colored formatter for development logging."""
    
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[41m',   # Red background
    }
    RESET = '\033[0m'
    
    def format(self, record):
        if sys.stdout.isatty():
            levelname = record.levelname
            if levelname in self.COLORS:
                record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        return super().format(record)


class StructuredJsonFormatter(jsonlogger.JsonFormatter):
    """JSON formatter for structured logging in production."""
    
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add exception info if present
        if record.exc_info:
            log_record['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info),
            }


def get_logging_config(debug=False):
    """Get logging configuration dict based on environment."""
    
    log_level = os.getenv('LOG_LEVEL', 'INFO' if not debug else 'DEBUG')
    
    if debug:
        # Development: colored console output
        return {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'colored': {
                    '()': ColoredFormatter,
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S',
                },
                'detailed': {
                    'format': (
                        '%(asctime)s - %(name)s - %(levelname)s - '
                        '[%(filename)s:%(lineno)d] - %(funcName)s() - %(message)s'
                    ),
                    'datefmt': '%Y-%m-%d %H:%M:%S',
                },
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'colored',
                    'stream': 'ext://sys.stdout',
                },
            },
            'root': {
                'level': log_level,
                'handlers': ['console'],
            },
            'loggers': {
                'django': {
                    'level': 'INFO',
                    'handlers': ['console'],
                    'propagate': False,
                },
                'django.request': {
                    'level': 'WARNING',
                    'handlers': ['console'],
                    'propagate': False,
                },
                'apps': {
                    'level': log_level,
                    'handlers': ['console'],
                    'propagate': False,
                },
            },
        }
    else:
        # Production: structured JSON logging with file rotation
        return {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'json': {
                    '()': StructuredJsonFormatter,
                },
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'json',
                },
                'file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': log_level,
                    'formatter': 'json',
                    'filename': os.getenv('LOG_FILE', '/var/log/django/app.log'),
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 10,
                },
            },
            'root': {
                'level': log_level,
                'handlers': ['console', 'file'],
            },
            'loggers': {
                'django': {
                    'level': 'WARNING',
                    'handlers': ['console', 'file'],
                    'propagate': False,
                },
                'django.request': {
                    'level': 'WARNING',
                    'handlers': ['console', 'file'],
                    'propagate': False,
                },
                'apps': {
                    'level': log_level,
                    'handlers': ['console', 'file'],
                    'propagate': False,
                },
            },
        }


# Configure logging
logging.config.dictConfig(get_logging_config(debug=os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')))
logger = logging.getLogger(__name__)
