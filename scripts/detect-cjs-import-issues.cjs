#!/usr/bin/env node
/**
 * Script to detect potential ESM/CommonJS import issues
 *
 * This script checks for:
 * 1. ESM packages (type: "module") that import from CommonJS packages
 * 2. Named imports from CommonJS modules (which may fail at runtime in Node.js ESM)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES_DIR = 'packages';

// Known CommonJS packages that don't have "type": "module"
const knownCjsPackages = [
  '@sap/ux-specification',
  '@sap/cds',
  '@sap/cds-compiler',
  '@sap-devx/yeoman-ui-types',
];

function checkPackageType(packageName) {
  try {
    const pkgPath = execSync(`node -p "require.resolve('${packageName}/package.json')"`, {
      cwd: process.cwd(),
      encoding: 'utf8'
    }).trim();

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.type || 'commonjs';
  } catch (e) {
    return 'unknown';
  }
}

function findNamedImports(filePath, packageName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${packageName}['"]`, 'g');
  const typeRegex = new RegExp(`import\\s+type\\s+\\{([^}]+)\\}\\s+from\\s+['"]${packageName}['"]`, 'g');

  const namedImports = [];
  let match;

  // Find all named imports
  while ((match = regex.exec(content)) !== null) {
    namedImports.push({ line: content.substring(0, match.index).split('\n').length, imports: match[1].trim() });
  }

  // Remove type-only imports (these are fine)
  const typeMatches = [];
  while ((match = typeRegex.exec(content)) !== null) {
    typeMatches.push({ line: content.substring(0, match.index).split('\n').length });
  }

  return namedImports.filter(ni => !typeMatches.some(tm => tm.line === ni.line));
}

function scanPackages() {
  const results = {
    esmPackagesWithCjsDeps: {},
    potentialRuntimeIssues: []
  };

  const packages = fs.readdirSync(PACKAGES_DIR).filter(p => {
    const stat = fs.statSync(path.join(PACKAGES_DIR, p));
    return stat.isDirectory();
  });

  for (const pkg of packages) {
    const pkgJsonPath = path.join(PACKAGES_DIR, pkg, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    // Skip non-ESM packages
    if (pkgJson.type !== 'module') continue;

    // Check dependencies
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies
    };

    const cjsDeps = knownCjsPackages.filter(cjsPkg => allDeps[cjsPkg]);

    if (cjsDeps.length === 0) continue;

    results.esmPackagesWithCjsDeps[pkg] = cjsDeps;

    // Check for named value imports from these CJS packages
    const srcDir = path.join(PACKAGES_DIR, pkg, 'src');
    if (!fs.existsSync(srcDir)) continue;

    for (const cjsDep of cjsDeps) {
      const files = execSync(`grep -r "from '${cjsDep}'" ${srcDir} --files-with-matches 2>/dev/null || true`, {
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);

      for (const file of files) {
        const namedImports = findNamedImports(file, cjsDep);
        if (namedImports.length > 0) {
          results.potentialRuntimeIssues.push({
            package: pkg,
            file: file.replace(process.cwd() + '/', ''),
            cjsPackage: cjsDep,
            imports: namedImports
          });
        }
      }
    }
  }

  return results;
}

// Main execution
console.log('🔍 Scanning for ESM/CommonJS import issues...\n');

const results = scanPackages();

console.log('📦 ESM packages depending on CommonJS packages:');
console.log('================================================\n');

if (Object.keys(results.esmPackagesWithCjsDeps).length === 0) {
  console.log('✅ No ESM packages found with CommonJS dependencies\n');
} else {
  for (const [pkg, deps] of Object.entries(results.esmPackagesWithCjsDeps)) {
    console.log(`  ${pkg}:`);
    deps.forEach(dep => console.log(`    - ${dep}`));
  }
  console.log('');
}

console.log('\n⚠️  Potential runtime issues (named value imports from CommonJS):');
console.log('===================================================================\n');

if (results.potentialRuntimeIssues.length === 0) {
  console.log('✅ No potential runtime issues detected\n');
} else {
  for (const issue of results.potentialRuntimeIssues) {
    console.log(`  📄 ${issue.file}`);
    console.log(`     Package: ${issue.package}`);
    console.log(`     CommonJS import: ${issue.cjsPackage}`);
    issue.imports.forEach(imp => {
      console.log(`     Line ${imp.line}: import { ${imp.imports} }`);
    });
    console.log('');
  }

  console.log('\n💡 Recommendation:');
  console.log('   These imports may fail at runtime in Node.js ESM mode.');
  console.log('   Convert to: import pkgName from "package"; const { export1, export2 } = pkgName;\n');
}

console.log('\n📊 Summary:');
console.log(`   ESM packages with CJS deps: ${Object.keys(results.esmPackagesWithCjsDeps).length}`);
console.log(`   Files with potential issues: ${results.potentialRuntimeIssues.length}`);
