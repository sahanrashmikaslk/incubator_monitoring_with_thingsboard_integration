#!/bin/bash
set -e

echo "Initializing ThingsBoard database..."

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready!"
echo "ThingsBoard will initialize the schema on first startup."
