#!/bin/bash

# Setup script for GitHub repository and Pages
# This script helps set up the repository in the Inquiry.Institute GitHub organization

set -e

echo "🚀 Setting up GitHub repository for Inquiry.Institute..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub:"
    gh auth login
fi

# Get repository name from current directory
REPO_NAME=$(basename "$(pwd)")

echo "📦 Repository name: $REPO_NAME"
read -p "Enter the repository name (or press Enter to use '$REPO_NAME'): " CUSTOM_REPO_NAME
REPO_NAME=${CUSTOM_REPO_NAME:-$REPO_NAME}

ORG_NAME="Inquiry-Institute"
echo "🏢 Organization: $ORG_NAME"

# Check if repository already exists
if gh repo view "$ORG_NAME/$REPO_NAME" &> /dev/null; then
    echo "⚠️  Repository $ORG_NAME/$REPO_NAME already exists."
    read -p "Do you want to add this as a remote? (y/n): " ADD_REMOTE
    if [[ $ADD_REMOTE == "y" ]]; then
        git remote add origin "https://github.com/$ORG_NAME/$REPO_NAME.git" 2>/dev/null || \
        git remote set-url origin "https://github.com/$ORG_NAME/$REPO_NAME.git"
        echo "✅ Remote 'origin' set to $ORG_NAME/$REPO_NAME"
    fi
else
    # Create repository in organization
    echo "📝 Creating repository $ORG_NAME/$REPO_NAME..."
    gh repo create "$ORG_NAME/$REPO_NAME" \
        --public \
        --description "Phaser.js application for mapping Inquiry Institute canvas with tied system" \
        --source=. \
        --remote=origin \
        --push
    
    echo "✅ Repository created successfully!"
fi

# Enable GitHub Pages
echo "🌐 Enabling GitHub Pages..."
gh api repos/$ORG_NAME/$REPO_NAME/pages \
    --method POST \
    -f source='{"branch":"main","path":"/root"}' || \
    echo "⚠️  Pages might already be enabled or you may need to enable it manually in Settings > Pages"

# Set custom domain (will be configured after Route 53 setup)
echo ""
echo "📋 Next steps:"
echo "1. After setting up Route 53 DNS, run:"
echo "   gh api repos/$ORG_NAME/$REPO_NAME/pages -X PUT -f cname='phaser.inquiry.institute'"
echo ""
echo "2. Or manually set the custom domain in:"
echo "   https://github.com/$ORG_NAME/$REPO_NAME/settings/pages"
echo ""
echo "3. Push your code:"
echo "   git push -u origin main"

echo ""
echo "✅ GitHub setup complete!"
