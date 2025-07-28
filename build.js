#!/usr/bin/env node

// build.js - Node.js build script for Render deployment
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Render build process...');

function runCommand(command, description, cwd = process.cwd()) {
  console.log(`📋 ${description}`);
  console.log(`💻 Running: ${command}`);
  console.log(`📁 Working directory: ${cwd}\n`);
  
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: cwd,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log(`✅ ${description} - SUCCESS\n`);
  } catch (error) {
    console.error(`❌ ${description} - FAILED`);
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

function checkFile(filePath, description) {
  console.log(`📁 Checking: ${description}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} exists`);
  } else {
    console.error(`❌ ${description} not found at: ${filePath}`);
    process.exit(1);
  }
  console.log('');
}

async function main() {
  try {
    // Step 1: Install root dependencies
    runCommand('npm install', 'Installing root dependencies');

    // Step 2: Navigate to frontend and install dependencies
    const frontendPath = path.join(process.cwd(), 'frontend');
    runCommand('npm install', 'Installing frontend dependencies', frontendPath);

    // Step 3: Verify react-scripts is installed
    const reactScriptsPath = path.join(frontendPath, 'node_modules', '.bin', 'react-scripts');
    const reactScriptsPathWin = path.join(frontendPath, 'node_modules', '.bin', 'react-scripts.cmd');
    
    if (fs.existsSync(reactScriptsPath) || fs.existsSync(reactScriptsPathWin)) {
      console.log('✅ react-scripts found');
    } else {
      console.log('⚠️  react-scripts not found, installing explicitly...');
      runCommand('npm install react-scripts@5.0.1', 'Installing react-scripts', frontendPath);
    }

    // Step 4: Build the frontend
    runCommand('npm run build', 'Building React frontend', frontendPath);

    // Step 5: Verify build output
    const buildPath = path.join(frontendPath, 'build');
    checkFile(buildPath, 'Frontend build directory');
    checkFile(path.join(buildPath, 'index.html'), 'Frontend index.html');

    console.log('🎉 Build process completed successfully!');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();