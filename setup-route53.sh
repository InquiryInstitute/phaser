#!/bin/bash

# Setup script for AWS Route 53 DNS configuration
# This script helps configure the phaser.inquiry.institute domain

set -e

echo "🌐 Setting up Route 53 DNS for phaser.inquiry.institute..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed."
    echo "Please install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured."
    echo "Please run: aws configure"
    exit 1
fi

DOMAIN="phaser.inquiry.institute"
PARENT_DOMAIN="inquiry.institute"
GITHUB_PAGES_IP1="185.199.108.153"
GITHUB_PAGES_IP2="185.199.109.153"
GITHUB_PAGES_IP3="185.199.110.153"
GITHUB_PAGES_IP4="185.199.111.153"

echo "📋 Domain: $DOMAIN"
echo "📋 Parent domain: $PARENT_DOMAIN"

# Get hosted zone ID for parent domain
echo "🔍 Finding hosted zone for $PARENT_DOMAIN..."
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$PARENT_DOMAIN.'].[Id]" --output text | cut -d'/' -f3)

if [ -z "$ZONE_ID" ]; then
    echo "❌ Hosted zone for $PARENT_DOMAIN not found."
    echo "Please create a hosted zone for $PARENT_DOMAIN first."
    exit 1
fi

echo "✅ Found hosted zone: $ZONE_ID"

# Create A records for GitHub Pages
echo "📝 Creating A records for GitHub Pages..."

cat > /tmp/route53-change.json <<EOF
{
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "$DOMAIN",
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [
                    {"Value": "$GITHUB_PAGES_IP1"},
                    {"Value": "$GITHUB_PAGES_IP2"},
                    {"Value": "$GITHUB_PAGES_IP3"},
                    {"Value": "$GITHUB_PAGES_IP4"}
                ]
            }
        },
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "$DOMAIN",
                "Type": "AAAA",
                "TTL": 300,
                "ResourceRecords": [
                    {"Value": "2606:50c0:8000::153"},
                    {"Value": "2606:50c0:8001::153"},
                    {"Value": "2606:50c0:8002::153"},
                    {"Value": "2606:50c0:8003::153"}
                ]
            }
        }
    ]
}
EOF

echo "📤 Applying DNS changes..."
CHANGE_ID=$(aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch file:///tmp/route53-change.json \
    --query 'ChangeInfo.Id' \
    --output text | cut -d'/' -f3)

echo "✅ DNS change submitted: $CHANGE_ID"
echo "⏳ DNS propagation may take a few minutes..."

# Clean up temp file
rm /tmp/route53-change.json

echo ""
echo "📋 Next steps:"
echo "1. Wait for DNS propagation (usually 5-15 minutes)"
echo "2. Verify DNS with: dig $DOMAIN"
echo "3. Configure GitHub Pages custom domain:"
echo "   gh api repos/Inquiry-Institute/phaser/pages -X PUT -f cname='$DOMAIN'"
echo ""
echo "4. Add CNAME file to repository (GitHub Pages requirement):"
echo "   echo '$DOMAIN' > CNAME"
echo "   git add CNAME"
echo "   git commit -m 'Add CNAME for custom domain'"
echo "   git push"

echo ""
echo "✅ Route 53 setup complete!"
