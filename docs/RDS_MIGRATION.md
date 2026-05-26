# Migrating Local Postgres Data to AWS RDS

Use this when your project data already lives in a local PostgreSQL database and you want to move it to the AWS RDS instance provisioned by Terraform.

## 1) Get the RDS endpoint

```bash
cd infra/terraform
terraform output -raw rds_endpoint
terraform output -raw rds_port
```

## 2) Prepare connection strings

Set your local source DB and the target RDS DB:

```bash
set LOCAL_DATABASE_URL=postgresql://postgres:LOCAL_PASSWORD@localhost:5432/interview_platform
set RDS_DATABASE_URL=postgresql://interview_admin:RDS_PASSWORD@RDS_ENDPOINT:5432/interview_platform_db
```

If you prefer PowerShell:

```powershell
$env:LOCAL_DATABASE_URL = "postgresql://postgres:LOCAL_PASSWORD@localhost:5432/interview_platform"
$env:RDS_DATABASE_URL = "postgresql://interview_admin:RDS_PASSWORD@RDS_ENDPOINT:5432/interview_platform_db"
```

## 3) Run the migration

```bash
bash scripts/db/migrate_postgres_to_rds.sh
```

## 4) Point the app to RDS

Update your backend environment:

```bash
DB_HOST=RDS_ENDPOINT
DB_PORT=5432
DB_NAME=interview_platform_db
DB_USER=interview_admin
DB_PASSWORD=RDS_PASSWORD
```

## Notes

- The script uses `pg_dump` + `pg_restore` and restores into the target database with `--clean --if-exists` by default.
- If you want to keep existing RDS data, set `DROP_EXISTING=false`.
- Make sure the RDS security group allows your current machine or Jenkins controller to connect on port `5432`.