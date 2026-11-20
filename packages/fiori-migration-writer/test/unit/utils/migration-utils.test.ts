import { describe, it, expect, beforeAll } from '@jest/globals';
import { join } from 'node:path';
import {
    determineMessage,
    MigrationError,
    MigrationStep,
    describeError,
    getErrorCode,
    getErrorFile,
    runMigrationStep
} from '../../../src/utils/migration-utils.js';
import { initI18n } from '../../../src/index.js';

describe('determineMessage', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('falls back to the original error message when no specialized message applies', () => {
        expect(determineMessage(new Error('Something unexpected happened'))).toBe('Something unexpected happened');
    });

    it('falls back to error.toString() when the error message is empty', () => {
        const error = new Error('');
        error.name = 'CustomError';
        expect(determineMessage(error)).toBe('CustomError');
    });

    it('returns the raw message when useMessage is set', () => {
        expect(determineMessage(new Error('raw message'), undefined, true)).toBe('raw message');
    });

    it('returns a specialized message for syntax errors instead of the raw message', () => {
        const error = new SyntaxError('Unexpected token } in JSON');
        const message = determineMessage(error);
        expect(message).toBeTruthy();
        expect(message).not.toBe(error.message);
    });

    it('returns a specialized message for permission errors instead of the raw message', () => {
        const error = new Error('EPERM: operation not permitted');
        const message = determineMessage(error);
        expect(message).toBeTruthy();
        expect(message).not.toBe(error.message);
    });

    it('returns a file-specific message when a filename is provided', () => {
        const message = determineMessage(new Error('read failed'), 'manifest.json');
        expect(message).toContain('manifest.json');
    });

    it('always returns a non-empty string', () => {
        expect(determineMessage(new Error('x'))).not.toBe('');
    });
});

describe('MigrationError', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('preserves the original message when no specialized message applies', () => {
        const error = new MigrationError(new Error('plain failure'));
        expect(error.name).toBe('MigrationError');
        expect(error.message).toBe('plain failure');
    });

    it('wraps non-Error values using their string representation', () => {
        expect(new MigrationError('string failure').message).toBe('string failure');
    });
});

const fsError = (code: string, message: string, path?: string): NodeJS.ErrnoException =>
    Object.assign(new Error(message), { code, path });

describe('determineMessage permission errors', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it.each([
        ['EPERM code', fsError('EPERM', 'operation not permitted')],
        ['EACCES code', fsError('EACCES', 'denied')],
        ['EPERM in the message', new Error('EPERM: operation not permitted')],
        ['EACCES in the message', new Error("EACCES: permission denied, mkdir '/a/b'")]
    ])('treats %s as a permission error', (_description, error) => {
        expect(determineMessage(error)).toBe('A permission error occurred. Ensure your project files are accessible.');
    });

    it('does not treat other file system errors as permission errors', () => {
        expect(determineMessage(fsError('ENOENT', 'ENOENT: no such file'))).toBe('ENOENT: no such file');
    });

    it('does not fail for error-like values without a message', () => {
        expect(determineMessage({ name: 'Weird' } as unknown as Error)).toBeDefined();
    });
});

describe('getErrorCode', () => {
    it.each([
        [fsError('ENOSPC', 'x'), 'ENOSPC'],
        [new Error('x'), undefined],
        [{ code: 42 }, undefined],
        [{ code: '' }, undefined],
        [undefined, undefined],
        ['text', undefined]
    ])('%p -> %p', (error, expected) => {
        expect(getErrorCode(error)).toBe(expected);
    });
});

describe('getErrorFile', () => {
    const root = join('/', 'work', 'my-app');

    it('returns the file relative to the project with / as separator', () => {
        expect(getErrorFile(fsError('EPERM', 'x', join(root, 'webapp', 'Component.js')), root)).toBe(
            'webapp/Component.js'
        );
    });

    it('reduces a file outside of the project to its name', () => {
        expect(getErrorFile(fsError('EPERM', 'x', join('/', 'home', 'someone', '.fioritools', 'a.json')), root)).toBe(
            'a.json'
        );
        expect(getErrorFile(fsError('EPERM', 'x', join('/', 'work', 'my-app-other', 'a.json')), root)).toBe('a.json');
    });

    it('reduces an absolute file to its name if the project is unknown', () => {
        expect(getErrorFile(fsError('EPERM', 'x', join(root, 'webapp', 'a.json')))).toBe('a.json');
    });

    it('keeps a relative file', () => {
        expect(getErrorFile(fsError('EPERM', 'x', join('webapp', 'a.json')), root)).toBe('webapp/a.json');
    });

    it('returns nothing for the project folder itself or errors without a file', () => {
        expect(getErrorFile(fsError('EPERM', 'x', root), root)).toBe('my-app');
        expect(getErrorFile(new Error('x'), root)).toBeUndefined();
        expect(getErrorFile(undefined, root)).toBeUndefined();
        expect(getErrorFile({ path: '' }, root)).toBeUndefined();
    });
});

describe('runMigrationStep', () => {
    it('returns the result of the action', async () => {
        await expect(runMigrationStep(MigrationStep.applyTemplates, async () => 42)).resolves.toBe(42);
        await expect(runMigrationStep(MigrationStep.applyTemplates, () => 'sync')).resolves.toBe('sync');
    });

    it('rethrows the same error and marks it with the step without changing how it looks', async () => {
        const error = new Error('boom');
        await expect(runMigrationStep(MigrationStep.setupProjectStructure, () => Promise.reject(error))).rejects.toBe(
            error
        );

        expect((error as unknown as { migrationStep: string }).migrationStep).toBe('setupProjectStructure');
        expect(Object.keys(error)).not.toContain('migrationStep');
        expect(JSON.stringify(error)).toBe('{}');
    });

    it('keeps the first (innermost) step', async () => {
        const error = new Error('boom');
        await expect(
            runMigrationStep(MigrationStep.postProcessing, () =>
                runMigrationStep(MigrationStep.applyTemplates, () => Promise.reject(error))
            )
        ).rejects.toBe(error);
        expect((error as unknown as { migrationStep: string }).migrationStep).toBe('applyTemplates');
    });

    it('rethrows values that are not objects as they are', async () => {
        await expect(runMigrationStep(MigrationStep.applyTemplates, () => Promise.reject('text'))).rejects.toBe('text');
    });
});

describe('describeError', () => {
    const root = join('/', 'work', 'my-app');

    beforeAll(async () => {
        await initI18n();
    });

    it('names the file of a permission error relative to the project and adds the code', () => {
        const error = fsError('EACCES', "EACCES: permission denied, open 'x'", join(root, 'webapp', 'Component.js'));
        expect(describeError(error, root)).toBe(
            'A permission error occurred in webapp/Component.js. Ensure the file is accessible. (code: EACCES)'
        );
    });

    it('does not name a file when the error has none', () => {
        expect(describeError(fsError('EPERM', 'EPERM: operation not permitted'), root)).toBe(
            'A permission error occurred. Ensure your project files are accessible. (code: EPERM)'
        );
    });

    it('adds the step of the migration', async () => {
        const error = new SyntaxError('Unexpected token } in JSON');
        await expect(runMigrationStep(MigrationStep.applyTemplates, () => Promise.reject(error))).rejects.toBe(error);

        expect(describeError(error, root)).toBe('A syntax error occurred. (step: applyTemplates)');
    });

    it('adds code and step together', async () => {
        const error = fsError('EPERM', 'EPERM: x', join(root, 'package.json'));
        await expect(runMigrationStep(MigrationStep.generateAppSettings, () => Promise.reject(error))).rejects.toBe(
            error
        );

        expect(describeError(error, root)).toBe(
            'A permission error occurred in package.json. Ensure the file is accessible. (code: EPERM, step: generateAppSettings)'
        );
    });

    it('does not repeat a code that is part of the message', () => {
        expect(describeError(fsError('ENOSPC', 'ENOSPC: no space left on device, write'), root)).toBe(
            'ENOSPC: no space left on device, write'
        );
    });

    it('adds the code of a file system error that is not mapped', () => {
        expect(describeError(fsError('EBUSY', 'resource busy or locked'), root)).toBe(
            'resource busy or locked (code: EBUSY)'
        );
    });

    it('keeps the file name of a MigrationError and adds the code of the original error', () => {
        const error = new MigrationError(fsError('EPERM', 'EPERM: x'), 'webapp/manifest.json');

        expect(describeError(error, root)).toBe(
            'A permission error occurred in webapp/manifest.json. Ensure the file is accessible. (code: EPERM)'
        );
    });

    it('does not add details to messages for the user', async () => {
        const error = Object.assign(new Error('The project is not supported'), { useMessage: true });
        await expect(runMigrationStep(MigrationStep.validateProject, () => Promise.reject(error))).rejects.toBe(error);

        expect(describeError(error, root)).toBe('The project is not supported');
        expect(describeError(new Error('raw text'), root, true)).toBe('raw text');
    });

    it.each([
        ['an empty message', new Error('')],
        ['a thrown empty string', ''],
        ['undefined', undefined],
        ['null', null],
        ['an object without a message', {}]
    ])('never returns an empty message for %s', (_description, error) => {
        expect(describeError(error, root)).not.toBe('');
    });

    it('turns values that are not errors into text', () => {
        expect(describeError('plain text', root)).toBe('plain text');
        expect(describeError('', root)).toBe('Error');
    });

    it('uses a generic message if there is nothing to tell', () => {
        const error = Object.assign(new Error(''), { name: '' });

        expect(describeError(error, root)).toBe('An unknown error occurred.');
    });
});
