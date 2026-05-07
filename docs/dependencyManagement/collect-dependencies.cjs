#!/usr/bin/env node
/**
 * Collect all dependencies from the pnpm workspace
 * Includes all packages (including @sap-ux/* scoped packages)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');

// Get all workspace packages
let workspacePackages = [];
try {
  const workspacesOutput = execSync('pnpm list -r --depth -1 --json', {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });

  const workspaceData = JSON.parse(workspacesOutput);
  workspacePackages = workspaceData.map(pkg => {
    // Convert absolute path to relative path
    const relativePath = path.relative(ROOT_DIR, pkg.path);
    return relativePath || '.';
  });
} catch (err) {
  console.error('Warning: Could not get workspace list, using fallback');
  // Fallback to finding package.json files (exclude node_modules and test fixtures)
  const findCmd = `find packages examples -maxdepth 4 -name "package.json" -type f -not -path "*/node_modules/*" -not -path "*/test/data/*" -not -path "*/test/sample-project/*" 2>/dev/null || true`;
  const output = execSync(findCmd, { cwd: ROOT_DIR, encoding: 'utf8' });
  workspacePackages = output.split('\n').filter(Boolean).map(p => path.dirname(p));
}

// Add root if not present
if (!workspacePackages.includes('.')) {
  workspacePackages.unshift('.');
}

const allDeps = {};
let totalPackages = 0;

// Process each package
workspacePackages.forEach(location => {
  const pkgPath = path.join(ROOT_DIR, location, 'package.json');

  if (!fs.existsSync(pkgPath)) return;

  try {
    const content = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(content);
    totalPackages++;

    const pkgName = pkg.name || path.basename(path.dirname(pkgPath));

    // Process all dependency types
    ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach(depType => {
      if (pkg[depType]) {
        Object.entries(pkg[depType]).forEach(([name, version]) => {
          // Skip workspace protocol
          if (version.startsWith('workspace:')) return;

          if (!allDeps[name]) {
            allDeps[name] = {
              versions: new Set(),
              packages: new Set()
            };
          }

          // Clean version (remove ^ ~ >= etc)
          const cleanVersion = version.replace(/^[\^~>=<]+/, '');
          allDeps[name].versions.add(cleanVersion);
          allDeps[name].packages.add(pkgName);
        });
      }
    });
  } catch (err) {
    console.error(`Warning: Could not parse ${pkgPath}:`, err.message);
  }
});

// Convert Sets to Arrays for JSON serialization
const result = {};
Object.entries(allDeps).forEach(([name, data]) => {
  result[name] = {
    versions: Array.from(data.versions).sort(),
    usedInPackages: Array.from(data.packages).sort()
  };
});

// Output JSON
console.log(JSON.stringify({
  totalPackages,
  totalDependencies: Object.keys(result).length,
  dependencies: result
}, null, 2));
