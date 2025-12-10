# AIPS Installer Downloads

This directory contains the AIPrivateSearch installer files for customer downloads.

## Current Installer

- **File**: `load-AIPrivateSearch-1108.command`
- **URL**: `https://custmgr.aiprivatesearch.com/downloads/load-AIPrivateSearch-1108.command`
- **Local Dev**: `http://localhost:56303/downloads/load-AIPrivateSearch-1108.command`

## Deployment Instructions

### macOS Development
1. Copy installer from aips repo:
   ```bash
   cp /Users/Shared/AIPrivateSearch/repo/aiprivatesearch/load-AIPrivateSearch-1108.command \
      /Users/Shared/AIPrivateSearch/repo/aiprivatesearchcustmgr/client/c01_client-first-app/downloads/
   ```

### Ubuntu Production
1. Copy installer to server:
   ```bash
   cp /webs/AIPrivateSearch/repo/aiprivatesearch/load-AIPrivateSearch-1108.command \
      /webs/AIPrivateSearch/repo/aiprivatesearchcustmgr/client/c01_client-first-app/downloads/
   ```

## Version Updates

When updating the installer:
1. Copy new version to this directory
2. Update `AIPS_DOWNLOAD_URL` in `.env-custmgr`
3. Update this README with new filename
4. Keep old version for 30 days for existing downloads

## Notes

- Files in this directory are served directly by the frontend server
- No authentication required for downloads
- Caddy serves these files in production
