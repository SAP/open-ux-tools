const axios = require('axios');
const fs = require('fs');

const schemaURL = 'https://raw.githubusercontent.com/SAP/ui5-tooling/gh-pages/schema/ui5.yaml.json';

/**
 * Downloads the UI5 yaml schema from the official repository and saves it to the dist folder.
 */
async function downloadUI5YamlSchema() {
    console.info('Downloading UI5 YAML schema...');
    const schema = await axios.get(schemaURL).then((response) => response.data);
    fs.mkdirSync('./dist/schema', { recursive: true });
    fs.writeFileSync('./dist/schema/ui5.yaml.json', JSON.stringify(schema, null, 2));
    console.info('UI5 YAML schema downloaded successfully.');
}

module.exports = downloadUI5YamlSchema();