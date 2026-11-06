import type { ExistingMockData } from '../../src/types.js';

/** Explicit value-help evidence for relationship/format tests; not runtime business defaults. */
export const travelAuthoredValueHelpEvidence: Readonly<Record<string, ExistingMockData>> = Object.freeze({
    BookingStatus: {
        contributor: { present: false },
        initialRows: {
            source: 'json',
            present: true,
            rows: [{ BookingStatus: 'Q', BookingStatus_Text: 'Fixture workflow state' }]
        }
    },
    OverallStatus: {
        contributor: { present: false },
        initialRows: {
            source: 'json',
            present: true,
            rows: [{ OverallStatus: 'Q', OverallStatus_Text: 'Fixture workflow state' }]
        }
    },
    SupplementCategory: {
        contributor: { present: false },
        initialRows: {
            source: 'json',
            present: true,
            rows: [{ SupplementCategory: 'Q', SupplementCategory_Text: 'Fixture category' }]
        }
    }
});
