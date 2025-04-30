const { writeFile } = require('fs/promises');
const { join } = require('path');
const { getUI5Versions } = require('@sap-ux/ui5-info');

getUI5Versions({
    minSupportedUI5Version: '1.71',
    includeMaintained: true,
    onlyLatestPatchVersion: true
})
    .then((versions) => {
        'use strict';
        const maintenanceVersions = versions
            .filter((version) => version.maintained)
            .map((version) => version.version.replaceAll('.', '-'));
        return writeFile(join(__dirname, 'versions.json'), JSON.stringify(maintenanceVersions, null, 2));
    })
    .catch((error) => {
        'use strict';
        console.error('Error fetching UI5 versions:', error);
    });
