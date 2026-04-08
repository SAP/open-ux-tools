export {
    Location,
    Range,
    Position,
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticTag,
    TextEdit,
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

export { getLineOffsets } from './line-offsets.js';
export {
    positionAt,
    getIndentLevel,
    indent,
    isBefore,
    positionContainedStrict,
    rangeContained,
    positionContained
} from './position.js';
export {
    rangeAt,
    copyRange,
    areRangesEqual,
    copyPosition,
    arePositionsEqual,
    createRange,
    createRangeWithPosition
} from './range.js';
export { printOptions } from './text-formatting.js';
