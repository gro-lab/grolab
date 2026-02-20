#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'extension');
const isWatch = process.argv.includes('--watch');

async function verifySrc() {
  console.log('📁 Source directory:', SRC_DIR);
  
  if (!await fs.pathExists(SRC_DIR)) {
    throw new Error(`Source directory not found: ${SRC_DIR}`);
  }
  
  const files = await fs.readdir(SRC_DIR);
  console.log('📄 Source files found:', files.join(', '));
  
  const manifestPath = path.join(SRC_DIR, 'manifest.json');
  if (!await fs.pathExists(manifestPath)) {
    throw new Error('manifest.json not found in src/ directory!');
  }
  
  return files;
}

async function clean() {
  console.log('🧹 Cleaning dist...');
  await fs.ensureDir(DIST_DIR);
  await fs.emptyDir(DIST_DIR);
  console.log('✓ Dist directory ready');
}

async function copyFiles() {
  console.log('📦 Copying files...');
  
  const items = await fs.readdir(SRC_DIR);
  
  for (const item of items) {
    const src = path.join(SRC_DIR, item);
    const dest = path.join(DIST_DIR, item);
    const stat = await fs.stat(src);
    
    try {
      await fs.copy(src, dest, { overwrite: true });
      console.log(`  ✓ ${item}`);
    } catch (err) {
      console.error(`  ✗ ${item}: ${err.message}`);
      throw err;
    }
  }
}

async function generateManifest() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  
  // Verify manifest exists after copy
  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath} after copy!`);
  }
  
  let manifest;
  try {
    manifest = await fs.readJson(manifestPath);
  } catch (err) {
    throw new Error(`Failed to parse manifest.json: ${err.message}`);
  }
  
  // Get version from package.json
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    manifest.version = pkg.version || manifest.version;
  }
  
  // Add CSP for production
  manifest.content_security_policy = {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com"
  };
  
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  console.log(`✓ Manifest ready (v${manifest.version})`);
  
  return manifest;
}

async function injectConfig(manifest) {
  const config = {
    version: manifest.version,
    buildDate: new Date().toISOString(),
    environment: 'production'
  };
  
  const configPath = path.join(DIST_DIR, 'config.js');
  await fs.writeFile(configPath, `window.AI_BROWSER_CONFIG = ${JSON.stringify(config, null, 2)};`);
  console.log('✓ Config injected');
}

async function verifyBuild() {
  const requiredFiles = ['manifest.json', 'background.js', 'content.js', 'sidepanel.html'];
  const missing = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(DIST_DIR, file);
    if (!await fs.pathExists(filePath)) {
      missing.push(file);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required files: ${missing.join(', ')}`);
  }
  
  // List final contents
  const finalFiles = await fs.readdir(DIST_DIR);
  console.log('\n📋 Final build contents:');
  for (const file of finalFiles) {
    const stat = await fs.stat(path.join(DIST_DIR, file));
    const size = stat.isDirectory() ? '<dir>' : `${(stat.size / 1024).toFixed(1)}KB`;
    console.log(`   ${file.padEnd(20)} ${size}`);
  }
}

async function build() {
  try {
    console.log('🔨 Starting build...\n');
    
    await verifySrc();
    await clean();
    await copyFiles();
    const manifest = await generateManifest();
    await injectConfig(manifest);
    await verifyBuild();
    
    console.log('\n✅ Build successful!');
    console.log(`📂 Output: ${DIST_DIR}`);
    console.log(`🚀 Load in Chrome: chrome://extensions/ → Load unpacked → Select this folder`);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run build
build();

// Watch mode
if (isWatch) {
  const chokidar = require('chokidar');
  console.log('\n👀 Watching for changes...');
  
  chokidar.watch(SRC_DIR, { ignoreInitial: true }).on('all', async (event, filePath) => {
    console.log(`\n📝 Change detected: ${path.relative(ROOT_DIR, filePath)}`);
    await build();
    console.log('\n♻️  Reload extension in Chrome to see changes');
  });
}