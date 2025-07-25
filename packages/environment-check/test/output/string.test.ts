import type { EnvironmentCheckResult } from '../../src/types';
import envCheckResults from '../test-input/env-check-result.json';
import { convertResultsToString } from '../../src/output';

describe('Test to check formatResultsForClipboard returns stringified results', () => {
    test('Check results are returned as a string', () => {
        const result = convertResultsToString(envCheckResults as unknown as EnvironmentCheckResult);
        expect(result).toMatchInlineSnapshot(`
            "Platform : linux
            Development environment : Business Application Studio
            SAP Fiori tools - Fiori generator : 1
            Cloud CLI tools : 2
            Application Wizard : 2
            UI5 Language Assistant Support : 2
            XML Toolkit : 2
            SAP Fiori tools - XML Annotation Language Server : 2.2
            SAP Fiori tools - Application Modeler : 2
            SAP Fiori tools - Guided Development : 2
            SAP Fiori tools - Service Modeler : 2.4
            SAP CDS Language Support : 2
            "
        `);
    });

    test('Check empty results does not throw error', () => {
        expect(() => convertResultsToString({})).not.toThrow();
    });
});
