'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': ['webapp/test/**/*.js', 'webapp/test/**/*.ts'],
            'excludedFiles': ['*.d.ts', '**/*.d.ts'],
            'extends': ['plugin:fiori-custom/fioriToolsTestcode']
        }
    ]
};
