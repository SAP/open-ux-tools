import { join } from 'path';
import { pathToFileURL } from 'url';
import type { ProjectType } from '@sap-ux/project-access';

// import type { ProjectInfo } from '@sap/ux-test-utils';
// import { ODataVersion, ProjectName, ProjectType, getProjectRoot, getProjectSourceRoot } from '@sap/ux-test-utils';

type ODataVersion = 'v2' | 'v4';

export interface ProjectInfo {
    version: ODataVersion;
    name: string;
    type: ProjectType;
}
const V4_XML_START: ProjectInfo = {
    version: 'v4',
    name: 'xml-start',
    type: 'EDMXBackend'
};
const V2_XML_START: ProjectInfo = {
    version: 'v2',
    name: 'xml-start',
    type: 'EDMXBackend'
};
const V4_CAP_START: ProjectInfo = {
    version: 'v4',
    name: 'cap-start',
    type: 'CAPNodejs'
};
export interface ProjectTestModel<T extends Record<string, string>> {
    info: ProjectInfo;
    root: string;
    serviceName: string;
    files: T;
}

const DATA_ROOT = join(__dirname, '..', 'data');
const V4_XML_START_ROOT = join(DATA_ROOT, 'v4-xml-start');
const V2_XML_START_ROOT = join(DATA_ROOT, 'v2-xml-start');
const V4_CAP_START_ROOT = join(DATA_ROOT, 'cds', 'cap-start');
const CDS_LAYERING_ROOT = join(DATA_ROOT, 'cds', 'layering');

export const PROJECTS = {
    V4_XML_START: {
        info: V4_XML_START,
        root: V4_XML_START_ROOT,
        serviceName: 'mainService',
        files: {
            annotations: pathToFileURL(join(V4_XML_START_ROOT, 'webapp', 'annotations', 'annotation.xml')).toString(),
            metadata: pathToFileURL(join(V4_XML_START_ROOT, 'webapp', 'localService', 'metadata.xml')).toString()
        }
    },
    V2_XML_START: {
        info: V2_XML_START,
        root: V2_XML_START_ROOT,
        serviceName: 'mainService',
        files: {
            annotations: pathToFileURL(join(V2_XML_START_ROOT, 'webapp', 'annotations', 'annotation.xml')).toString(),
            metadata: pathToFileURL(join(V2_XML_START_ROOT, 'webapp', 'localService', 'metadata.xml')).toString()
        }
    },
    V4_CDS_START: {
        info: V4_CAP_START,
        root: V4_CAP_START_ROOT,
        serviceName: 'IncidentService',
        files: {
            annotations: pathToFileURL(join(V4_CAP_START_ROOT, 'app', 'incidents', 'annotations.cds')).toString(),
            metadata: pathToFileURL(join(V4_CAP_START_ROOT, 'srv', 'common.cds')).toString(),
            schema: pathToFileURL(join(V4_CAP_START_ROOT, 'db', 'schema.cds')).toString()
        }
    },
    CDS_LAYERING: {
        info: {
            version: 'v4',
            name: 'cds-layering',
            type: 'CAPNodejs'
        },
        root: CDS_LAYERING_ROOT,
        serviceName: 'TravelService',
        files: {
            annotations: pathToFileURL(join(CDS_LAYERING_ROOT, 'app', 'travel_analytics', 'layout.cds')).toString(),
            metadata: pathToFileURL(join(CDS_LAYERING_ROOT, 'srv', 'travel-service.cds')).toString()
        }
    }
};
