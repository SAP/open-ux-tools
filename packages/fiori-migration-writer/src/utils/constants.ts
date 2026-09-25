export enum postMigrationAction {
    appInfo = 'Open App Info',
    serviceManager = 'Open Service Manager',
    backToMigration = 'Back'
}

export enum MigrationTypes {
    project = 'Project',
    projectExtension = 'ProjectExtension',
    library = 'Library'
}

export const distVar = '${sap.ui5.dist.version}';

export const sapUI5LibsNS: string[] = [
    'sap.apf',
    'sap.base',
    'sap.chart',
    'sap.collaboration',
    'sap.f',
    'sap.fe',
    'sap.fileviewer',
    'sap.gantt',
    'sap.landvisz',
    'sap.m',
    'sap.makit',
    'sap.me',
    'sap.ndc',
    'sap.ovp',
    'sap.rules',
    'sap.suite',
    'sap.tnt',
    'sap.ui',
    'sap.uiext',
    'sap.ushell',
    'sap.uxap',
    'sap.viz',
    'sap.webanalytics',
    'sap.zen'
];
