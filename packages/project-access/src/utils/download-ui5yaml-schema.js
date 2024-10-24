const axios = require('axios');
const { create } = require('mem-fs-editor');
const { create: createStorage } = require('mem-fs');

const schemaURL = 'https://raw.githubusercontent.com/SAP/ui5-tooling/gh-pages/schema/ui5.yaml.json';

/**
 * Downloads the UI5 yaml schema from the official repository and saves it to the dist folder.
 */
async function downloadUI5YamlSchema() {
    console.info('Downloading UI5 yaml schema...');
    const memFs = create(createStorage());
    const schema = await axios.get(schemaURL).then((response) => response.data);
    memFs.write('./dist/schema/ui5.yaml.json', JSON.stringify(schema, null, 2));
    memFs.commit(() => {});
    console.info('UI5 yaml schema downloaded successfully.');
}

module.exports = downloadUI5YamlSchema();