// _runner.js — shared boilerplate for the per-action skill scripts.
//
// Each script is a Node CLI that:
//   1) parses --flag=value pairs from argv,
//   2) loads the package's frontend-actions bundle,
//   3) hands control to a per-action `run({ args, actions })` callback,
//   4) prints the callback's return value as JSON to stdout on success,
//      or { error: <message> } to stderr on failure,
//   5) leaves the persistent Chrome process alive so subsequent scripts in
//      the same skill flow can attach via CDP.
//
// Only the explicit `stopRTA.js` script tears the browser down.

const path = require('node:path');

function parseArgs(argv) {
    const out = {};
    for (const a of argv.slice(2)) {
        const m = /^--([^=]+)=(.*)$/.exec(a);
        if (m) {
            out[m[1]] = m[2];
        }
    }
    return out;
}

function loadActions() {
    // Bundle lives at <pkgRoot>/dist/frontend-actions.js
    // This file lives at <pkgRoot>/skills/adp-rta-workflow/scripts/_runner.js
    const distPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'frontend-actions.js');
    return require(distPath);
}

async function runScript({ requiredArgs = [], usage, run }) {
    const args = parseArgs(process.argv);

    const missing = requiredArgs.filter((name) => args[name] === undefined);
    if (missing.length > 0) {
        process.stderr.write(`Usage: ${usage}\nMissing: ${missing.join(', ')}\n`);
        process.exit(2);
    }

    let actions;
    try {
        actions = loadActions();
    } catch (err) {
        const message = err && err.message ? err.message : String(err);
        process.stderr.write(
            JSON.stringify({ error: 'Failed to load frontend-actions bundle: ' + message }) + '\n'
        );
        process.exit(1);
    }

    try {
        const result = await run({ args, actions });
        process.stdout.write(JSON.stringify(result) + '\n');
        process.exit(0);
    } catch (err) {
        const message = err && err.message ? err.message : String(err);
        process.stderr.write(JSON.stringify({ error: message }) + '\n');
        process.exit(1);
    }
}

module.exports = { runScript };
