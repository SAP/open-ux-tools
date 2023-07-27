export interface MtaPath {
    // File path that contains mta.yaml file
    mtaPath: string;
    // `hasRoot` is true if mta.yaml is in a parent folder (managed MTA project).
    // It is set to false if mta.yaml is at in the project root folder (standardalone MTA project).
    hasRoot: boolean;
}