#!/usr/bin/env node
// getActions.js — list actions available for a control.
//
// Usage:
//   node getActions.js --site=<editor URL> --controlId=<id> [--frameId=<iframe id>]
//
// Output: JSON array of { id, label, payload }.

const { runScript } = require('./_runner');

runScript({
    requiredArgs: ['site', 'controlId'],
    usage: 'node getActions.js --site=<url> --controlId=<id> [--frameId=<id>]',
    run: async ({ args, actions }) => {
        return await actions.getActions({ site: args.site, frameId: args.frameId }, args.controlId);
    }
});
