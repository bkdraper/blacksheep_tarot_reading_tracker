#!/bin/sh
# Auto-sync service worker cache with both app and service worker versions before push
# To install: copy this file to .git/hooks/pre-push and make executable

# Extract app version from index.html
APP_VERSION=$(grep -o 'version-badge">v[0-9.]*' index.html | sed 's/version-badge">v//')

# Extract service worker version from serviceWorker.js
SERVICE_VERSION=$(grep -o "SERVICE_WORKER_VERSION = 'v[0-9.]*'" serviceWorker.js | sed "s/SERVICE_WORKER_VERSION = 'v//" | sed "s/'//")

if [ -n "$APP_VERSION" ] && [ -n "$SERVICE_VERSION" ]; then
  # Update cache name with both versions
  sed -i "s/const CACHE_NAME = '[^']*';/const CACHE_NAME = 'app:v$APP_VERSION-service:v$SERVICE_VERSION';/" serviceWorker.js
  
  # Add to last commit without creating new commit
  git add serviceWorker.js
  git commit --amend --no-edit
  
  echo "Updated cache name to: app:v$APP_VERSION-service:v$SERVICE_VERSION"
else
  echo "Warning: Could not find versions (app: $APP_VERSION, service: $SERVICE_VERSION)"
  exit 1
fi