import type { TextEdit } from '@sap-ux/odata-annotation-core-types';
import { TextDocument } from 'vscode-languageserver-textdocument';

export function applyTextEdits(fileUri: string, languageId: string, edits: TextEdit[], content: string): string {
    const document = TextDocument.create(fileUri, languageId, 0, content);
    return TextDocument.applyEdits(document, edits);
}
