#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Packages that should not have major version bumps
const BLOCKED_MAJOR_PACKAGES = [
    // '@sap-ux/eslint-plugin-fiori-tools'
];

const CHANGESET_DIR = path.join(__dirname, '..', '.changeset');

function validateChangesets() {
    const files = fs.readdirSync(CHANGESET_DIR);
    const changesetFiles = files.filter(f => f.endsWith('.md') && f !== 'README.md');
    
    const errors = [];
    
    for (const file of changesetFiles) {
        const filePath = path.join(CHANGESET_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            continue;
        }
        
        const frontmatter = yaml.parse(frontmatterMatch[1]);
        
        // Check each package in the changeset
        for (const [packageName, bumpType] of Object.entries(frontmatter)) {
            if (BLOCKED_MAJOR_PACKAGES.includes(packageName) && bumpType === 'major') {
                errors.push(
                    `❌ Major version bump blocked for ${packageName} in ${file}\n` +
                    `   Reason: This package is restricted from major version changes.\n` +
                    `   Please use 'minor' or 'patch' instead.`
                );
            }
        }
    }
    
    if (errors.length > 0) {
        console.error('\n🚫 Changeset validation failed:\n');
        errors.forEach(error => console.error(error + '\n'));
        process.exit(1);
    }
    
    console.log('✅ All changesets validated successfully');
}

validateChangesets();
