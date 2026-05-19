#!/usr/bin/env node
// save.js — persist all RTA changes that have been applied so far.
//
// Usage:
//   node save.js --site=<editor URL> [--frameId=<iframe id>]
//
// Output: JSON boolean (true on success).

const { runScript } = require('./_runner');

runScript({
    requiredArgs: ['site'],
    usage: 'node save.js --site=<url> [--frameId=<id>]',
    run: async ({ args, actions }) => {
        return await actions.saveChanges({ site: args.site, frameId: args.frameId });
    }
});
