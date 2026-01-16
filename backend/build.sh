#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit

pip install -r requirements.txt

# Run database migrations
alembic upgrade head
