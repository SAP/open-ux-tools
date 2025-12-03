/**
 * @fileoverview Worker for running async SAP Fiori Tools API calls synchronously
 * @author SAP
 *
 * Debug Mode: Controlled by DEBUG_DRAFT_TOGGLE environment variable from parent process
 */

import { runAsWorker } from 'synckit';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import { findProjectRoot, getCapModelAndServices, getProject } from '@sap-ux/project-access';
// import { createDebugLog } from '../debug-utils.js';
import fs from 'node:fs';
import path from 'node:path';
// NOTE: @sap-ux/annotation-converter removed - it creates character objects and circular refs

//-----------------------------------------------------------------------------
// Debug Utility
//-----------------------------------------------------------------------------

// Create worker-specific debug logger
// const debugLog = createDebugLog('[DEBUG WORKER: API]');
const debugLog = (...args: any[]) => {};

function extractServiceInfoFromManifest(manifestPath: string) {
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Get appId from sap.app.id
    const appId = manifestContent?.['sap.app']?.id || 'defaultApp';

    // Get dataSources
    const dataSources = manifestContent?.['sap.app']?.dataSources;
    if (!dataSources) {
        throw new Error('No dataSources found in manifest');
    }

    // Find the main OData service
    const mainServiceKey = Object.keys(dataSources).find(
        (key) => dataSources[key]?.type === 'OData' || dataSources[key]?.type === 'ODataV4'
    );

    if (!mainServiceKey) {
        throw new Error('No OData service found in dataSources');
    }

    return {
        serviceName: mainServiceKey,
        appId,
        serviceUri: dataSources[mainServiceKey]?.uri,
        odataVersion: dataSources[mainServiceKey]?.settings?.odataVersion,
        manifestContent
    };
}

async function getAnnotationDataViaAPIWorker(manifestPath: string) {
    const startTime = performance.now();
    try {
        if (manifestPath.endsWith('.xml')) {
            manifestPath = path.join(path.dirname(manifestPath), '..', 'manifest.json');
        }
        debugLog('Starting API worker with:', manifestPath);

        // Extract service info from manifest
        const { serviceName, appId, serviceUri, manifestContent } = extractServiceInfoFromManifest(manifestPath);

        debugLog('Extracted service info:', { serviceName, appId, serviceUri });

        // Find the project root (looks for manifest.json, package.json, etc.)
        const projectPath = path.resolve(path.dirname(manifestPath));
        const projectRoot = await findProjectRoot(projectPath);

        if (!projectRoot) {
            throw new Error(`No Fiori project found at ${projectPath}`);
        }

        debugLog(`Creating project for projectRoot ${projectRoot} ...`);
        const project = await getProject(projectRoot);

        // Handle CAP Node.js projects - map service URI to CAP service name
        let capServiceName = null;
        const isCapNodejs = project.projectType === 'CAPNodejs';
        if (isCapNodejs) {
            debugLog('Detected CAP Node.js project, mapping service URI to CAP service name...');
            const capModelAndService = await getCapModelAndServices(project.root);
            const capServices = capModelAndService.services;

            // Remove leading slash from serviceUri for matching
            const serviceToFind = serviceUri.replace(/^\//u, '');
            const capMainService = capServices.find((svc) => svc.urlPath === serviceToFind);

            if (!capMainService) {
                throw new Error(`Service with path '${serviceUri}' not found in CAP project services`);
            }

            capServiceName = capMainService.name;
            debugLog('Mapped to CAP service name:', capServiceName);
        }

        const serviceNameToUse = capServiceName || serviceName;
        debugLog(
            'Creating annotation service for project with serviceName',
            `'${serviceNameToUse}', appId '${appId}'...`
        );
        const annotationService = await FioriAnnotationService.createService(project, serviceNameToUse, appId);

        debugLog('Starting sync...');
        await annotationService.sync();

        debugLog('Get schema to get raw metadata');
        const rawMetadata = annotationService.getSchema();

        if (!rawMetadata) {
            debugLog('WARNING: No raw metadata available!');
        }

        debugLog('Raw metadata keys:', Object.keys(rawMetadata || {}));

        const duration = performance.now() - startTime;
        // Wrap in ESLint AST-compatible structure for reliable serialization

        debugLog(`Worker returns wrappedMetadata in ${duration.toFixed(3)} ms`);
        return [rawMetadata, manifestContent];
    } catch (error) {
        debugLog('Worker failed with error:', error.message);
        return null;
    }
}

runAsWorker(getAnnotationDataViaAPIWorker);
