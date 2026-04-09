// ESM setup file for sap-systems-ext tests.
// This jest.mock('vscode') intercepts CJS require('vscode') calls from
// @sap-ux/logger/dist which uses CommonJS. The moduleNameMapper in jest.config.mjs
// handles ESM import('vscode') resolution to the .ts mock file.

import { jest } from '@jest/globals';
import { URI } from 'vscode-uri';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

jest.mock('vscode', () => {
    class Disposable {
        static from(...disposableLikes) {}
        constructor(callOnDispose) {}
        dispose() {}
    }

    class EventEmitter {
        constructor() {
            this.eventHandler = new Set();
        }
        event(handler) {
            return { dispose: () => {} };
        }
        fire(args) {
            for (const eh of Array.from(this.eventHandler)) {
                eh(args);
            }
        }
        dispose() {}
    }

    const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

    class TreeItem {
        constructor(label, collapsibleState) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    }

    const workspace = {
        registerFileSystemProvider: () => true,
        createFileSystemWatcher: jest.fn(() => ({
            ignoreCreateEvents: false,
            ignoreChangeEvents: false,
            ignoreDeleteEvents: false,
            onDidCreate: jest.fn(),
            onDidChange: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn()
        })),
        workspaceFolders: [
            {
                name: 'workspace',
                uri: URI.file(path.join(__dirname, 'test', 'test-data'))
            }
        ],
        getConfiguration: jest.fn(),
        onDidSaveTextDocument: jest.fn(),
        onDidChangeConfiguration: jest.fn()
    };

    const window = {
        registerTreeDataProvider: jest.fn(),
        createOutputChannel: () => ({
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            show: jest.fn(),
            trace: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            warn: jest.fn()
        }),
        createQuickPick: () => ({
            onDidChangeSelection: () => {},
            onDidHide: () => {},
            show: () => {},
            hide: () => {}
        }),
        createInputBox: () => ({
            onDidAccept: jest.fn(),
            onDidChangeValue: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        }),
        createTerminal: (name) => ({ name }),
        showOpenDialog: jest.fn(),
        showSaveDialog: jest.fn(),
        showInformationMessage: () => {},
        showErrorMessage: () => {},
        showWarningMessage: () => {},
        showQuickPick: jest.fn(),
        createWebviewPanel: jest.fn(() => ({
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                asWebviewUri: jest.fn().mockReturnValue(''),
                cspSource: ''
            },
            onDidChangeViewState: jest.fn(),
            onDidDispose: jest.fn(),
            reveal: jest.fn()
        })),
        onDidChangeVisibleTextEditors: jest.fn(),
        visibleTextEditors: []
    };

    const Uri = {
        file: (f) => f,
        parse: jest.fn(),
        joinPath: (a, b) => {
            if (a == '""') return b;
            return (a + ' + ' + b).replace(/' \+ '/g, '');
        }
    };

    const commands = {
        executeCommand: jest.fn(),
        registerCommand: jest.fn()
    };

    const extensions = {
        getExtension: jest.fn()
    };

    const ViewColumn = {
        Active: -1, Beside: -2, One: 1, Two: 2, Three: 3,
        Four: 4, Five: 5, Six: 6, Seven: 7, Eight: 8, Nine: 9
    };

    const env = { appName: 'VSCode' };
    const debug = { startDebugging: jest.fn() };

    const FileChangeType = { Changed: 1, Created: 2, Deleted: 3 };

    class FileSystemError extends Error {
        static FileNotFound(uri) { throw `FileNotFound ${uri ? uri.toString() : typeof uri}`; }
        static FileExists(uri) { throw `FileExists ${uri ? uri.toString() : typeof uri}`; }
        static FileNotADirectory(uri) { throw `FileNotADirectory ${uri ? uri.toString() : typeof uri}`; }
        static FileIsADirectory(uri) { throw `FileIsADirectory ${uri ? uri.toString() : typeof uri}`; }
        static NoPermissions(uri) { throw `NoPermissions ${uri ? uri.toString() : typeof uri}`; }
        static Unavailable(uri) { throw `Unavailable ${uri ? uri.toString() : typeof uri}`; }
    }

    const RelativePattern = jest.fn(() => ({ toString: jest.fn() }));

    const FileType = { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 };

    class Terminal {
        constructor(name) { this.name = name; }
    }

    const ExtensionContext = {};

    return {
        __esModule: true,
        default: {},
        Disposable,
        EventEmitter,
        TreeItemCollapsibleState,
        TreeItem,
        workspace,
        window,
        Uri,
        env,
        extensions,
        commands,
        ViewColumn,
        debug,
        FileChangeType,
        FileSystemError,
        FileType,
        RelativePattern,
        Terminal,
        ExtensionContext
    };
});
