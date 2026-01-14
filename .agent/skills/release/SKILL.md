---
name: project_release
description: Guidelines and checklists to ensure documentation and code remain consistent during the release process of the WMS Protocol project.
---

# Project Release Skill

Use this skill when preparing a new release or completing a major feature. It ensures that all documentation (Schema, API, Deploy) is synchronized with the latest code.

## Release Checklist

### 1. Database Consistency
If you modified the database structure (`backend/schema.sql`):
- [ ] **Sync Schema Doc**: Update `backend/DB_SCHEMA.md` to match `backend/schema.sql`.
- [ ] **Create Migration**: Ensure `backend/apply_migration.sql` contains the `ALTER` or `CREATE` statements for production.
- [ ] **Update Seed Scripts**: Update `backend/generate_seed.py` if new tables were added.
- [ ] **Regenerate Seed Data**: Run `generate_seed.py` to update `backend/seed_data.py` after local verification.

### 2. API & Logic Docs
If you modified backend endpoints or core logic:
- [ ] **Update API Docs**: Sync `backend/API_DOCS.md` (or relevant doc) with `main.py`.
- [ ] **Liquidity Rules**: If calculation logic changed, update `LIQUIDITY_README.md`.

### 3. Deployment Docs
If you changed dependencies or build steps:
- [ ] **Update Quick Deploy**: Sync `QUICK_DEPLOY.md` with any new `requirements.txt` or `npm` steps.

### 4. Final Cleanup & Verification
- [ ] **Remove Junk**: Delete test scripts like `temp_*.py` or `debug_*.py`.
- [ ] **Mock Alignment**: Ensure any frontend mock data aligns with the new DB structure.

## Release Report Procedure

Every release requires a report file named `RELEASE_YYYYMMDD.vX.md` in the project root (or docs folder).

### Report Content Template:
1. **Core Summary**: High-level goal of the update.
2. **Feature Enhancements**: User-facing features and bug fixes.
3. **Backend Upgrades**: Schema changes, new APIs, performance tuning.
4. **Doc Sync**: Confirmation that all tech docs are updated.
5. **Git Tagging**: Ensure code is pushed and a GitHub Release Tag is created.

## Commands for Verification
- **Test Database**: `python3 backend/seed_data.py` (after dropping and re-creating the DB).
- **Check Status**: `git status` to ensure no temporary files are left behind.
