import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const packageRoot = resolve(__dirname, '..');
const sharedChecker = resolve(packageRoot, '..', 'mockserver-data-generator', 'scripts', 'check-package.mjs');

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

describe('CAP adapter published package boundary', () => {
    it('exposes the shared CAP package check as an explicit package script', () => {
        const packageJson: unknown = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
        if (!isRecord(packageJson) || !isRecord(packageJson.scripts)) {
            throw new Error('Package scripts are missing');
        }

        expect(packageJson.scripts['check:package']).toBe(
            'node ../mockserver-data-generator/scripts/check-package.mjs --profile cap'
        );
    });

    it('packs the CAP adapter below the size ceiling and probes its exact public entrypoints', () => {
        const result = spawnSync(process.execPath, [sharedChecker, '--profile', 'cap'], {
            cwd: packageRoot,
            encoding: 'utf8'
        });

        expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
        const report: unknown = JSON.parse(result.stdout);
        if (!isRecord(report)) {
            throw new Error('Package check returned an invalid report');
        }
        expect(report).toMatchObject({
            packageName: '@sap-ux/mockserver-data-generator-cap',
            maximumBytes: 5 * 1024 * 1024,
            networkFree: true,
            profile: 'cap'
        });
    });
});
