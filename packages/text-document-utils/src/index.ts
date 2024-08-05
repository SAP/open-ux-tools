export {
    TextDocument,
    Position,
    Range,
    DocumentUri,
    TextDocumentContentChangeEvent,
    TextEdit
} from 'vscode-languageserver-textdocument';

export {
    Location,
    Range as RangeType,
    Position as PositionType,
    Diagnostic,
    DiagnosticSeverity,
    TextEdit as TextEditType,
    WorkspaceEdit,
    CompletionItemKind,
    InsertTextFormat,
    integer,
    MarkupKind,
    CodeAction,
    CodeActionKind,
    Hover,
    CompletionList,
    CompletionItem,
    MarkupContent,
    MarkedString
} from 'vscode-languageserver-types';

export { getLanguageService, JSONSchema, JSONDocument } from 'vscode-json-languageservice';

export { getLineOffsets } from './line-offsets';
export {
    positionAt,
    getIndentLevel,
    indent,
    isBefore,
    positionContainedStrict,
    rangeContained,
    positionContained
} from './position';
export {
    rangeAt,
    copyRange,
    areRangesEqual,
    copyPosition,
    arePositionsEqual,
    createRange,
    createRangeWithPosition
} from './range';
export { printOptions } from './text-formatting';
