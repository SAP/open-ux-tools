import {
    getHelpUrl,
    GUIDED_ANSWERS_EXTENSION_ID,
    GUIDED_ANSWERS_ICON,
    GUIDED_ANSWERS_LAUNCH_CMD_ID,
    HELP_NODES
} from '../../src/index';

// write your tests here
describe('Guided Answers Helper', () => {
    it('should return the help url', () => {
        expect(getHelpUrl(12345, [33333])).toBe(
            'https://ga.support.sap.com/dtp/viewer/index.html#/tree/12345/actions/33333'
        );
    });

    it('should return the extension id', () => {
        expect(GUIDED_ANSWERS_EXTENSION_ID).toBe('saposs.sap-guided-answers-extension');
    });

    it('should return the extension icon', () => {
        expect(GUIDED_ANSWERS_ICON).toContain('data:image/svg+xml;base64,');
    });

    it('should return the launch command id', () => {
        expect(GUIDED_ANSWERS_LAUNCH_CMD_ID).toBe('sap.ux.guidedAnswer.openGuidedAnswer');
    });

    it('should return the help nodes', () => {
        expect(HELP_NODES).toMatchInlineSnapshot(`
            Object {
              "APPLICATION_PREVIEW": 52881,
              "BAD_GATEWAY": 48366,
              "BAS_CATALOG_SERVICES_REQUEST_FAILED": 48366,
              "CERTIFICATE_ERROR": 53643,
              "DESTINATION_CONNECTION_ERRORS": 48366,
              "DESTINATION_MISCONFIGURED": 54336,
              "DESTINATION_NOT_FOUND": 51208,
              "DESTINATION_SERVICE_UNAVAILBLE": 52526,
              "DESTINATION_UNAVAILABLE": 51208,
              "DEV_PLATFORM": 45996,
              "FIORI_APP_GENERATOR": 48363,
              "FIORI_TOOLS": 45995,
              "NO_ADT_SERVICE_AUTH": 57266,
              "NO_V4_SERVICES": 57573,
              "UI_SERVICE_GENERATOR": 63068,
            }
        `);
    });
});
