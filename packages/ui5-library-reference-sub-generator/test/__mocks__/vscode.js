const URI = require('vscode-uri');

class Disposable {
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

class EventEmitter {
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

const FileChangeType = {
    Changed: 1,
    Created: 2,
    Deleted: 3
};

class FileSystemError extends Error {
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

const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
};

class Terminal {
    constructor(name) {
        this.name = name;
    }
    show() {
        jest.fn();
    }
    sendText() {
        jest.fn();
    }
}

const workspace = {
    registerFileSystemProvider: () => true,
    registerTextDocumentContentProvider: () => true,
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
    workspaceFolders: [],
    getConfiguration: jest.fn().mockImplementation(() => {
        return {
            get: jest.fn()
        };
    }),
    onDidSaveTextDocument: jest.fn(),
    onDidChangeConfiguration: (changeFunction) => changeFunction,
    openTextDocument: jest
        .fn()
        .mockImplementationOnce((uri) => {
            return {
                getText: jest.fn().mockReturnValueOnce('{"sapux": true}'),
                uri: uri
            };
        })
        .mockImplementationOnce((uri) => {
            return {
                getText: jest.fn().mockReturnValueOnce('{"sapux": false}'),
                uri: uri
            };
        })
        .mockImplementationOnce((uri) => {
            return {
                getText: jest.fn().mockReturnValueOnce('{"sapux": true}'),
                uri: uri
            };
        }),
    onDidChangeWorkspaceFolders: jest.fn(),
    getWorkspaceFolder: jest.fn().mockImplementation((uri) => {
        return {
            name: 'someWSFolderName',
            uri: uri
        };
    })
};

const window = {
    createQuickPick: () => {
        return {
            onDidChangeSelection: () => {},
            onDidHide: () => {},
            show: () => {},
            hide: () => {},
            onDidTriggerButton: () => {}
        };
    },
    createInputBox: () => {
        return {
            onDidTriggerButton: () => {},
            onDidAccept: () => {},
            onDidChangeValue: () => {},
            onDidHide: () => {},
            showQuickPick: () => {},
            showInputBox: () => {}
        };
    },
    createTerminal: (name) => {
        return new Terminal(name);
    },
    showErrorMessage: () => {},
    createWebviewPanel: jest.fn().mockImplementation(() => {
        return {
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                asWebviewUri: jest.fn().mockReturnValue(''),
                cspSource: ''
            },
            onDidChangeViewState: jest.fn(),
            onDidDispose: jest.fn()
        };
    }),
    onDidChangeVisibleTextEditors: jest.fn(),
    visibleTextEditors: [],
    setStatusBarMessage: jest.fn(),
    createTreeView: jest.fn(),
    registerTreeDataProvider: jest.fn(),
    onDidChangeActiveTextEditor: (changeFunction) => changeFunction,
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showTextDocument: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: () => {
        return {
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        };
    }
};

const env = {
    appName: 'VSCode',
    openExternal: jest.fn()
};

const commands = {
    executeCommand: jest.fn(),
    registerCommand: (id, handler) => handler
};

const ViewColumn = {
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

const ExtensionContext = {};

const extensions = {
    getExtension: jest.fn()
};

const ExtensionKind = {
    UI: 1,
    Workspace: 2
};

const languages = {
    createDiagnosticCollection: () => ({
        clear: jest.fn(),
        set: jest.fn()
    })
};

class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}

class Range {
    constructor(startLine, startCharacter, endLine, endCharacter) {
        this.start = new Position(startLine, startCharacter);
        this.end = new Position(endLine, endCharacter);
    }
}

class TextLine {
    constructor(startLine, startCharacter, endLine, endCharacter) {
        this.start = new Position(startLine, startCharacter);
        this.end = new Position(endLine, endCharacter);
    }
}

class Selection extends Range {
    constructor(anchor, active) {
        super();
        this.anchor = anchor;
        this.active = active;
        this.isReversed = false;
    }
}

class TreeItem {
    constructor(label, TreeItemCollapsibleState) {
        this.label = label;
        this.collapsibleState = TreeItemCollapsibleState;
    }
}

const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2
};

const vscode = {
    commands,
    Disposable,
    EventEmitter,
    ExtensionContext,
    FileChangeType,
    FileSystemError,
    FileType,
    languages,
    Uri: URI.URI,
    workspace,
    window,
    env,
    ViewColumn,
    extensions,
    ExtensionKind,
    Position,
    Range,
    Selection,
    TextLine,
    TreeItemCollapsibleState,
    TreeItem
};

module.exports = vscode;
