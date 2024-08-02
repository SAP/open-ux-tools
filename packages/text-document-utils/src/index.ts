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
    WorkspaceEdit
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
