// Mock for @sap-devx/yeoman-ui-types to handle ESM module issues in Jest
export const AppWizard = {};

export enum Severity {
    error = 'error',
    warning = 'warning',
    information = 'information'
}

export interface IMessageSeverity {
    severity: Severity;
    message: string;
}

export default {};
