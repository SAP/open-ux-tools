'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': ['webapp/test/**/*.js', 'webapp/test/**/*.ts'],
            'extends': ['plugin:fiori-custom/fioriToolsTestcode']
        }
    ]
};
