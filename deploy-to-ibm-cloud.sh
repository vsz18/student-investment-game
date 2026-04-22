#!/bin/bash

# FOE2026 Angel Investor Game - IBM Cloud Code Engine Deployment Script
# This script automates the deployment process to IBM Cloud Code Engine

set -e  # Exit on any error

echo "🚀 FOE2026 Angel Investor Game - IBM Cloud Deployment"
echo "=================================================="
echo ""

# Check if IBM Cloud CLI is installed
if ! command -v ibmcloud &> /dev/null; then
    echo "❌ IBM Cloud CLI is not installed."
    echo "Please install it from: https://cloud.ibm.com/docs/cli"
    exit 1
fi

# Check if Code Engine plugin is installed
if ! ibmcloud plugin list | grep -q "code-engine"; then
    echo "❌ Code Engine plugin is not installed."
    echo "Installing Code Engine plugin..."
    ibmcloud plugin install code-engine -f
fi

echo "✅ Prerequisites check passed"
echo ""

# Login check
echo "Checking IBM Cloud login status..."
if ! ibmcloud target &> /dev/null; then
    echo "Please login to IBM Cloud:"
    ibmcloud login
fi

echo "✅ Logged in to IBM Cloud"
echo ""

# Get or create project
echo "Setting up Code Engine project..."
PROJECT_NAME="angel-investor-game"

# Try to select existing project
if ibmcloud ce project select --name $PROJECT_NAME &> /dev/null; then
    echo "✅ Using existing project: $PROJECT_NAME"
else
    echo "Creating new project: $PROJECT_NAME"
    ibmcloud ce project create --name $PROJECT_NAME
    ibmcloud ce project select --name $PROJECT_NAME
    echo "✅ Created and selected project: $PROJECT_NAME"
fi

echo ""

# Ask for deployment configuration
echo "Select deployment size:"
echo "1) Small (< 30 students) - 0.5 CPU, 1GB RAM"
echo "2) Medium (30-100 students) - 1 CPU, 2GB RAM"
echo "3) Large (> 100 students) - 2 CPU, 4GB RAM"
read -p "Enter choice (1-3) [default: 1]: " SIZE_CHOICE
SIZE_CHOICE=${SIZE_CHOICE:-1}

case $SIZE_CHOICE in
    1)
        CPU="0.5"
        MEMORY="1G"
        MIN_SCALE="1"
        MAX_SCALE="2"
        ;;
    2)
        CPU="1"
        MEMORY="2G"
        MIN_SCALE="1"
        MAX_SCALE="5"
        ;;
    3)
        CPU="2"
        MEMORY="4G"
        MIN_SCALE="2"
        MAX_SCALE="10"
        ;;
    *)
        echo "Invalid choice, using small configuration"
        CPU="0.5"
        MEMORY="1G"
        MIN_SCALE="1"
        MAX_SCALE="2"
        ;;
esac

echo ""
echo "Deployment Configuration:"
echo "  CPU: $CPU"
echo "  Memory: $MEMORY"
echo "  Min Scale: $MIN_SCALE"
echo "  Max Scale: $MAX_SCALE"
echo ""

# Deploy application
APP_NAME="angel-investor-game"

echo "🚀 Deploying application..."
echo "This may take 3-5 minutes..."
echo ""

if ibmcloud ce application get --name $APP_NAME &> /dev/null; then
    echo "Application exists, updating..."
    ibmcloud ce application update \
        --name $APP_NAME \
        --build-source . \
        --strategy dockerfile \
        --port 3000 \
        --min-scale $MIN_SCALE \
        --max-scale $MAX_SCALE \
        --cpu $CPU \
        --memory $MEMORY \
        --env PORT=3000 \
        --wait
else
    echo "Creating new application..."
    ibmcloud ce application create \
        --name $APP_NAME \
        --build-source . \
        --strategy dockerfile \
        --port 3000 \
        --min-scale $MIN_SCALE \
        --max-scale $MAX_SCALE \
        --cpu $CPU \
        --memory $MEMORY \
        --env PORT=3000 \
        --wait
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Get application URL
echo "📍 Getting application URL..."
APP_URL=$(ibmcloud ce application get --name $APP_NAME --output json | grep -o '"url":"[^"]*' | cut -d'"' -f4)

echo ""
echo "=================================================="
echo "🎉 SUCCESS! Your application is deployed!"
echo "=================================================="
echo ""
echo "Application URL: $APP_URL"
echo ""
echo "Share this URL with your students to access the game."
echo ""
echo "Instructor Access:"
echo "  1. Open the URL in your browser"
echo "  2. Click 'INSTRUCTOR' to access the control panel"
echo "  3. Upload your companies Excel file"
echo "  4. Control game phases (voting/results)"
echo ""
echo "Student Access:"
echo "  1. Students open the same URL"
echo "  2. Click 'STUDENT' and enter their name"
echo "  3. They can invest their $200,000 budget"
echo ""
echo "To view logs: ibmcloud ce application logs --name $APP_NAME"
echo "To update: Run this script again"
echo "To delete: ibmcloud ce application delete --name $APP_NAME"
echo ""

# Made with Bob
