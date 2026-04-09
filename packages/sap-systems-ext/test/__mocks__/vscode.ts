import path from 'path';
import { URI } from 'vscode-uri';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Disposable {
    static from(...disposableLikes) {
        //
    }
    constructor(callOnDispose) {
        //
    }
    dispose() {
        //
    }
}

export class EventEmitter {
    constructor(e) {
        this.eventHandler = new Set();
    }
    event(handler) {
        if (this._emitter) {
            this._emitter.eventHandler.add(handler);
        }
        return {
            dispose: () => {
                if (this._emitter) {
                    this._emitter.eventHandler.delete(handler);
                }
            }
        };
    }
    fire(args) {
        for (const eh of Array.from(this.eventHandler)) {
            eh(args);
        }
    }
    dispose() {
        //
    }
}

export const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2
};

export class TreeItem {
    constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

export const FileChangeType = {
    Changed: 1,
    Created: 2,
    Deleted: 3
};

export class FileSystemError extends Error {
    static FileNotFound(uri) {
        throw `FileNotFound ${uri ? uri.toString() : typeof uri}`;
    }
    static FileExists(uri) {
        throw `FileExists ${uri ? uri.toString() : typeof uri}`;
    }
    static FileNotADirectory(uri) {
        throw `FileNotADirectory ${uri ? uri.toString() : typeof uri}`;
    }
    static FileIsADirectory(uri) {
        throw `FileIsADirectory ${uri ? uri.toString() : typeof uri}`;
    }
    static NoPermissions(uri) {
        throw `NoPermissions ${uri ? uri.toString() : typeof uri}`;
    }
    static Unavailable(uri) {
        throw `Unavailable ${uri ? uri.toString() : typeof uri}`;
    }
}

export const RelativePattern = jest.fn().mockImplementation(() => {
    return { toString: jest.fn() };
});

export const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
};

export class Terminal {
    constructor(name) {
        this.name = name;
    }
}

export const workspace = {
    registerFileSystemProvider: () => true,
    createFileSystemWatcher: jest.fn().mockImplementation(() => {
        return {
            ignoreCreateEvents: false,
            ignoreChangeEvents: false,
            ignoreDeleteEvents: false,
            onDidCreate: jest.fn(),
            onDidChange: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn()
        };
    }),
    workspaceFolders: [
        {
            name: 'workspace',
            uri: URI.file(path.join(__dirname, '..', 'test-data'))
        }
    ],
    getConfiguration: jest.fn(),
    onDidSaveTextDocument: jest.fn(),
    onDidChangeConfiguration: jest.fn()
};

export const window = {
    registerTreeDataProvider: jest.fn(),
    createOutputChannel: () => {
        return {
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
        };
    },
    createQuickPick: () => {
        return {
            onDidChangeSelection: () => {},
            onDidHide: () => {},
            show: () => {},
            hide: () => {}
        };
    },
    createInputBox: () => {
        return {
            onDidAccept: jest.fn(),
            onDidChangeValue: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };
    },
    createTerminal: (name) => {
        return new Terminal(name);
    },
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showInformationMessage: () => {},
    showErrorMessage: () => {},
    showWarningMessage: () => {},
    showQuickPick: jest.fn(),
    createWebviewPanel: jest.fn().mockImplementation(() => {
        return {
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                asWebviewUri: jest.fn().mockReturnValue(''),
                cspSource: ''
            },
            onDidChangeViewState: jest.fn(),
            onDidDispose: jest.fn(),
            reveal: jest.fn()
        };
    }),
    onDidChangeVisibleTextEditors: jest.fn(),
    visibleTextEditors: []
};

export const Uri = {
    file: (f) => f,
    parse: jest.fn(),
    joinPath: (a, b) => {
        if (a == '""') return b;
        return (a + ' + ' + b).replace(/' \+ '/g, '');
    }
};

export const env = {
    appName: 'VSCode'
};

export const extensions = {
    getExtension: jest.fn()
};

export const commands = {
    executeCommand: jest.fn(),
    registerCommand: jest.fn()
};

export const ViewColumn = {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9
};

export const ExtensionContext = {};

export const debug = {
    startDebugging: jest.fn()
};
