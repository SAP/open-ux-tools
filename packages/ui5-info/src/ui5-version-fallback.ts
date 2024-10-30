import { coerce, gte } from 'semver';
import type { UI5VersionSupport } from './types';
import { defaultMinUi5Version } from './constants';

export const supportState = {
    maintenance: 'Maintenance',
    outOfMaintenance: 'Out of maintenance',
    skipped: 'Skipped'
} as const;

// Updated Oct-25-2024 from https://ui5.sap.com/versionoverview.json
export const ui5VersionFallbacks = [
    {
        version: '1.129.*',
        support: supportState.maintenance
    },
    {
        version: '1.128.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.127.*',
        support: supportState.maintenance
    },
    {
        version: '1.126.*',
        support: supportState.maintenance
    },
    {
        version: '1.125.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.124.*',
        support: supportState.maintenance
    },
    {
        version: '1.123.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.122.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.121.*',
        support: supportState.maintenance
    },
    {
        version: '1.120.*',
        support: supportState.maintenance
    },
    {
        version: '1.119.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.118.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.117.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.116.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.115.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.114.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.113.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.112.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.111.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.110.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.109.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.108.*',
        support: supportState.maintenance
    },
    {
        version: '1.107.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.106.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.105.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.104.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.103.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.102.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.101.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.100.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.99.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.98.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.97.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.96.*',
        support: supportState.maintenance
    },
    {
        version: '1.95.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.94.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.93.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.92.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.91.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.90.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.89.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.88.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.87.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.86.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.85.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.84.*',
        support: supportState.maintenance
    },
    {
        version: '1.83.*',
        support: supportState.skipped
    },
    {
        version: '1.82.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.81.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.80.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.79.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.78.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.77.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.76.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.75.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.74.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.73.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.72.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.71.*',
        support: supportState.maintenance
    },
    {
        version: '1.70.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.69.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.68.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.67.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.66.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.65.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.64.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.63.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.62.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.61.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.60.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.58.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.56.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.54.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.52.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.50.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.48.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.46.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.44.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.42.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.40.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.38.*',
        support: supportState.maintenance
    },
    {
        version: '1.36.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.34.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.32.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.30.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.28.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.26.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.24.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '1.22.*',
        support: supportState.outOfMaintenance
    },
    {
        version: '*',
        support: supportState.outOfMaintenance
    }
] as UI5VersionSupport[];

const supportedUi5VersionFallbacks = ui5VersionFallbacks
    .filter((supportVersion) => {
        if (
            supportVersion.support === supportState.maintenance &&
            gte(coerce(supportVersion.version) ?? '0.0.0', defaultMinUi5Version)
        ) {
            return true;
        }
        return false;
    })
    .map((maintainedVersion) => coerce(maintainedVersion.version)?.version ?? '0.0.0');

const defaultUi5Versions = [...supportedUi5VersionFallbacks];
export { defaultUi5Versions, supportedUi5VersionFallbacks };
