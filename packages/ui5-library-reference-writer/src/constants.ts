import { FileName } from '@sap-ux/project-access';

export const yamlFiles = [FileName.Ui5Yaml, FileName.Ui5LocalYaml, FileName.Ui5MockYaml];

export const serveStatic = 'fiori-tools-servestatic';
export const fioriToolsProxy = 'fiori-tools-proxy';

export enum ManifestReuseType {
    Library = 'libs',
    Component = 'components'
}
