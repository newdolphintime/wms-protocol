---
name: database_management
description: Guidelines and commands for managing the WMS project database, including schema updates and seed data.
---

# Database Management Skill

Use this skill when modifying the database schema or managing data for the WMS project.

## Schema Updates

### Applying Migrations
When adding new columns or tables, document the changes in an SQL migration file (e.g., `apply_migration.sql`).
```bash
# Apply a migration file
mysql -u root -p wms < backend/apply_migration.sql
```

### Verification
- Check the table structure: `DESCRIBE table_name;`
- Verify column additions: `SHOW COLUMNS FROM table_name LIKE 'column_name';`

## Data Operations

### Seeding Data
Use the `seed_data.py` script to populate the database with initial or test data.
```bash
# Run the seed script
python3 backend/seed_data.py
```

### Resetting the Database
**WARNING: This will delete all existing data.**
```bash
# Re-create the database and apply schema
mysql -u root -p -e "DROP DATABASE IF EXISTS wms; CREATE DATABASE wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p wms < backend/schema.sql
python3 backend/seed_data.py
```

## Best Practices
- Always back up the database before performing destructive operations.
- Ensure the database connection details in `backend/main.py` (or `.env.local`) are correct.
