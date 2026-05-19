#!/usr/bin/env node
// callAction.js — execute an RTA action on a control with a prepared payload.
//
// Usage:
//   node callAction.js --site=<editor URL> --controlId=<id> --actionId=<id> \
//     --payload='<json>' [--frameId=<iframe id>]
//
// `--payload` must be a JSON string (object). Example:
//   --payload='{"newLabel":"Foo"}'
//
// Output: JSON boolean (true on success).

const { runScript } = require('./_runner');

runScript({
    requiredArgs: ['site', 'controlId', 'actionId', 'payload'],
    usage:
        'node callAction.js --site=<url> --controlId=<id> --actionId=<id> ' +
        "--payload='<json>' [--frameId=<id>]",
    run: async ({ args, actions }) => {
        let payload;
        try {
            payload = JSON.parse(args.payload);
        } catch (err) {
            throw new Error(`--payload is not valid JSON: ${err.message}`);
        }
        if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
            throw new Error('--payload must be a JSON object');
        }
        return await actions.executeAction(
            { site: args.site, frameId: args.frameId },
            args.controlId,
            args.actionId,
            payload
        );
    }
});
