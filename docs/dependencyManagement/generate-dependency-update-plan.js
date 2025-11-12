#!/usr/bin/env node
/**
 * Generate Dependency Update Plan
 * This script analyzes all dependencies in the pnpm workspace and generates
 * a comprehensive update plan in markdown format
 *
 * Usage:
 *   node generate-dependency-update-plan.js [--skip-version-check] [--check-unused] [--skip-knip]
 *
 * Options:
 *   --skip-version-check  Skip updating version-report.json in step 2 (use existing file)
 *   --check-unused        Check for unused dependencies using depcheck
 *   --skip-knip           Skip Knip unused dependencies check (runs by default)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const SCRIPT_DIR = __dirname;
const ROOT_DIR = path.join(SCRIPT_DIR, '../..');
const OUTPUT_DIR = SCRIPT_DIR;

// Parse command line arguments
const args = process.argv.slice(2);
const skipVersionCheck = args.includes('--skip-version-check');
const checkUnused = args.includes('--check-unused');
const skipKnip = args.includes('--skip-knip');
const runKnip = !skipKnip;

console.log('🔍 Generating Dependency Update Plan...');
console.log(`   Root: ${ROOT_DIR}`);
console.log(`   Output: ${OUTPUT_DIR}/DEPENDENCY_UPDATE_PLAN.md`);
if (checkUnused) {
  console.log('   Unused dependency check (depcheck): enabled');
}
if (runKnip) {
  console.log('   Unused dependency check (knip): enabled');
}
console.log('');

async function main() {
  let totalSteps = 3;
  if (checkUnused) totalSteps++;
  if (runKnip) totalSteps++;

  // Step 1: Collect all dependencies
  console.log(`📦 Step 1/${totalSteps}: Collecting dependencies from workspace...`);
  const collectedDepsPath = path.join(OUTPUT_DIR, 'collected-deps.json');

  execSync(`node "${path.join(SCRIPT_DIR, 'collect-dependencies.js')}" > "${collectedDepsPath}"`, {
    cwd: ROOT_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8'
  });

  const collectedData = JSON.parse(fs.readFileSync(collectedDepsPath, 'utf8'));
  const totalDeps = Object.keys(collectedData.dependencies).length;
  console.log(`   Found ${totalDeps} unique external dependencies`);
  console.log('');

  // Step 2: Check versions and analyze updates
  const versionReportPath = path.join(OUTPUT_DIR, 'version-report.json');
  let shouldUpdateVersionReport = !skipVersionCheck;

  // If no flag provided and version-report.json exists, ask user
  if (!skipVersionCheck && fs.existsSync(versionReportPath)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('📋 version-report.json already exists. Update it? (y/n) [y]: ', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() || 'y');
      });
    });

    shouldUpdateVersionReport = answer === 'y' || answer === 'yes';
  }

  if (shouldUpdateVersionReport) {
    console.log('🔎 Step 2/3: Checking latest versions and analyzing updates...');
    console.log(`   (This may take 3-5 minutes for ${totalDeps} dependencies...)`);

    try {
      const output = execSync(
        `node "${path.join(SCRIPT_DIR, 'check-dependency-versions.js')}" "${collectedDepsPath}"`,
        {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          stdio: ['inherit', 'pipe', 'pipe']
        }
      );
      fs.writeFileSync(versionReportPath, output);
    } catch (err) {
      // Even if there are errors, partial output might be written to stderr/stdout
      if (err.stdout) {
        fs.writeFileSync(versionReportPath, err.stdout);
      } else {
        throw err;
      }
    }

    console.log('   ✓ Version analysis complete');
  } else {
    console.log('⏭️  Step 2/3: Skipping version check (using existing version-report.json)...');
    if (!fs.existsSync(versionReportPath)) {
      throw new Error(`version-report.json not found at ${versionReportPath}`);
    }
    console.log('   ✓ Using existing version report');
  }
  console.log('');

  // Step 3: Check for unused dependencies with depcheck (optional)
  let currentStep = 3;
  let unusedDepsReport = null;
  if (checkUnused) {
    console.log(`🧹 Step ${currentStep}/${totalSteps}: Checking for unused dependencies with depcheck...`);
    console.log('   (This may take several minutes...)\n');
    const unusedDepsPath = path.join(OUTPUT_DIR, 'unused-dependencies.json');

    try {
      const output = execSync(
        `node "${path.join(SCRIPT_DIR, 'check-unused-dependencies.js')}"`,
        {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          stdio: ['inherit', 'pipe', 'pipe']
        }
      );
      fs.writeFileSync(unusedDepsPath, output);
      unusedDepsReport = JSON.parse(output);
      console.log(`   ✓ Unused dependencies check complete`);
      console.log(`   Packages with issues: ${unusedDepsReport.packagesWithIssues}/${unusedDepsReport.totalPackages}`);
    } catch (err) {
      console.log(`   ⚠️  Warning: Unused dependency check failed: ${err.message}`);
    }
    console.log('');
    currentStep++;
  }

  // Step 3 or 4: Check for unused dependencies with Knip (optional)
  let knipReport = null;
  if (runKnip) {
    console.log(`🔍 Step ${currentStep}/${totalSteps}: Checking for unused dependencies with Knip...`);
    console.log('   (This may take several minutes...)\n');
    const knipReportPath = path.join(OUTPUT_DIR, 'knip-report.json');

    try {
      // Try to import and run Knip programmatically
      let knipModule;
      let moduleLoaded = false;

      try {
        // Try to dynamically import knip from node_modules
        knipModule = require(path.join(ROOT_DIR, 'node_modules', 'knip'));
        moduleLoaded = true;
        console.log('   Using Knip from node_modules...');
      } catch (requireErr) {
        // Not in node_modules, will use npx
      }

      if (moduleLoaded && typeof knipModule === 'function') {
        // Run Knip programmatically
        const { main } = knipModule;
        const result = await main({
          cwd: ROOT_DIR,
          reporter: 'json',
          isProduction: false,
          includeDependencies: true
        });

        const output = JSON.stringify(result, null, 2);
        fs.writeFileSync(knipReportPath, output);
        knipReport = result;
      } else {
        // Fall back to npx
        console.log('   Running Knip via npx (this will take a few minutes)...');

        // Run knip and save output to file directly
        execSync(
          `npx -y knip --reporter json --dependencies > "${knipReportPath}" 2>&1`,
          {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'inherit',
            shell: true
          }
        );

        // Read the generated file
        if (fs.existsSync(knipReportPath)) {
          const fileContent = fs.readFileSync(knipReportPath, 'utf8');
          // Try to parse as JSON, handling potential non-JSON output
          try {
            knipReport = JSON.parse(fileContent);
          } catch (parseErr) {
            console.log(`   ⚠️  Could not parse Knip JSON output`);
            knipReport = null;
          }
        }
      }

      // Calculate summary
      if (knipReport) {
        const issuesCount = (knipReport.issues || []).length;
        const filesCount = (knipReport.files || []).length;
        console.log(`   ✓ Knip analysis complete`);
        console.log(`   Files analyzed: ${filesCount}`);
        console.log(`   Issues found: ${issuesCount}`);
      } else {
        console.log(`   ⚠️  Knip analysis completed but results could not be parsed`);
      }
    } catch (err) {
      console.log(`   ⚠️  Warning: Knip check failed`);
      if (err.message) {
        console.log(`   Error: ${err.message.split('\n')[0]}`);
      }
      console.log(`   Tip: Knip is available via npx, no installation needed`);
    }
    console.log('');
    currentStep++;
  }

  // Step 3 or 4 or 5: Generate markdown plan
  console.log(`📝 Step ${currentStep}/${totalSteps}: Generating markdown plan...`);
  const markdownPath = path.join(OUTPUT_DIR, 'DEPENDENCY_UPDATE_PLAN.md');

  execSync(
    `node "${path.join(SCRIPT_DIR, 'create-dependency-plan-markdown.js')}" "${versionReportPath}" "${markdownPath}"`,
    {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    }
  );

  console.log('   ✓ Markdown plan generated');
  console.log('');

  // Summary
  const report = JSON.parse(fs.readFileSync(versionReportPath, 'utf8'));
  const { majorUpdates, minorUpdates, patchUpdates, dependenciesOlderThan6Months } = report.summary;

  console.log('✅ Dependency Update Plan Generated!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total Dependencies: ${totalDeps}`);
  console.log(`   Older than 6 months: ${dependenciesOlderThan6Months}`);
  console.log(`   Major updates: ${majorUpdates}`);
  console.log(`   Minor updates: ${minorUpdates}`);
  console.log(`   Patch updates: ${patchUpdates}`);
  if (unusedDepsReport) {
    console.log(`   Packages with unused deps (depcheck): ${unusedDepsReport.packagesWithIssues}`);
  }
  if (knipReport) {
    const issuesCount = (knipReport.issues || []).length;
    console.log(`   Issues found (Knip): ${issuesCount}`);
  }
  console.log('');
  console.log(`📄 Plan saved to: ${markdownPath}`);
  console.log(`📄 JSON report: ${versionReportPath}`);
  if (unusedDepsReport) {
    console.log(`📄 Unused deps report (depcheck): ${path.join(OUTPUT_DIR, 'unused-dependencies.json')}`);
  }
  if (knipReport) {
    console.log(`📄 Knip report: ${path.join(OUTPUT_DIR, 'knip-report.json')}`);
  }
  console.log('');

  // Cleanup intermediate file
  if (fs.existsSync(collectedDepsPath)) {
    fs.unlinkSync(collectedDepsPath);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('');
  console.error('❌ Error generating dependency update plan:');
  console.error(err.message);
  console.error('');
  process.exit(1);
});
