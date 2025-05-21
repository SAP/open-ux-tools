/**
 * We need to set the global variable `requireFn` to the node `require` in order to be able to require modules in the UI5 environment
 */
global.requireFn = require;
