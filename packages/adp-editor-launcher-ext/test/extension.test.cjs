// Copyright (c) 2026 SAP SE or an SAP affiliate company. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const extensionSource = readFileSync(join(__dirname, '../dist/extension.js'), 'utf8');
const SIGNAL_FILE = '/tmp/sap-ux-adp-editor.json';
const MANUAL_COMMAND = 'sap.ux.adp.openEditorInSimpleBrowser';
const URL = 'https://editor.example/test/adaptation-editor.html';
const OTHER_URL = 'https://other.example/test/adaptation-editor.html';

class TabInputWebview {
    constructor(viewType) {
        this.viewType = viewType;
    }
}

function makeTab(viewType = 'simpleBrowser.view') {
    return { label: 'Simple Browser', input: new TabInputWebview(viewType) };
}

function deferred() {
    let complete;
    const promise = new Promise((resolve) => {
        complete = resolve;
    });
    return { promise, resolve: complete };
}

function createHarness({ contents, tabs = [] } = {}) {
    const watchers = new Map();
    const registeredCommands = new Map();
    const subscriptions = [];
    const groups = [{ tabs: [...tabs], activeTab: tabs.at(-1) }];
    let activeGroup = groups[0];
    const calls = [];
    const closed = [];
    const errors = [];
    const warnings = [];
    const watched = [];
    const unwatched = [];
    let reads = 0;
    const harness = {
        calls,
        closed,
        errors,
        warnings,
        watched,
        unwatched,
        groups,
        subscriptions,
        registeredCommands,
        onShow: () => harness.show(makeTab()),
        onClose: () => undefined,
        get reads() {
            return reads;
        },
        show(tab, group = groups[0]) {
            if (!group.tabs.includes(tab)) {
                group.tabs.push(tab);
            }
            group.activeTab = tab;
            activeGroup = group;
        },
        writeSignal(command) {
            contents = JSON.stringify(command);
        },
        change(nextContents) {
            contents = nextContents;
            const listener = watchers.get(SIGNAL_FILE);
            assert.equal(typeof listener, 'function');
            return listener();
        },
        signal(command) {
            return this.change(JSON.stringify(command));
        },
        manual() {
            return registeredCommands.get(MANUAL_COMMAND)();
        }
    };
    const mocks = {
        vscode: {
            TabInputWebview,
            commands: {
                async executeCommand(command, url) {
                    calls.push({ command, url });
                    await harness.onShow(url);
                },
                registerCommand(command, callback) {
                    registeredCommands.set(command, callback);
                    return { dispose: () => registeredCommands.delete(command) };
                }
            },
            window: {
                tabGroups: {
                    all: groups,
                    get activeTabGroup() {
                        return activeGroup;
                    },
                    async close(tab, preserveFocus) {
                        assert.equal(preserveFocus, false);
                        closed.push(tab);
                        await harness.onClose(tab);
                        for (const group of groups) {
                            const index = group.tabs.indexOf(tab);
                            if (index !== -1) {
                                group.tabs.splice(index, 1);
                            }
                            if (group.activeTab === tab) {
                                group.activeTab = group.tabs.at(-1);
                            }
                        }
                        return true;
                    }
                },
                async showErrorMessage(message) {
                    errors.push(message);
                },
                async showWarningMessage(message) {
                    warnings.push(message);
                }
            }
        },
        'node:fs': {
            readFileSync(path, encoding) {
                assert.equal(path, SIGNAL_FILE);
                assert.equal(encoding, 'utf8');
                reads++;
                if (contents === undefined) {
                    throw new Error('ENOENT');
                }
                return contents;
            },
            watchFile(path, options, listener) {
                watched.push({ path, interval: options.interval });
                watchers.set(path, listener);
            },
            unwatchFile(path) {
                unwatched.push(path);
                watchers.delete(path);
            }
        },
        'node:path': require('node:path'),
        'node:os': { tmpdir: () => '/tmp' }
    };
    const module = { exports: {} };
    runInNewContext(
        extensionSource,
        {
            module,
            exports: module.exports,
            require(id) {
                assert.ok(Object.hasOwn(mocks, id), `Unexpected import: ${id}`);
                return mocks[id];
            }
        },
        { filename: join(__dirname, '../dist/extension.js') }
    );
    harness.extension = module.exports;
    harness.extension.activate({ subscriptions });
    return harness;
}

test('watches only one command file and opens with simpleBrowser.show, reading once per event', async () => {
    const harness = createHarness();
    assert.deepEqual(harness.watched, [{ path: SIGNAL_FILE, interval: 1000 }]);
    assert.equal(harness.reads, 1);

    await harness.signal({ command: 'open', url: URL, id: 'open' });

    assert.deepEqual(harness.calls, [{ command: 'simpleBrowser.show', url: URL }]);
    assert.equal(harness.reads, 2);
    assert.equal(harness.groups[0].tabs.length, 1);
});

test('ignores extra fields and does not order opaque IDs or consult timestamps', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'z', port: 8080, ts: 100 });
    await harness.signal({ command: 'open', url: OTHER_URL, id: 'a', ts: 0 });
    assert.deepEqual(
        harness.calls.map(({ url }) => url),
        [URL, OTHER_URL]
    );
});

test('deduplicates IDs across both commands, including nonconsecutive replays', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    await harness.signal({ command: 'close', url: URL, id: 'open' });
    assert.equal(harness.calls.length, 1);
    assert.equal(harness.closed.length, 0);

    await harness.signal({ command: 'close', url: URL, id: 'close' });
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    await harness.signal({ command: 'open', url: URL, id: 'close' });
    assert.equal(harness.calls.length, 1);
    assert.equal(harness.closed.length, 1);
});

test('closes only the owned tab for the exact URL, across groups', async () => {
    const unrelated = makeTab();
    const codeTab = { label: 'Code', input: {} };
    const harness = createHarness({ tabs: [unrelated, codeTab] });
    harness.groups.push({ tabs: [] });
    const owned = makeTab('mainThreadWebview-simpleBrowser.view');
    harness.onShow = () => harness.show(owned, harness.groups[1]);
    await harness.signal({ command: 'open', url: URL, id: 'open' });

    await harness.signal({ command: 'close', url: OTHER_URL, id: 'wrong-url' });
    await harness.signal({ command: 'close', url: `${URL}/`, id: 'not-exact' });
    assert.equal(harness.closed.length, 0);
    await harness.signal({ command: 'close', url: URL, id: 'close' });

    assert.deepEqual(harness.closed, [owned]);
    assert.deepEqual(harness.groups[0].tabs, [unrelated, codeTab]);
    assert.deepEqual(harness.groups[1].tabs, []);
});

test('tracks only the actual active tab reused by the built-in command', async () => {
    const unrelated = makeTab();
    const reused = makeTab();
    const harness = createHarness({ tabs: [reused, unrelated] });
    harness.onShow = () => harness.show(reused);
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    await harness.signal({ command: 'close', url: OTHER_URL, id: 'wrong-url' });
    await harness.signal({ command: 'close', url: URL, id: 'close' });
    assert.deepEqual(harness.closed, [reused]);
    assert.deepEqual(harness.groups[0].tabs, [unrelated]);
});

test('updates the tracked URL when a later open reuses the same tab', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'first-open' });
    const [previouslyOwned] = harness.groups[0].tabs;
    harness.onShow = () => harness.show(previouslyOwned);
    await harness.signal({ command: 'open', url: OTHER_URL, id: 'second-open' });
    await harness.signal({ command: 'close', url: URL, id: 'old-url' });
    assert.deepEqual(harness.closed, []);
    await harness.signal({ command: 'close', url: OTHER_URL, id: 'close' });
    assert.deepEqual(harness.closed, [previouslyOwned]);
    assert.deepEqual(harness.groups[0].tabs, []);
});

test('replaces the ownership record when a later open creates another tab', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'first-open' });
    const [previouslyOwned] = harness.groups[0].tabs;
    await harness.signal({ command: 'open', url: OTHER_URL, id: 'second-open' });
    const latest = harness.groups[0].tabs[1];
    await harness.signal({ command: 'close', url: URL, id: 'old-url' });
    await harness.signal({ command: 'close', url: OTHER_URL, id: 'close' });
    assert.deepEqual(harness.closed, [latest]);
    assert.deepEqual(harness.groups[0].tabs, [previouslyOwned]);
});

test('relinquishes ownership if a later open cannot identify a Simple Browser tab', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'first-open' });
    const [previouslyOwned] = harness.groups[0].tabs;
    const codeTab = { label: 'Code', input: {} };
    harness.onShow = () => harness.show(codeTab);
    await harness.signal({ command: 'open', url: OTHER_URL, id: 'second-open' });
    await harness.signal({ command: 'close', url: URL, id: 'old-url' });
    await harness.signal({ command: 'close', url: OTHER_URL, id: 'close' });
    assert.deepEqual(harness.closed, []);
    assert.deepEqual(harness.groups[0].tabs, [previouslyOwned, codeTab]);
});

test('does not mistake a replacement with the same label and view type for an owned tab', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    const replacement = makeTab();
    harness.groups[0].tabs.splice(0, 1, replacement);
    await harness.signal({ command: 'close', url: URL, id: 'close' });
    assert.deepEqual(harness.closed, []);
    assert.deepEqual(harness.groups[0].tabs, [replacement]);
});

test('does not own non-Simple-Browser tabs or misleading view-type suffixes', async () => {
    const harness = createHarness();
    harness.onShow = () => {
        harness.show(makeTab('another.view'));
        harness.show({ input: {} });
        harness.show(makeTab('unrelated-simpleBrowser.view'));
    };
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    await harness.signal({ command: 'close', url: URL, id: 'close' });
    assert.deepEqual(harness.closed, []);
});

test('leaves tabs alone when multiple newly created Simple Browser tabs make ownership ambiguous', async () => {
    const unrelated = makeTab();
    const harness = createHarness({ tabs: [unrelated] });
    harness.onShow = () => {
        harness.show(makeTab());
        harness.show(makeTab());
    };
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    await harness.signal({ command: 'close', url: URL, id: 'close' });
    assert.deepEqual(harness.closed, []);
    assert.equal(harness.groups[0].tabs.length, 3);
});

test('seeds existing open and close IDs at activation and prevents later replay', async (t) => {
    for (const command of ['open', 'close']) {
        await t.test(command, async () => {
            const existing = { command, url: URL, id: 'existing' };
            const restored = makeTab();
            const harness = createHarness({ contents: JSON.stringify(existing), tabs: [restored] });
            await harness.signal(existing);
            assert.deepEqual(harness.calls, []);
            assert.deepEqual(harness.closed, []);
            await harness.signal({ command: 'open', url: URL, id: 'fresh' });
            await harness.signal(existing);
            assert.equal(harness.calls.length, 1);
            assert.deepEqual(harness.closed, []);
            assert.ok(harness.groups[0].tabs.includes(restored));
        });
    }
});

test('accepts fresh IDs after a missing or malformed startup file', async (t) => {
    for (const contents of [undefined, '{']) {
        await t.test(String(contents), async () => {
            const harness = createHarness({ contents });
            await harness.signal({ command: 'open', url: URL, id: 'fresh' });
            assert.equal(harness.calls.length, 1);
        });
    }
});

test('ignores missing, partial, legacy, and malformed commands without consuming their ID', async () => {
    const harness = createHarness();
    const valid = { command: 'open', url: URL, id: 'valid' };
    const malformed = [
        undefined,
        '{',
        'null',
        '[]',
        '42',
        '{}',
        JSON.stringify({ ...valid, url: '' }),
        JSON.stringify({ ...valid, url: '  ' }),
        JSON.stringify({ ...valid, url: 42 }),
        JSON.stringify({ ...valid, url: undefined }),
        JSON.stringify({ ...valid, id: undefined }),
        JSON.stringify({ ...valid, id: 42 }),
        JSON.stringify({ ...valid, id: '' }),
        JSON.stringify({ ...valid, id: '  ' }),
        JSON.stringify({ ...valid, command: 'reload' }),
        JSON.stringify({ ...valid, command: null }),
        JSON.stringify({ ...valid, command: undefined }),
        JSON.stringify({ action: 'open', url: URL, ts: 1234 }),
        JSON.stringify({ url: URL, ts: 1234 })
    ];
    for (const contents of malformed) {
        await harness.change(contents);
    }
    assert.deepEqual(harness.calls, []);
    assert.deepEqual(harness.errors, []);
    await harness.signal(valid);
    assert.equal(harness.calls.length, 1);
});

test('malformed close signals do not close or relinquish the tracked tab', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    const [owned] = harness.groups[0].tabs;
    await harness.signal({ command: 'close', url: URL });
    await harness.change('{');
    assert.deepEqual(harness.closed, []);
    await harness.signal({ command: 'close', url: URL, id: 'close' });
    assert.deepEqual(harness.closed, [owned]);
});

test('serializes open, close, and another open while capturing each observed command once', async () => {
    const harness = createHarness();
    const started = deferred();
    const release = deferred();
    const closingStarted = deferred();
    const releaseClose = deferred();
    const owned = makeTab();
    harness.onShow = async () => {
        started.resolve();
        await release.promise;
        harness.show(owned);
    };
    const opening = harness.signal({ command: 'open', url: URL, id: 'open' });
    await started.promise;
    const closing = harness.signal({ command: 'close', url: URL, id: 'close' });
    const reopening = harness.signal({ command: 'open', url: OTHER_URL, id: 'reopen' });
    assert.equal(harness.closed.length, 0);
    assert.equal(harness.calls.length, 1);
    const replacement = makeTab();
    harness.onClose = async () => {
        closingStarted.resolve();
        await releaseClose.promise;
    };
    harness.onShow = () => harness.show(replacement);
    release.resolve();
    await closingStarted.promise;
    assert.equal(harness.calls.length, 1);
    releaseClose.resolve();
    await Promise.all([opening, closing, reopening]);
    assert.deepEqual(harness.closed, [owned]);
    assert.deepEqual(
        harness.calls.map(({ url }) => url),
        [URL, OTHER_URL]
    );
    assert.deepEqual(harness.groups[0].tabs, [replacement]);
    assert.equal(harness.reads, 4);
});

test('deduplicates notifications queued during an unfinished open', async () => {
    const harness = createHarness();
    const started = deferred();
    const release = deferred();
    harness.onShow = async () => {
        started.resolve();
        await release.promise;
    };
    const command = { command: 'open', url: URL, id: 'open' };
    const first = harness.signal(command);
    await started.promise;
    const duplicate = harness.signal(command);
    release.resolve();
    await Promise.all([first, duplicate]);
    assert.equal(harness.calls.length, 1);
});

test('reports command failures and continues processing later commands', async () => {
    const harness = createHarness();
    harness.onShow = () => {
        throw new Error('show failed');
    };
    await harness.signal({ command: 'open', url: URL, id: 'failed-open' });
    assert.match(harness.errors[0], /show failed/);
    await harness.signal({ command: 'open', url: URL, id: 'failed-open' });
    assert.equal(harness.calls.length, 1);
    harness.onShow = () => harness.show(makeTab());
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    harness.onClose = () => {
        throw new Error('close failed');
    };
    await harness.signal({ command: 'close', url: URL, id: 'failed-close' });
    assert.match(harness.errors[1], /close failed/);
    harness.onClose = () => undefined;
    await harness.signal({ command: 'close', url: URL, id: 'retry-close' });
    assert.deepEqual(harness.groups[0].tabs, []);
});

test('a failed later open relinquishes prior ownership rather than closing an unrelated tab', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: URL, id: 'open' });
    const [owned] = harness.groups[0].tabs;
    harness.onShow = () => {
        throw new Error('show failed');
    };
    await harness.signal({ command: 'open', url: OTHER_URL, id: 'failed-open' });
    await harness.signal({ command: 'close', url: URL, id: 'old-close' });
    await harness.signal({ command: 'close', url: OTHER_URL, id: 'close' });
    assert.deepEqual(harness.closed, []);
    assert.deepEqual(harness.groups[0].tabs, [owned]);
});

test('manual fallback warns if no valid URL is available', async () => {
    const harness = createHarness();
    await harness.manual();
    await harness.change('{');
    await harness.manual();
    await harness.signal({ command: 'close', url: URL, id: 'close' });
    await harness.manual();
    assert.equal(harness.warnings.length, 3);
    assert.deepEqual(harness.calls, []);
});

test('manual fallback can read an existing open signal without automatic startup replay', async () => {
    const existing = { command: 'open', url: URL, id: 'existing' };
    const harness = createHarness({ contents: JSON.stringify(existing) });
    assert.deepEqual(harness.calls, []);
    await harness.manual();
    await harness.signal(existing);
    assert.deepEqual(harness.calls, [{ command: 'simpleBrowser.show', url: URL }]);
});

test('manual fallback has no previous open to replay after activation on a close signal', async () => {
    const harness = createHarness({ contents: JSON.stringify({ command: 'close', url: URL, id: 'existing' }) });
    await harness.manual();
    assert.equal(harness.warnings.length, 1);
    assert.deepEqual(harness.calls, []);
});

test('manual fallback replays only the most recent open, never a close payload', async () => {
    const harness = createHarness();
    await harness.signal({ command: 'open', url: OTHER_URL, id: 'first-open' });
    await harness.signal({ command: 'open', url: URL, id: 'latest-open' });
    await harness.signal({ command: 'close', url: OTHER_URL, id: 'other-close' });
    await harness.manual();
    await harness.change('{');
    await harness.manual();
    assert.deepEqual(
        harness.calls.map(({ url }) => url),
        [OTHER_URL, URL, URL, URL]
    );
    assert.deepEqual(harness.closed, []);
});

test('manual fallback reads a fresh open file and consumes its ID before the next notification', async () => {
    const harness = createHarness();
    const fresh = { command: 'open', url: OTHER_URL, id: 'fresh' };
    harness.writeSignal(fresh);
    await harness.manual();
    await harness.signal(fresh);
    assert.deepEqual(harness.calls, [{ command: 'simpleBrowser.show', url: OTHER_URL }]);
    assert.equal(harness.reads, 3);
});

test('manual fallback is serialized with automatic commands', async () => {
    const harness = createHarness();
    const started = deferred();
    const release = deferred();
    harness.onShow = async () => {
        started.resolve();
        await release.promise;
    };
    const opening = harness.signal({ command: 'open', url: URL, id: 'open' });
    await started.promise;
    const closing = harness.signal({ command: 'close', url: OTHER_URL, id: 'close' });
    const manual = harness.manual();
    assert.equal(harness.calls.length, 1);
    harness.onShow = () => undefined;
    release.resolve();
    await Promise.all([opening, closing, manual]);
    assert.deepEqual(
        harness.calls.map(({ url }) => url),
        [URL, URL]
    );
});

test('disposal and deactivation unwatch only the command file without closing tabs', () => {
    const unrelated = makeTab();
    const harness = createHarness({ tabs: [unrelated] });
    for (const subscription of harness.subscriptions) {
        subscription.dispose();
    }
    harness.extension.deactivate();
    assert.deepEqual(harness.unwatched, [SIGNAL_FILE, SIGNAL_FILE]);
    assert.equal(harness.registeredCommands.size, 0);
    assert.deepEqual(harness.closed, []);
    assert.deepEqual(harness.groups[0].tabs, [unrelated]);
});
