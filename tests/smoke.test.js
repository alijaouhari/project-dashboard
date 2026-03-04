#!/usr/bin/env node

/**
 * Minimal smoke test for CI
 * Verifies basic project structure without starting the server
 */

const fs = require('fs');
const path = require('path');

console.log('Running smoke tests...\n');

let exitCode = 0;

// Test 1: Verify required files exist
const requiredFiles = [
  'server.js',
  'package.json',
  'public/index.html',
  'public/app.js'
];

console.log('✓ Checking required files...');
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ FAIL: Missing required file: ${file}`);
    exitCode = 1;
  } else {
    console.log(`  ✓ ${file}`);
  }
}

// Test 2: Verify package.json is valid JSON
console.log('\n✓ Checking package.json validity...');
try {
  const packageJson = require('../package.json');
  if (!packageJson.name || !packageJson.version) {
    console.error('  ✗ FAIL: package.json missing name or version');
    exitCode = 1;
  } else {
    console.log(`  ✓ package.json valid (${packageJson.name}@${packageJson.version})`);
  }
} catch (err) {
  console.error('  ✗ FAIL: package.json is invalid:', err.message);
  exitCode = 1;
}

// Test 3: Verify server.js can be loaded (syntax check)
console.log('\n✓ Checking server.js syntax...');
try {
  // Note: We don't actually require server.js because it starts listening
  // Instead, we just check if it exists and has basic structure
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  
  if (!serverContent.includes('express')) {
    console.error('  ✗ FAIL: server.js does not appear to use Express');
    exitCode = 1;
  } else if (!serverContent.includes('app.listen')) {
    console.error('  ✗ FAIL: server.js does not appear to start a server');
    exitCode = 1;
  } else {
    console.log('  ✓ server.js structure looks valid');
  }
} catch (err) {
  console.error('  ✗ FAIL: Cannot read server.js:', err.message);
  exitCode = 1;
}

// Test 4: Verify dependencies are listed
console.log('\n✓ Checking dependencies...');
try {
  const packageJson = require('../package.json');
  const requiredDeps = ['express', 'pg', 'bcrypt', 'jsonwebtoken', 'cors', 'dotenv'];
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      console.error(`  ✗ FAIL: Missing dependency: ${dep}`);
      exitCode = 1;
    } else {
      console.log(`  ✓ ${dep}`);
    }
  }
} catch (err) {
  console.error('  ✗ FAIL: Cannot check dependencies:', err.message);
  exitCode = 1;
}

// Final result
console.log('\n' + '='.repeat(50));
if (exitCode === 0) {
  console.log('✓ SMOKE OK - All tests passed!');
} else {
  console.log('✗ SMOKE FAILED - Some tests failed');
}
console.log('='.repeat(50) + '\n');

process.exit(exitCode);
