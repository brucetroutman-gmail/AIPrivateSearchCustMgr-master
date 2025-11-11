#!/bin/bash

# ESLint helper script for AIPrivateSearch

echo "🔍 Running ESLint on AIPrivateSearch JavaScript files..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Change to root directory (parent of security folder)
cd "$SCRIPT_DIR/.."

# Run ESLint with security config
npx eslint "client/**/*.{js,mjs}" "server/**/*.{js,mjs}" --config ./security/eslint.security.config.mjs --fix

# Capture exit code
ESLINT_EXIT_CODE=$?

if [ $ESLINT_EXIT_CODE -eq 0 ]; then
    echo "✅ ESLint check passed!"
else
    echo "❌ ESLint found issues that need to be fixed"
    exit $ESLINT_EXIT_CODE
fi