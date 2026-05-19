#!/usr/bin/env node
// startRTA.js — start Runtime Authoring on the page hosting --site.
//
// Usage:
//   node startRTA.js --site=<editor URL> [--frameId=<iframe element id>]
//
// Output: JSON { rtaStarted: boolean } on stdout.
// Exit:   0 on success, 1 on runtime failure, 2 on usage error.
//
// The browser is left running for subsequent skill steps (use stopRTA.js to
// tear it down).

const { runScript } = require('./_runner');

runScript({
    requiredArgs: ['site'],
    usage: 'node startRTA.js --site=<url> [--frameId=<id>]',
    run: async ({ args, actions }) => {
        return await actions.startRta({ site: args.site, frameId: args.frameId });
    }
});
