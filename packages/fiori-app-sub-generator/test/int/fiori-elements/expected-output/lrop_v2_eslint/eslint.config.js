const { defineConfig } = require('eslint/config');

const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
    ...fioriTools.config.defaultJS,
    {
        plugins: {
            'fiori-custom': fioriTools // backward compatibility
        }
    }
]);
