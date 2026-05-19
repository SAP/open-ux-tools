#!/usr/bin/env node
// getContext.js — fetch context information for a control + action.
//
// Usage:
//   node getContext.js --site=<editor URL> --controlId=<id> --actionId=<id> \
//     [--frameId=<iframe id>]
//
// Output: JSON context object (viewName, controlType, aggregation info, ...).

const { runScript } = require('./_runner');

runScript({
    requiredArgs: ['site', 'controlId', 'actionId'],
    usage: 'node getContext.js --site=<url> --controlId=<id> --actionId=<id> [--frameId=<id>]',
    run: async ({ args, actions }) => {
        return await actions.getElementContext(
            { site: args.site, frameId: args.frameId },
            args.controlId,
            args.actionId
        );
    }
});
