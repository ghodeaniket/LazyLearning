#!/bin/bash

# GitHub Project Setup Script for LazyLearner
# This script automates the creation of GitHub milestones, labels, and project board

echo "🚀 Setting up GitHub Project for LazyLearner..."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run:"
    echo "   gh auth login"
    exit 1
fi

# Ensure we have project scope
echo "📝 Checking GitHub CLI permissions..."
echo "   If prompted, please authorize the project scope."
gh auth refresh -s project

echo ""
echo "📋 Creating Milestones..."

# Create milestones
gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Phase 1 - Sprint 0" \
  -f description="Project Setup (Completed)" \
  -f due_on="2025-06-08T00:00:00Z" \
  -f state="closed" 2>/dev/null || echo "   ✓ Sprint 0 milestone already exists"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Phase 1 - Sprint 1-2" \
  -f description="Authentication & Core Services" \
  -f due_on="2025-06-22T00:00:00Z" 2>/dev/null || echo "   ✓ Sprint 1-2 milestone already exists"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Phase 1 - Sprint 3-4" \
  -f description="Pizza Load Balancer Game Core" \
  -f due_on="2025-07-20T00:00:00Z" 2>/dev/null || echo "   ✓ Sprint 3-4 milestone already exists"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Phase 1 - Sprint 5-6" \
  -f description="Learning Modules & Content System" \
  -f due_on="2025-08-17T00:00:00Z" 2>/dev/null || echo "   ✓ Sprint 5-6 milestone already exists"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Phase 1 - MVP Release" \
  -f description="MVP Complete and Ready for Beta" \
  -f due_on="2025-08-24T00:00:00Z" 2>/dev/null || echo "   ✓ MVP Release milestone already exists"

echo ""
echo "🏷️  Creating Labels..."

# Priority labels
gh label create "high-priority" --description "Critical for MVP" --color d73a4a --force
gh label create "medium-priority" --description "Important but not blocking" --color fbca04 --force
gh label create "low-priority" --description "Nice to have" --color 0e8a16 --force

# Type labels
gh label create "feature" --description "New feature or request" --color a2eeef --force
gh label create "test" --description "Testing related" --color 7057ff --force
gh label create "chore" --description "Maintenance tasks" --color fef2c0 --force

# Feature area labels
gh label create "auth" --description "Authentication related" --color 1d76db --force
gh label create "game" --description "Game mechanics" --color 5319e7 --force
gh label create "learning" --description "Learning modules" --color 0052cc --force

# Status labels
gh label create "blocked" --description "Blocked by dependencies" --color b60205 --force
gh label create "needs-review" --description "Needs code review" --color fbca04 --force
gh label create "ready-to-merge" --description "Approved and ready" --color 0e8a16 --force

echo ""
echo "📊 Creating Project Board..."

# Create the project
PROJECT_ID=$(gh project create --owner @me --title "LazyLearner MVP Development" --format json | jq -r '.id' 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "   ℹ️  Project might already exist. Fetching existing project..."
    PROJECT_ID=$(gh project list --owner @me --format json | jq -r '.projects[] | select(.title == "LazyLearner MVP Development") | .id' | head -1)
fi

if [ -n "$PROJECT_ID" ]; then
    echo "   ✅ Project created/found with ID: $PROJECT_ID"
    
    # Create custom fields
    echo ""
    echo "🔧 Setting up custom fields..."
    
    # Create Phase field
    gh project field-create $PROJECT_ID --owner @me --name "Phase" --data-type "SINGLE_SELECT" --single-select-options "Phase 1,Phase 2" 2>/dev/null || echo "   ✓ Phase field already exists"
    
    # Create Sprint field
    gh project field-create $PROJECT_ID --owner @me --name "Sprint" --data-type "SINGLE_SELECT" --single-select-options "Sprint 0,Sprint 1-2,Sprint 3-4,Sprint 5-6,Sprint 7-8,Sprint 9-10,Sprint 11-12" 2>/dev/null || echo "   ✓ Sprint field already exists"
    
    # Create Effort field
    gh project field-create $PROJECT_ID --owner @me --name "Effort" --data-type "SINGLE_SELECT" --single-select-options "XS,S,M,L,XL" 2>/dev/null || echo "   ✓ Effort field already exists"
    
    # Create Priority field (different from label)
    gh project field-create $PROJECT_ID --owner @me --name "Priority" --data-type "SINGLE_SELECT" --single-select-options "🔴 High,🟡 Medium,🟢 Low" 2>/dev/null || echo "   ✓ Priority field already exists"
    
    # Create Type field
    gh project field-create $PROJECT_ID --owner @me --name "Type" --data-type "SINGLE_SELECT" --single-select-options "✨ Feature,🐛 Bug,🧪 Test,🔧 Chore,📚 Docs" 2>/dev/null || echo "   ✓ Type field already exists"
    
    echo ""
    echo "📌 Project URL: https://github.com/users/$(gh api user -q .login)/projects/${PROJECT_ID##*/}"
else
    echo "   ❌ Failed to create/find project. You may need to create it manually."
fi

echo ""
echo "✅ Setup complete! Next steps:"
echo "   1. Run 'node scripts/create-issues.js' to create Phase 1 issues"
echo "   2. Visit your project board to customize the view"
echo "   3. Start working on Sprint 1-2: Authentication!"
echo ""
echo "💡 Tip: You can link issues to the project board when creating them:"
echo "   gh issue create --project \"LazyLearner MVP Development\""