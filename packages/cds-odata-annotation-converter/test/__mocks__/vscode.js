const Uri = {
    parse: jest.fn(),
    file: (path) => new FakeUri('', '', path)
};
class FakeUri {
    constructor(scheme, authority, path, query, fragment) {
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.fsPath = path;
        this.query = query;
        this.fragment = fragment;

        this.toString = this.toString.bind(this);
    }

    toString() {
        return this.path;
    }
}

class Disposable {
    constructor() {}
    dispose() {}
}

const RelativePattern = jest.fn().mockImplementation(() => {
    return { toString: jest.fn() };
});

class EventEmitter {
    constructor() {
        this.handler = null;
        this.event = this.event.bind(this);
        this.fire = this.fire.bind(this);
    }

    event(handler) {
        this.handler = handler;
    }

    fire(data) {
        if (this.handler) {
            this.handler(data);
        }
    }
}

const workspace = {
    getConfiguration: jest.fn(),
    workspaceFolders: [],
    createFileSystemWatcher: jest.fn(),
    findFiles: jest.fn(),
    fs: {
        readFile: jest.fn(),
        stat: jest.fn()
    }
};

const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
};

const vscode = {
    EventEmitter,
    workspace,
    Uri,
    Disposable,
    RelativePattern,
    FileType
};

module.exports = vscode;
