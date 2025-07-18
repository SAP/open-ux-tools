export {
    Location,
    Range,
    Position,
    Diagnostic,
    DiagnosticSeverity,
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
