import { FileName } from '@sap-ux/project-access';

export const yamlFiles = [FileName.Ui5Yaml, FileName.Ui5LocalYaml, FileName.Ui5MockYaml];

export enum ManifestReuseType {
    Library = 'libs',
    Component = 'components'
}
