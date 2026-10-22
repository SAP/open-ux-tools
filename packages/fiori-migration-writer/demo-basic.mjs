#!/usr/bin/env node

/**
 * Basic Demo: Migrate a single Fiori project
 *
 * Usage:
 *   node demo-basic.mjs <project-path> [backend-url] [ui5-url]
 *
 * Example:
 *   node demo-basic.mjs ./test/input/reuse_library_project
 */

import { ProjectMigrator, createMemFsEditor } from './dist/index.js';
import { dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse arguments
const projectPath = process.argv[2];
const backendUrl = process.argv[3] || 'https://backend.example.com';
const ui5Url = process.argv[4] || 'https://ui5.sap.com';

if (!projectPath) {
    console.error('❌ Error: Project path required');
    console.log('\nUsage:');
    console.log('  node demo-basic.mjs <project-path> [backend-url] [ui5-url]');
    console.log('\nExample:');
    console.log('  node demo-basic.mjs ./test/input/reuse_library_project');
    process.exit(1);
}

console.log('🚀 Fiori Migration Writer Demo\n');
console.log('📁 Project:', projectPath);
console.log('🔗 Backend:', backendUrl);
console.log('🎨 UI5:', ui5Url);
console.log('─'.repeat(60));

try {
    // Create mem-fs editor (in-memory file system)
    console.log('\n1️⃣  Creating in-memory file system...');
    const fs = createMemFsEditor();

    // Run migration
    console.log('2️⃣  Running migration...');
    const startTime = Date.now();

    const {
        fs: updatedFs,
        result,
        messages
    } = await ProjectMigrator.migrate(
        projectPath,
        backendUrl,
        ui5Url,
        undefined, // project info
        undefined, // vscode context
        false, // internal flag
        fs
    );

    const duration = Date.now() - startTime;

    // Show results
    console.log('─'.repeat(60));

    if (result) {
        console.log('\n✅ Migration Successful!\n');
        console.log(`⏱️  Duration: ${duration}ms`);

        if (messages && messages.length > 0) {
            console.log('\n📝 Messages:');
            messages.forEach((msg) => {
                // Handle both string and object messages
                const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
                console.log(`   ${msgStr}`);
            });
        }

        console.log('\n📦 Changes (in-memory):');
        const changes = updatedFs.dump();
        Object.keys(changes).forEach((filePath) => {
            if (filePath.startsWith(projectPath)) {
                const relativePath = filePath.substring(projectPath.length + 1);
                console.log(`   - ${relativePath}`);
            }
        });

        console.log('\n💡 Tip: Changes are in-memory. Use commit() to write to disk.');
        console.log('   Example:');
        console.log('     updatedFs.commit((err) => {');
        console.log('         if (err) console.error(err);');
        console.log('         else console.log("Written to disk!");');
        console.log('     });');
    } else {
        console.log('\n❌ Migration Failed\n');

        if (messages && messages.length > 0) {
            console.log('Error messages:');
            messages.forEach((msg) => {
                // Handle both string and object messages
                const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
                console.log(`   ⚠️  ${msgStr}`);
            });
        }

        process.exit(1);
    }
} catch (error) {
    console.error('\n💥 Exception occurred:');
    console.error(error);
    process.exit(1);
}

console.log('\n' + '─'.repeat(60));
console.log('🎉 Demo complete!\n');
