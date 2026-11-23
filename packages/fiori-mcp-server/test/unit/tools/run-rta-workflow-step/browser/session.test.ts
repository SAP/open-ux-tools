import { sessionFileName } from '../../../../../src/tools/run-rta-workflow-step/browser/session.js';

describe('browser/session sessionFileName', () => {
    const PROJECT_A = '/Users/me/projects/open-ux-tools/.tmp/apm-hotfix-v2/app.variant2.ft';
    const PROJECT_B = '/Users/me/projects/open-ux-tools/.tmp/other/app.variant.ft';
    // Two different projects whose LAST segment is identical (common for ADP).
    const SAME_SEGMENT_1 = '/Users/me/projects/one/app.variant';
    const SAME_SEGMENT_2 = '/Users/me/projects/two/app.variant';

    test('is <sanitised-last-segment>-<8-hex>.json (short and human-recognisable)', () => {
        expect(sessionFileName(PROJECT_A)).toMatch(/^app\.variant2\.ft-[0-9a-f]{8}\.json$/);
    });

    test('is deterministic for the same project', () => {
        expect(sessionFileName(PROJECT_A)).toBe(sessionFileName(PROJECT_A));
    });

    test('is distinct for different projects (no cross-seed collision)', () => {
        expect(sessionFileName(PROJECT_A)).not.toBe(sessionFileName(PROJECT_B));
    });

    test('is distinct even when the last segment is identical (hash disambiguates)', () => {
        expect(sessionFileName(SAME_SEGMENT_1)).not.toBe(sessionFileName(SAME_SEGMENT_2));
        // ...but both carry the readable segment.
        expect(sessionFileName(SAME_SEGMENT_1)).toMatch(/^app\.variant-[0-9a-f]{8}\.json$/);
        expect(sessionFileName(SAME_SEGMENT_2)).toMatch(/^app\.variant-[0-9a-f]{8}\.json$/);
    });

    test('contains no path separators or unsafe characters', () => {
        const name = sessionFileName(PROJECT_A);
        expect(name).not.toMatch(/[/\\]/);
    });
});
