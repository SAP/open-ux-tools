import type { Diagnostic } from '../../language/diagnostics';
import type { ParsedApp } from '../parser';

export interface LinkerContext {
    app: ParsedApp;
    diagnostics: Diagnostic[];
}
