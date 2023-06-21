import { satisfiesMinCdsVersion } from '../../../src';
import { hasMinCdsVersion } from '../../../src/cap-config/package-json';

describe('Test hasMinCdsVersion()', () => {
    test('CAP project with valid @sap/cds version using caret(^)', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '^6.7.0' }
            })
        ).toBe(false);
    });

    test('CAP project with invalid @sap/cds version using caret(^)', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '^4' }
            })
        ).toBe(false);
    });

    test('CAP project with valid @sap/cds version using x-range', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '6.x' }
            })
        ).toBe(false);
    });

    test('CAP project with invalid @sap/cds version using x-range', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '4.x' }
            })
        ).toBe(false);
    });

    test('CAP project with valid @sap/cds version using greater than (>)', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '>4.0.0' }
            })
        ).toBe(false);
    });

    test('CAP project with invalid @sap/cds version containing semver with letters', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': 'a.b.c' }
            })
        ).toBe(false);
    });

    test('CAP project with invalid @sap/cds version containing text', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': 'test' }
            })
        ).toBe(false);
    });

    test('CAP project with valid @sap/cds version using higher version', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '6.8.4' }
            })
        ).toBe(true);
    });

    test('CAP project with valid @sap/cds version using higher version with caret (^)', async () => {
        expect(
            hasMinCdsVersion({
                dependencies: { '@sap/cds': '^7' }
            })
        ).toBe(true);
    });
});

describe('Test satisfiesMinCdsVersion()', () => {
    test('CAP project with valid @sap/cds version using caret(^)', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': '^6.7.0' }
            })
        ).toBe(true);
    });

    test('CAP project with invalid @sap/cds version using caret(^)', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': '^4' }
            })
        ).toBe(false);
    });

    test('CAP project with valid @sap/cds version using x-range', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': '6.x' }
            })
        ).toBe(true);
    });

    test('CAP project with invalid @sap/cds version using x-range', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': '4.x' }
            })
        ).toBe(false);
    });

    test('CAP project with valid @sap/cds version using greater than (>)', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': '>4.0.0' }
            })
        ).toBe(true);
    });

    test('CAP project with invalid @sap/cds version containing semver with letters', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': 'a.b.c' }
            })
        ).toBe(false);
    });

    test('CAP project with invalid @sap/cds version containing text', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': 'test' }
            })
        ).toBe(false);
    });

    test('CAP project with valid @sap/cds version using higher version', async () => {
        expect(
            satisfiesMinCdsVersion({
                dependencies: { '@sap/cds': '6.8.4' }
            })
        ).toBe(true);
    });

    test('CAP project with valid @sap/cds version using higher version with caret (^)', async () => {
        expect(satisfiesMinCdsVersion({ dependencies: { '@sap/cds': '^7' } })).toBe(true);
    });

    test('CAP project with missing @sap/cds', async () => {
        expect(satisfiesMinCdsVersion({ dependencies: {} })).toBe(false);
    });

    test('CAP project with missing dependencies', async () => {
        expect(satisfiesMinCdsVersion({})).toBe(false);
    });
});
