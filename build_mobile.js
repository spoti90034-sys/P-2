const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting mobile build process...');

// 1. Create www directory
const wwwDir = path.join(__dirname, 'www');
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir);
}

// 2. Copy web files
const filesToCopy = ['index.html', 'index.css', 'app.js'];
filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    if (file === 'index.html') {
      let htmlContent = fs.readFileSync(src, 'utf8');
      htmlContent = htmlContent.replace('window.IS_WEBSITE = true', 'window.IS_WEBSITE = false');
      fs.writeFileSync(dest, htmlContent, 'utf8');
      console.log(`Copied index.html with window.IS_WEBSITE = false to www/`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} to www/`);
    }
  } else {
    console.error(`Error: ${file} not found!`);
  }
});

// 3. Read config.json, strip databaseUrl, and write to www/config.json
const configSrc = path.join(__dirname, 'config.json');
const configDest = path.join(wwwDir, 'config.json');
if (fs.existsSync(configSrc)) {
  try {
    const rawData = fs.readFileSync(configSrc, 'utf8');
    const config = JSON.parse(rawData);
    
    // Create clean public config
    const cleanConfig = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey
    };
    
    fs.writeFileSync(configDest, JSON.stringify(cleanConfig, null, 2), 'utf8');
    console.log('Created sanitized www/config.json (databaseUrl removed).');
  } catch (err) {
    console.error('Error processing config.json:', err.message);
  }
} else {
  console.warn('Warning: config.json not found in root. Mobile app will fall back to local storage.');
}

// 4. Run Capacitor Sync
try {
  console.log('Running npx cap sync...');
  // Force cmd /c for Windows to bypass power-shell issues
  execSync('cmd.exe /c "npx cap sync"', { stdio: 'inherit' });
  console.log('Mobile build sync completed successfully!');
} catch (err) {
  console.error('Error running cap sync:', err.message);
}
