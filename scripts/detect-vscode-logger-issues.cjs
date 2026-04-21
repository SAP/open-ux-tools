#!/usr/bin/env node
/**
 * Script to detect @vscode-logging/logger CommonJS import issues across the monorepo.
 *
 * The @vscode-logging/logger package is a CommonJS module that exports named exports.
 * In ESM mode with NodeNext, attempting to import it as default will fail at runtime.
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

// Get all package directories
const packagesDir = path.join(__dirname, '..', 'packages');
const packageDirs = fs.readdirSync(packagesDir)
    .filter(dir => fs.statSync(path.join(packagesDir, dir)).isDirectory())
    .map(dir => path.join(packagesDir, dir));

console.log(`\nScanning ${packageDirs.length} packages for @vscode-logging/logger imports...\n`);

const results = {
    packagesWithDependency: [],
    filesWithImports: []
};

for (const pkgDir of packageDirs) {
    const pkgJsonPath = path.join(pkgDir, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const pkgName = pkgJson.name;

    // Check if package has @vscode-logging/logger dependency
    const hasDep = (pkgJson.dependencies && pkgJson.dependencies['@vscode-logging/logger']) ||
                   (pkgJson.devDependencies && pkgJson.devDependencies['@vscode-logging/logger']);

    if (!hasDep) continue;

    results.packagesWithDependency.push(pkgName);

    // Find all TS files that import from @vscode-logging/logger
    const srcDir = path.join(pkgDir, 'src');
    const testDir = path.join(pkgDir, 'test');

    const searchDirs = [];
    if (fs.existsSync(srcDir)) searchDirs.push(srcDir);
    if (fs.existsSync(testDir)) searchDirs.push(testDir);

    for (const searchDir of searchDirs) {
        try {
            const grepCmd = `grep -r "from '@vscode-logging/logger'" "${searchDir}" --include="*.ts" --include="*.js" 2>/dev/null || true`;
            const output = execSync(grepCmd, {encoding: 'utf8'});

            if (output.trim()) {
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    const [filePath, ...importParts] = line.split(':');
                    const importLine = importParts.join(':').trim();

                    // Check if it's a default import pattern
                    const isDefaultImport = /import\s+\w+\s+from\s+'@vscode-logging\/logger'/.test(importLine);
                    const isNamedImport = /import\s*\{[^}]+\}\s*from\s+'@vscode-logging\/logger'/.test(importLine);
                    const isTypeOnly = /import\s+type/.test(importLine);

                    if (isDefaultImport && !isTypeOnly) {
                        results.filesWithImports.push({
                            package: pkgName,
                            file: path.relative(pkgDir, filePath),
                            line: importLine,
                            issue: 'default_import',
                            needsFix: true
                        });
                    } else if (isNamedImport && !isTypeOnly) {
                        results.filesWithImports.push({
                            package: pkgName,
                            file: path.relative(pkgDir, filePath),
                            line: importLine,
                            issue: 'named_import',
                            needsFix: false
                        });
                    }
                }
            }
        } catch (err) {
            // Ignore errors from grep
        }
    }
}

console.log(`Found ${results.packagesWithDependency.length} packages with @vscode-logging/logger dependency\n`);

if (results.filesWithImports.length > 0) {
    console.log(`\n=== Files with @vscode-logging/logger imports (${results.filesWithImports.length}) ===\n`);

    const byPackage = {};
    for (const item of results.filesWithImports) {
        if (!byPackage[item.package]) {
            byPackage[item.package] = [];
        }
        byPackage[item.package].push(item);
    }

    for (const [pkgName, files] of Object.entries(byPackage)) {
        const filesNeedingFix = files.filter(f => f.needsFix);
        console.log(`\n${pkgName} (${files.length} files, ${filesNeedingFix.length} need fixes):`);
        for (const file of files) {
            const marker = file.needsFix ? '❌' : '✅';
            console.log(`  ${marker} ${file.file}`);
            console.log(`     ${file.line}`);
            console.log(`     Issue: ${file.issue}`);
        }
    }

    const totalNeedingFix = results.filesWithImports.filter(f => f.needsFix).length;
    console.log(`\n\n=== Summary ===`);
    console.log(`Total files importing @vscode-logging/logger: ${results.filesWithImports.length}`);
    console.log(`Files needing fixes (default imports): ${totalNeedingFix}`);
    console.log(`\nFix pattern:`);
    console.log(`  Before: import vscodeLogging from '@vscode-logging/logger';`);
    console.log(`  After:  import * as vscodeLogging from '@vscode-logging/logger';`);
} else {
    console.log('✅ No files found importing @vscode-logging/logger');
}
