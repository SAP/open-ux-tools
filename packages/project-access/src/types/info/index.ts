import type { CapProjectType } from '../cap';

export type AppProgrammingLanguage = 'JavaScript' | 'TypeScript' | '';

export type ProjectType = 'EDMXBackend' | CapProjectType;

export type AppType =
    | 'SAP Fiori elements'
    | 'SAPUI5 freestyle'
    | 'SAPUI5 Extension'
    | 'Fiori Reuse'
    | 'Fiori Adaptation';
