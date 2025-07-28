#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting Render build process..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Navigate to frontend and install dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Verify react-scripts is installed
echo "🔍 Verifying react-scripts installation..."
if [ -f "node_modules/.bin/react-scripts" ]; then
    echo "✅ react-scripts found"
else
    echo "❌ react-scripts not found, installing..."
    npm install react-scripts@5.0.1
fi

# Build the frontend
echo "🔨 Building React frontend..."
npm run build

# Verify build output
if [ -d "build" ]; then
    echo "✅ Frontend build successful"
    echo "📁 Build directory contents:"
    ls -la build/
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "🎉 Build process completed successfully!"