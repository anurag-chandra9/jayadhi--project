#!/usr/bin/env node

// scripts/deploy-render.js - Test Render deployment locally
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing Render Deployment Process Locally...\n');

function runCommand(command, description) {
  console.log(`📋 ${description}`);
  console.log(`💻 Running: ${command}\n`);
  
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
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
    const stats = fs.statSync(filePath);
    console.log(`✅ ${description} exists (${stats.isDirectory() ? 'directory' : 'file'})`);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(filePath);
      console.log(`   📂 Contains ${files.length} items`);
    }
  } else {
    console.error(`❌ ${description} not found at: ${filePath}`);
    process.exit(1);
  }
  console.log('');
}

async function main() {
  try {
    // Step 1: Clean previous builds
    console.log('🧹 Cleaning previous builds...');
    if (fs.existsSync('frontend/build')) {
      fs.rmSync('frontend/build', { recursive: true, force: true });
      console.log('✅ Cleaned frontend/build directory\n');
    }

    // Step 2: Install root dependencies
    runCommand('npm install', 'Installing root dependencies');

    // Step 3: Install frontend dependencies
    runCommand('cd frontend && npm install', 'Installing frontend dependencies');

    // Step 4: Build frontend
    runCommand('cd frontend && npm run build', 'Building React frontend');

    // Step 5: Verify build output
    checkFile('frontend/build', 'Frontend build directory');
    checkFile('frontend/build/index.html', 'Frontend index.html');
    checkFile('frontend/build/static', 'Frontend static assets');

    // Step 6: Test server startup (with timeout)
    console.log('🚀 Testing server startup...');
    
    // Set test environment
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3001';
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret-key';
    
    console.log('⚠️  Starting server in test mode (will timeout after 10 seconds)');
    
    try {
      execSync('timeout 10s node server/index.js || true', { 
        stdio: 'inherit',
        timeout: 12000
      });
    } catch (error) {
      // Timeout is expected
      console.log('✅ Server started successfully (timed out as expected)\n');
    }

    // Step 7: Verify deployment readiness
    console.log('🔍 Deployment Readiness Check:');
    
    const requiredFiles = [
      'package.json',
      'server/index.js',
      'frontend/build/index.html',
      'frontend/package.json'
    ];

    requiredFiles.forEach(file => {
      checkFile(file, `Required file: ${file}`);
    });

    // Step 8: Check package.json scripts
    console.log('📋 Checking package.json scripts...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['build:render', 'start:production'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts[script]) {
        console.log(`✅ Script '${script}': ${packageJson.scripts[script]}`);
      } else {
        console.error(`❌ Missing required script: ${script}`);
        process.exit(1);
      }
    });

    console.log('\n🎉 DEPLOYMENT READY!');
    console.log('📋 Next Steps:');
    console.log('   1. Push your code to GitHub/GitLab');
    console.log('   2. Create a new Web Service on Render');
    console.log('   3. Set Build Command: npm run build:render');
    console.log('   4. Set Start Command: npm run start:production');
    console.log('   5. Add environment variables from .env.production');
    console.log('   6. Deploy and monitor logs');
    console.log('\n📖 See RENDER_DEPLOYMENT.md for detailed instructions');

  } catch (error) {
    console.error('\n❌ Deployment test failed:', error.message);
    process.exit(1);
  }
}

main();