import { isNeedsUserAction } from '../../../../../src/tools/run-rta-workflow-step/browser/types.js';

describe('isNeedsUserAction', () => {
    test('returns true for the reserved backend-login payload', () => {
        expect(isNeedsUserAction({ __needsUserAction: 'backend_login_required', message: 'x' })).toBe(true);
    });

    test('returns false for a normal payload', () => {
        expect(isNeedsUserAction({ rtaStarted: true })).toBe(false);
    });

    test('returns false for null, primitives, and arrays', () => {
        expect(isNeedsUserAction(null)).toBe(false);
        expect(isNeedsUserAction('backend_login_required')).toBe(false);
        expect(isNeedsUserAction([{ __needsUserAction: 'backend_login_required' }])).toBe(false);
    });

    test('returns false when the discriminator value differs', () => {
        expect(isNeedsUserAction({ __needsUserAction: 'something_else' })).toBe(false);
    });
});
