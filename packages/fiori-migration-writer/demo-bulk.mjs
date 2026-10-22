#!/usr/bin/env node

/**
 * Bulk Migration Demo: Migrate multiple Fiori projects
 *
 * Usage:
 *   node demo-bulk.mjs [ui5-url]
 *
 * Example:
 *   node demo-bulk.mjs https://ui5.sap.com/1.120.0
 *
 * This demo migrates all test projects in the test/input directory.
 */

import { BulkProjectMigrator } from './dist/index.js';
import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const testInputDir = join(__dirname, 'test', 'input');
const ui5Url = process.argv[2] || 'https://ui5.sap.com';
const backendUrl = 'https://backend.example.com';

console.log('🚀 Bulk Fiori Migration Demo\n');
console.log('📂 Input Directory:', testInputDir);
console.log('🎨 UI5 URL:', ui5Url);
console.log('─'.repeat(60));

try {
    // Discover projects
    console.log('\n1️⃣  Discovering projects...');
    const entries = await readdir(testInputDir);
    const projects = [];

    for (const entry of entries) {
        const fullPath = join(testInputDir, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
            projects.push({
                rootPath: fullPath,
                hostname: backendUrl
            });
        }
    }

    console.log(`   Found ${projects.length} projects:`);
    projects.forEach((p, i) => {
        const name = p.rootPath.split('/').pop();
        console.log(`   ${i + 1}. ${name}`);
    });

    // Run bulk migration
    console.log('\n2️⃣  Running bulk migration...');
    const startTime = Date.now();

    const migrator = new BulkProjectMigrator();
    const results = await migrator.migrate(projects, ui5Url);

    const duration = Date.now() - startTime;

    // Analyze results
    console.log('─'.repeat(60));
    console.log('\n📊 Migration Results\n');

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
        const projectName = result.rootPath.split('/').pop();
        const status = result.result ? '✅' : '❌';

        if (result.result) {
            successCount++;
        } else {
            failureCount++;
        }

        console.log(`${status} ${projectName}`);

        if (result.messages && result.messages.length > 0) {
            result.messages.forEach((msg) => {
                console.log(`     ${msg}`);
            });
        }
    });

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('\n📈 Summary\n');
    console.log(`   Total Projects:  ${results.length}`);
    console.log(`   ✅ Successful:   ${successCount}`);
    console.log(`   ❌ Failed:       ${failureCount}`);
    console.log(`   ⏱️  Duration:     ${duration}ms`);
    console.log(`   ⚡ Avg/project:  ${Math.round(duration / results.length)}ms`);

    if (successCount === results.length) {
        console.log('\n🎉 All projects migrated successfully!');
    } else if (successCount > 0) {
        console.log('\n⚠️  Some projects failed to migrate');
    } else {
        console.log('\n❌ All projects failed to migrate');
        process.exit(1);
    }
} catch (error) {
    console.error('\n💥 Exception occurred:');
    console.error(error);
    process.exit(1);
}

console.log('\n' + '─'.repeat(60));
console.log('🎉 Demo complete!\n');
