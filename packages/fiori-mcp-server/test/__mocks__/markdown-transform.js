const { readFileSync } = require('fs');

module.exports = {
    process(sourceText, sourcePath) {
        // Read the actual markdown file content
        const content = readFileSync(sourcePath, 'utf-8');

        // Return as a CommonJS module that exports the content as default
        return {
            code: `module.exports = ${JSON.stringify(content)};`
        };
    }
};
