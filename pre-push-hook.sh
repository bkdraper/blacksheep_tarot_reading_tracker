#!/bin/sh
# Auto-sync service worker cache with both app and service worker versions before push
# To install: copy this file to .git/hooks/pre-push and make executable

# Extract app version from index.html meta tag: content="v4.3.2"
APP_VERSION=$(grep 'http-equiv="version"' index.html | sed -n 's/.*content="v\([0-9.]*\)".*/\1/p')

# Extract service worker version from serviceWorker.js
SERVICE_VERSION=$(grep 'SERVICE_WORKER_VERSION' serviceWorker.js | sed -n "s/.*= 'v\([0-9.]*\)'.*/\1/p")

if [ -n "$APP_VERSION" ] && [ -n "$SERVICE_VERSION" ]; then
  # Update cache name with both versions using | as sed delimiter to avoid conflicts with /
  sed -i "s|const CACHE_NAME = '[^']*';|const CACHE_NAME = 'app:v${APP_VERSION}-service:v${SERVICE_VERSION}';|" serviceWorker.js

  # Add to last commit without creating new commit
  git add serviceWorker.js
  git commit --amend --no-edit

  echo "Updated cache name to: app:v$APP_VERSION-service:v$SERVICE_VERSION"
else
  echo "Warning: Could not find versions (app: $APP_VERSION, service: $SERVICE_VERSION)"
  exit 1
fi
