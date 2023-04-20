'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': ['webapp/test/**'],
            'extends': ['plugin:fiori-custom/fioriToolsTestcode']
        }
    ]
};
