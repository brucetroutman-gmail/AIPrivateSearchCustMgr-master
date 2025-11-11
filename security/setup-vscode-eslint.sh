#!/bin/bash

echo "🔧 Setting up VS Code ESLint integration..."

# Check if VS Code is installed
if ! command -v code &> /dev/null; then
    echo "❌ VS Code 'code' command not found"
    echo "💡 Install VS Code and enable 'code' command in PATH"
    echo "   VS Code → Command Palette → 'Shell Command: Install code command in PATH'"
    exit 1
fi

# Install ESLint extension
echo "📦 Installing ESLint extension..."
code --install-extension dbaeumer.vscode-eslint

# Check if extension installed
if code --list-extensions | grep -q "dbaeumer.vscode-eslint"; then
    echo "✅ ESLint extension installed"
else
    echo "❌ Failed to install ESLint extension"
    exit 1
fi

echo "✅ VS Code ESLint setup complete!"
echo "🔄 Reload VS Code to see real-time ESLint checking"
echo "💡 ESLint will now show errors/warnings as you type"