#!/usr/bin/env node
/**
 * Check latest versions for all collected dependencies
 * Analyzes update types (major/minor/patch) and age
 */

const fs = require('fs');
const { execSync } = require('child_process');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node check-dependency-versions.js <collected-deps.json>');
  process.exit(1);
}

const collectedData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const dependencies = Object.entries(collectedData.dependencies);

console.error(`Processing ${dependencies.length} dependencies...`);

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
}

function getVersionInfo(packageName, currentVersion) {
  try {
    const output = execSync(`npm view ${packageName}@${currentVersion} time --json 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const timeData = JSON.parse(output);
    const publishDate = timeData[currentVersion];
    return { publishDate };
  } catch {
    return { publishDate: null };
  }
}

function getLatestVersion(packageName) {
  try {
    const output = execSync(`npm view ${packageName} version 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.trim();
  } catch {
    return null;
  }
}

function getChangelogUrl(packageName) {
  try {
    const output = execSync(`npm view ${packageName} repository.url 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const repoUrl = output.trim().replace(/^git\+/, '').replace(/\.git$/, '');
    return repoUrl || null;
  } catch {
    return null;
  }
}

function determineUpdateType(current, latest) {
  const curr = parseVersion(current);
  const lat = parseVersion(latest);

  if (!curr || !lat) return 'UNKNOWN';

  if (lat.major > curr.major) return 'MAJOR';
  if (lat.minor > curr.minor) return 'MINOR';
  if (lat.patch > curr.patch) return 'PATCH';
  return 'NONE';
}

function getStatusColor(updateType, isOlderThan6Months) {
  // Traffic light colors:
  // 🟢 GREEN - Up to date or patch updates
  // 🟡 YELLOW - Minor updates or recent major updates
  // 🔴 RED - Old major updates (>6 months) or unknown

  if (updateType === 'NONE') {
    return 'green';
  } else if (updateType === 'PATCH') {
    return 'green';
  } else if (updateType === 'MINOR') {
    return 'yellow';
  } else if (updateType === 'MAJOR') {
    return isOlderThan6Months ? 'red' : 'yellow';
  } else {
    return 'red';
  }
}

function getStatusEmoji(color) {
  switch (color) {
    case 'green': return '🟢';
    case 'yellow': return '🟡';
    case 'red': return '🔴';
    default: return '⚪';
  }
}

function getAge(publishDate) {
  if (!publishDate) return null;

  const pub = new Date(publishDate);
  const now = new Date(); // Use current system date
  const diffMs = now - pub;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  let ageString;
  if (diffYears > 0) {
    ageString = `${diffYears} year${diffYears > 1 ? 's' : ''} old`;
  } else if (diffMonths > 0) {
    ageString = `${diffMonths} month${diffMonths > 1 ? 's' : ''} old`;
  } else {
    ageString = `${diffDays} day${diffDays > 1 ? 's' : ''} old`;
  }

  return {
    publishDate: pub.toISOString().split('T')[0],
    ageString,
    isOlderThan6Months: diffMonths >= 6
  };
}

const results = [];
let processed = 0;
let majorUpdates = 0;
let minorUpdates = 0;
let patchUpdates = 0;
let upToDate = 0;
let olderThan6Months = 0;
let multipleVersions = 0;

for (const [name, data] of dependencies) {
  processed++;
  if (processed % 20 === 0) {
    console.error(`Progress: ${processed}/${dependencies.length}`);
  }

  const currentVersion = data.versions[0]; // Use first version
  const hasMultipleVersions = data.versions.length > 1;
  if (hasMultipleVersions) multipleVersions++;

  try {
    const latestVersion = getLatestVersion(name);
    const versionInfo = getVersionInfo(name, currentVersion);
    const ageInfo = getAge(versionInfo.publishDate);
    const updateType = latestVersion ? determineUpdateType(currentVersion, latestVersion) : 'UNKNOWN';
    const changelogUrl = getChangelogUrl(name);

    if (updateType === 'MAJOR') majorUpdates++;
    else if (updateType === 'MINOR') minorUpdates++;
    else if (updateType === 'PATCH') patchUpdates++;
    else if (updateType === 'NONE') upToDate++;

    if (ageInfo && ageInfo.isOlderThan6Months) olderThan6Months++;

    const statusColor = getStatusColor(updateType, ageInfo ? ageInfo.isOlderThan6Months : false);
    const statusEmoji = getStatusEmoji(statusColor);

    let recommendedAction = 'Optional';
    if (updateType === 'MAJOR') {
      recommendedAction = ageInfo && ageInfo.isOlderThan6Months ? 'Review required' : 'Should update';
    } else if (updateType === 'MINOR') {
      recommendedAction = 'Should update';
    } else if (updateType === 'PATCH') {
      recommendedAction = 'Safe to update';
    } else if (updateType === 'NONE') {
      recommendedAction = 'Up to date';
    } else {
      recommendedAction = 'Manual check required';
    }

    results.push({
      name,
      currentVersion,
      latestVersion: latestVersion || 'unknown',
      currentVersionAge: ageInfo ? `${ageInfo.publishDate} (${ageInfo.ageString})` : 'unknown',
      isOlderThan6Months: ageInfo ? ageInfo.isOlderThan6Months : false,
      updateType,
      status: statusColor,
      statusEmoji,
      usedInPackages: data.usedInPackages,
      changelogUrl,
      recommendedAction,
      hasMultipleVersions,
      allVersionsUsed: data.versions
    });
  } catch (err) {
    console.error(`Error processing ${name}:`, err.message);
    results.push({
      name,
      currentVersion,
      latestVersion: 'error',
      currentVersionAge: 'unknown',
      isOlderThan6Months: false,
      updateType: 'UNKNOWN',
      status: 'red',
      statusEmoji: '🔴',
      usedInPackages: data.usedInPackages,
      changelogUrl: null,
      recommendedAction: 'Manual check required',
      hasMultipleVersions,
      allVersionsUsed: data.versions
    });
  }
}

// Output final report
const report = {
  generatedDate: new Date().toISOString().split('T')[0],
  analysisScope: 'All dependencies (including @sap-ux/* packages)',
  summary: {
    totalPackages: collectedData.totalPackages,
    totalUniqueExternalDependencies: dependencies.length,
    dependenciesOlderThan6Months: olderThan6Months,
    majorUpdates,
    minorUpdates,
    patchUpdates,
    upToDate,
    multipleVersionsUsed: multipleVersions
  },
  dependencies: results
};

console.log(JSON.stringify(report, null, 2));
