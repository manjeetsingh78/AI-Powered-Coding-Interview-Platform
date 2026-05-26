# Run the Interview Platform locally (quick demo)

This document describes how to run the backend and frontend locally for a quick demo. It uses a local SQLite database for the Django backend and Vite's dev/preview server for the frontend.

Prerequisites
- Python 3.11+ and `venv`
- Node.js 18+ and `npm`
- Optional: `pipx` or virtualenv

Backend (Django) - local demo

1. Create and activate a Python virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # PowerShell
# or on bash: source .venv/bin/activate
```

2. Install Python dependencies

```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

3. Run migrations and create a superuser

```bash
export DJANGO_SETTINGS_MODULE=config.local_settings
python manage.py migrate
python manage.py createsuperuser
```

4. Start the development server

```bash
python manage.py runserver 0.0.0.0:8000
```

The backend will be available at `http://localhost:8000`.

Frontend (Vite React)

1. Install dependencies and run dev server

```bash
cd frontend
npm ci
npm run dev
```

Vite dev server will run on `http://localhost:5173` by default and proxy API calls if configured in `src/api.js`.

Build preview

```bash
npm run build
npm run preview
```

Notes & Next steps
- Use `DJANGO_SETTINGS_MODULE=config.local_settings` to run the demo without Postgres.
- To demo in production-like conditions, use the included `infra/terraform` and `deploy` manifests to provision AWS resources and update secrets/image names.
- If you want, I can add a `docker-compose.dev.yml` to run both services quickly in containers.
