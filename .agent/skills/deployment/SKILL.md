---
name: project_deployment
description: Instructions for building and deploying the WMS Protocol project.
---

# Project Deployment Skill

This skill provides the standard procedures for deploying changes to the WMS Protocol project.

## Deployment Procedure

### 1. Frontend Rebuild
Always clean the previous build to avoid stale assets.
```bash
# In the project root
rm -rf dist
npm run build
```

### 2. Backend Restart
The backend serves both the API and the built frontend assets from the `dist` directory.
```bash
# In the backend directory
ps aux | grep "python backend/main.py" | grep -v grep | awk '{print $2}' | xargs kill
nohup python3 main.py > ../LOG/server.log 2>&1 &
```

### 3. Verification
- Check the backend logs: `tail -f LOG/server.log`
- Check the application logs: `tail -f LOG/backend.log`
- Verify the frontend is accessible at the configured port (default 8001 or 3000 for dev).

## Common Issues
- **Port Conflict**: If the service fails to start, check if the port is already in use (`lsof -i :8001`).
- **Missing Dist**: Ensure `npm run build` completes successfully and creates the `dist` folder.
