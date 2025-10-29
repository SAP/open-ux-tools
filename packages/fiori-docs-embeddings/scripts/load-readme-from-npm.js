const { writeFile} = require('node:fs/promises');
const { join } = require('node:path');

/**
 * Fetch the README of a specified npm package.
 *
 * @param packageName {string} - The name of the npm package.
 * @return {Promise<*|null>}
 */
async function getPackageReadme(packageName) {
    // Handle scoped packages by URL-encoding the slash
    const encodedName = packageName.replace('/', '%2F');
    const url = `https://registry.npmjs.org/${encodedName}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch package: ${response.statusText}`);
        }
        const data = await response.json();

        if (!data.readme) {
            console.warn(`Warning: Could not find README content for ${packageName}.`);
            return null;
        }

        return data.readme;
    } catch (error) {
        console.error(`Error fetching README for ${packageName}:`, error.message);
        return null;
    }
}

/**
 * Fetch the README for a package from npmjs.org and saves it to a local file.
 *
 * @param packageName {string} - The name of the npm package.
  */
async function fetchAndSaveReadme(packageName) {
    console.log(`Fetching README for ${packageName}...`);
    const readmeContent = await getPackageReadme(packageName);
    const outputFileName = `${packageName.split('/').pop()}-README.md`;

    if (readmeContent) {
        try {
            const outputPath = join('data_local', outputFileName);
            await writeFile(outputPath, readmeContent, 'utf-8');
            console.log(`Successfully saved README to './data_local'`);
        } catch (error) {
            console.error(`Error writing README file:`, error);
            process.exit(1);
        }
    } else {
        console.error(`Could not fetch README for ${packageName}.`);
        process.exit(1);
    }
}

const packageName = process.argv[2];
if (!packageName) {
    console.error('Please provide a package name as an argument.');
    process.exit(1);
}

void fetchAndSaveReadme(packageName);