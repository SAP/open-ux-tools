module.exports = {
    process(sourceText) {
        'use strict';
        const escapedSrc = sourceText
            .replace(/\\/g, '\\\\')
            .replace(/\$(?=\{.*?\})/g, '\\$')
            .replace(/`/g, '\\`')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');

        return {
            code: `module.exports = \`${escapedSrc}\`;`
        };
    }
};
