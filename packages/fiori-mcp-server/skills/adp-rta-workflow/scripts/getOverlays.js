#!/usr/bin/env node
// getOverlays.js — list editable overlays exposed by the running RTA instance.
//
// Usage:
//   node getOverlays.js --site=<editor URL> [--frameId=<iframe element id>]
//
// Output: JSON array of { overlayId, controlId, label, controlType }.

const { runScript } = require('./_runner');

runScript({
    requiredArgs: ['site'],
    usage: 'node getOverlays.js --site=<url> [--frameId=<id>]',
    run: async ({ args, actions }) => {
        return await actions.getOverlays({ site: args.site, frameId: args.frameId });
    }
});
