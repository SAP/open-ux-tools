#!/usr/bin/env node
// stopRTA.js — close the persistent browser process that started RTA.
//
// Usage:
//   node stopRTA.js
//
// This is the only script that tears the persistent Chrome process down.
// Other scripts (startRTA, getOverlays, ...) intentionally leave it alive
// so subsequent steps can reattach via CDP.

const { runScript } = require('./_runner');

runScript({
    usage: 'node stopRTA.js',
    run: async ({ actions }) => {
        await actions.stopBrowser();
        return { stopped: true };
    }
});
