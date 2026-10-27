import { commands, window, TabInputWebview, type Tab, type ExtensionContext } from 'vscode';
import { watchFile, unwatchFile, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Shared mailbox for open/close requests with opaque, unique IDs. */
const SIGNAL_FILE = join(tmpdir(), 'sap-ux-adp-editor.json');

/** Built-in command contributed by the `simple-browser` extension. */
const SIMPLE_BROWSER_SHOW = 'simpleBrowser.show';

/** Webview view type the Simple Browser extension uses for its tabs. */
const SIMPLE_BROWSER_VIEW_TYPE = 'simpleBrowser.view';

/** Maximum time to wait for the workbench to report the opened tab. */
const TAB_WAIT_MS = 3000;

interface EditorCommand {
    command: 'open' | 'close';
    url: string;
    id: string;
}

/** Only the tab identified after our latest open command may be closed. */
let ownedEditor: { tab: Tab; url: string } | undefined;
let latestOpen: EditorCommand | undefined;
const handledIds = new Set<string>();
let signalQueue = Promise.resolve();

/**
 * Finds a unique new Simple Browser tab, or the active reused one.
 *
 * @param previousTabs - Tabs that existed before the open command.
 * @returns The identified tab, or undefined if none or ambiguous.
 */
function identifyTab(previousTabs: Set<Tab>): Tab | undefined {
    const browserTabs = window.tabGroups.all
        .flatMap((group) => group.tabs)
        .filter(
            (candidate) =>
                candidate.input instanceof TabInputWebview &&
                (candidate.input.viewType === SIMPLE_BROWSER_VIEW_TYPE ||
                    candidate.input.viewType === `mainThreadWebview-${SIMPLE_BROWSER_VIEW_TYPE}`)
        );
    const newTabs = browserTabs.filter((candidate) => !previousTabs.has(candidate));
    const active = window.tabGroups.activeTabGroup.activeTab;
    if (newTabs.length === 1) {
        return newTabs[0];
    }
    if (newTabs.length === 0 && active && browserTabs.includes(active)) {
        return active;
    }
    return undefined;
}

/**
 * Waits until the opened tab can be identified, or the bounded wait ends.
 *
 * @param previousTabs - Tabs that existed before the open command.
 * @returns The identified tab, or undefined.
 */
function waitForTab(previousTabs: Set<Tab>): Promise<Tab | undefined> {
    const found = identifyTab(previousTabs);
    if (found) {
        return Promise.resolve(found);
    }
    return new Promise((resolve) => {
        const disposables: { dispose(): void }[] = [];
        const finish = (tab: Tab | undefined): void => {
            for (const disposable of disposables) {
                disposable.dispose();
            }
            resolve(tab);
        };
        const check = (): void => {
            const tab = identifyTab(previousTabs);
            if (tab) {
                finish(tab);
            }
        };
        const timer = setTimeout(() => finish(identifyTab(previousTabs)), TAB_WAIT_MS);
        disposables.push(
            { dispose: () => clearTimeout(timer) },
            window.tabGroups.onDidChangeTabs(check),
            window.tabGroups.onDidChangeTabGroups(check)
        );
    });
}

/**
 * Remembers a unique new Simple Browser tab, or the active reused tab.
 * `simpleBrowser.show` resolves before the workbench reports the tab to extensions.
 *
 * @param url - The editor URL to open.
 */
async function openInSimpleBrowser(url: string): Promise<void> {
    const previousTabs = new Set(window.tabGroups.all.flatMap((group) => group.tabs));
    ownedEditor = undefined;
    await commands.executeCommand(SIMPLE_BROWSER_SHOW, url);
    const tab = await waitForTab(previousTabs);
    if (tab) {
        ownedEditor = { tab, url };
    }
}

/**
 * Reads and validates the command once, ignoring missing or partial writes.
 *
 * @returns The command, or undefined if missing or malformed.
 */
function readSignal(): EditorCommand | undefined {
    try {
        const parsed: unknown = JSON.parse(readFileSync(SIGNAL_FILE, 'utf8'));
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('command' in parsed) ||
            (parsed.command !== 'open' && parsed.command !== 'close') ||
            !('url' in parsed) ||
            typeof parsed.url !== 'string' ||
            parsed.url.trim().length === 0 ||
            !('id' in parsed) ||
            typeof parsed.id !== 'string' ||
            parsed.id.trim().length === 0
        ) {
            return undefined;
        }
        return { command: parsed.command, url: parsed.url, id: parsed.id };
    } catch {
        // Missing or malformed input does not consume a request ID.
    }
    return undefined;
}

/**
 * Captures each command before queueing so an in-flight open cannot race a close.
 *
 * @param manual - Explicitly replay the latest valid open, even if already handled.
 */
async function handleSignalChange(manual = false): Promise<void> {
    const observed = readSignal();
    signalQueue = signalQueue
        .then(async () => {
            const signal = manual && observed?.command !== 'open' ? latestOpen : observed;
            if (!signal) {
                if (manual) {
                    await window.showWarningMessage(
                        'No adaptation editor URL is available yet. Open the editor via the Fiori MCP tool first.'
                    );
                }
                return;
            }
            if (!manual && handledIds.has(signal.id)) {
                return;
            }
            handledIds.add(signal.id);
            if (signal.command === 'open') {
                latestOpen = signal;
                await openInSimpleBrowser(signal.url);
            } else if (ownedEditor?.url === signal.url) {
                const { tab } = ownedEditor;
                if (window.tabGroups.all.some((group) => group.tabs.includes(tab))) {
                    await window.tabGroups.close(tab, false);
                }
                ownedEditor = undefined;
            }
        })
        .catch(async (error: unknown) => {
            await window.showErrorMessage(`Could not update the adaptation editor in Simple Browser: ${String(error)}`);
        });
    await signalQueue;
}

/**
 * Activates the extension: starts watching the signal file and registers the
 * manual fallback command.
 *
 * @param context - The extension context.
 */
export function activate(context: ExtensionContext): void {
    const existing = readSignal();
    handledIds.clear();
    if (existing) {
        handledIds.add(existing.id);
    }
    latestOpen = existing?.command === 'open' ? existing : undefined;
    ownedEditor = undefined;
    signalQueue = Promise.resolve();

    // watchFile (stat polling) is robust for a fixed path that may not exist yet
    // and works across editor hosts where fs.watch on a single file is flaky.
    watchFile(SIGNAL_FILE, { interval: 1000 }, () => handleSignalChange());
    context.subscriptions.push({
        dispose: () => unwatchFile(SIGNAL_FILE)
    });

    context.subscriptions.push(
        commands.registerCommand('sap.ux.adp.openEditorInSimpleBrowser', () => handleSignalChange(true))
    );
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
    unwatchFile(SIGNAL_FILE);
}
