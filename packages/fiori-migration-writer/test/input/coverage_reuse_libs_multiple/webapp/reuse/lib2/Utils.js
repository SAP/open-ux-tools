sap.ui.define(['sap/ui/base/Object'], function (BaseObject) {
    'use strict';

    return BaseObject.extend('com.example.reuse.lib2.Utils', {
        formatValue: function (value) {
            return value ? value.toString() : '';
        }
    });
});
