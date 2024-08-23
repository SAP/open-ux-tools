const languages = {
  createDiagnosticCollection: jest.fn()
};

const StatusBarAlignment = {};

const window = {
  createStatusBarItem: jest.fn(() => ({
      show: jest.fn()
  })),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  setStatusBarMessage: jest.fn(),
  activeTextEditor: {}
};

const workspace = {
  getConfiguration: jest.fn(),
  workspaceFolders: [],
  onDidSaveTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  createFileSystemWatcher: jest.fn()
};

const OverviewRulerLane = {
  Left: null
};

const Uri = {
  file: (f) => f,
  parse: jest.fn()
};

const Diagnostic = jest.fn();
const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };

const debug = {
  onDidTerminateDebugSession: jest.fn(),
  startDebugging: jest.fn()
};

const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn()
};

const ExtensionContext = {};

class CompletionItem {
  constructor() {}
}

class Range {
  constructor(startLine, startCharacter, endLine, endCharacter) {
      this.start = new Position(startLine, startCharacter);
      this.end = new Position(endLine, endCharacter);
  }
}
class Position {
  constructor(line, character) {
      this.line = line;
      this.character = character;
  }
}

class SnippetString {
  constructor(val) {
      this.value = val;
  }
}

const vscode = {
  languages,
  StatusBarAlignment,
  window,
  workspace,
  OverviewRulerLane,
  Uri,
  Diagnostic,
  DiagnosticSeverity,
  debug,
  commands,
  ExtensionContext,
  CompletionItem,
  Range,
  Position,
  SnippetString
};

module.exports = vscode;