#!/usr/bin/env node
/**
 * Updates ui5-version-fallback.ts with the latest UI5 version data from ui5.sap.com.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OFFICIAL_URL = 'https://ui5.sap.com';
const VERSION_OVERVIEW_FILE = 'versionoverview.json';

async function updateUI5VersionFallback() {
    const versionOverviewUrl = `${OFFICIAL_URL}/${VERSION_OVERVIEW_FILE}`;
    const fallbackFilePath = path.join(__dirname, '..', 'src', 'ui5-version-fallback.ts');

    try {
        const response = await axios.get(versionOverviewUrl);
        const data = response.data;

        if (!data.versions || !Array.isArray(data.versions)) {
            return { success: false, error: 'Invalid versionoverview.json: missing versions array' };
        }

        // Filter and map versions with support status
        const filteredVersions = data.versions
            .filter((v) => v.version && v.support)
            .map((v) => {
                const supportLower = v.support.toLowerCase();
                if (supportLower === 'maintenance') {
                    return { version: v.version, support: 'supportState.maintenance' };
                } else if (supportLower === 'out of maintenance') {
                    return { version: v.version, support: 'supportState.outOfMaintenance' };
                }
                return null;
            })
            .filter(Boolean);

        let content = fs.readFileSync(fallbackFilePath, 'utf8');

        // Generate new array content with proper formatting (4-space indent)
        const formatEntry = (v) =>
            ['    {', `        version: '${v.version}',`, `        support: ${v.support}`, '    }'].join('\n');
        const newArray = [
            'export const ui5VersionFallbacks = [',
            filteredVersions.map(formatEntry).join(',\n'),
            '] as UI5VersionSupport[];'
        ].join('\n');

        // Check if content would change
        const arrayRegex = /export const ui5VersionFallbacks = \[[\s\S]*?\] as UI5VersionSupport\[\];/;
        const currentArray = content.match(arrayRegex)?.[0];

        if (currentArray === newArray) {
            return { success: true, versionsCount: filteredVersions.length };
        }

        // Update the comment with fresh date
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        content = content.replace(
            /\/\/ Updated .+ from https:\/\/ui5\.sap\.com\/versionoverview\.json/,
            `// Updated ${today} from ${versionOverviewUrl}`
        );
        content = content.replace(arrayRegex, newArray);

        fs.writeFileSync(fallbackFilePath, content);
        return { success: true, versionsCount: filteredVersions.length };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

updateUI5VersionFallback().then((result) => {
    console.log(result);
    process.exit(result.success ? 0 : 1);
});
