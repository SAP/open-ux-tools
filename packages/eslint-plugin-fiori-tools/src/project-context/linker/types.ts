import { Diagnostic } from "../../language/diagnostics";
import { ParsedApp } from "../parser";

export interface LinkerContext {
    app: ParsedApp;
    diagnostics: Diagnostic[];
}