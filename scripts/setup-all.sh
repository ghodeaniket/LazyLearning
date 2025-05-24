#!/bin/bash

# Complete GitHub Project Setup for LazyLearner
# This script runs all setup scripts in the correct order

echo "🚀 Complete LazyLearner GitHub Setup"
echo "===================================="
echo ""

# Run project setup first
echo "📊 Step 1: Setting up GitHub Project Board..."
./scripts/setup-github-project.sh

# Wait a moment for project to be fully created
echo ""
echo "⏳ Waiting for project creation to complete..."
sleep 3

# Create issues and link to project
echo ""
echo "📝 Step 2: Creating Phase 1 Issues..."
node scripts/create-issues.js --project

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📌 Quick Links:"
echo "   - Repository: https://github.com/ghodeaniket/LazyLearning"
echo "   - Actions: https://github.com/ghodeaniket/LazyLearning/actions"
echo "   - Issues: https://github.com/ghodeaniket/LazyLearning/issues"
echo "   - Project: https://github.com/users/$(gh api user -q .login)/projects"
echo ""
echo "🚦 You're ready to start developing!"