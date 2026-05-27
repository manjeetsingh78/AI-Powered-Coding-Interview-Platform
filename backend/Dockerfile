FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ARG SECRET_KEY=ci-temporary-secret
ENV SECRET_KEY=${SECRET_KEY}
WORKDIR /app

RUN apt-get update && apt-get install -y build-essential libpq-dev gcc netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

RUN python manage.py collectstatic --noinput || true

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
