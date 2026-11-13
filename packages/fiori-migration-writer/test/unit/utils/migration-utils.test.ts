import { describe, it, expect, beforeAll } from '@jest/globals';
import {
    determineMessage,
    MigrationError,
    pathToFilename,
    stripPaths,
    curateErrorDescription
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

    it('does not report an absolute path for a generic fs error', () => {
        const message = determineMessage(
            new Error("ENOENT: no such file or directory, mkdir 'd:\\WorkBuddySpace\\zcustomer\\.vscode'")
        );
        expect(message).not.toContain('WorkBuddySpace');
        expect(message).not.toContain('zcustomer');
        expect(message).not.toContain('d:\\');
        expect(message).toContain('.vscode');
    });
});

describe('pathToFilename', () => {
    it('keeps the file name of a path that ends in a file', () => {
        expect(pathToFilename('/Users/I123456/app/webapp/manifest.json')).toBe('manifest.json');
        expect(pathToFilename(String.raw`d:\builds\I123456\ui5.yaml`)).toBe('ui5.yaml');
    });

    it('keeps a dotfile or dotfolder', () => {
        expect(pathToFilename('/home/user/project/.gitignore')).toBe('.gitignore');
        expect(pathToFilename(String.raw`c:\Users\jane\app\.vscode`)).toBe('.vscode');
    });

    it('drops a path that ends in a plain folder', () => {
        expect(pathToFilename('/var/folders/tmp/myFolder')).toBe('');
        expect(pathToFilename(String.raw`d:\builds\I123456\zcustomer`)).toBe('');
    });
});

describe('stripPaths', () => {
    it('reduces Windows, UNC and posix absolute paths to the file name', () => {
        expect(stripPaths('Cannot read /var/tmp/a/ui5.yaml and /opt/x/y.txt')).toBe('Cannot read ui5.yaml and y.txt');
        expect(stripPaths(String.raw`Cannot read \\fileserver\share\team\ui5.yaml`)).toBe('Cannot read ui5.yaml');
        expect(stripPaths(String.raw`Error in D:\builds\I123456\ui5.yaml`)).toBe('Error in ui5.yaml');
    });

    it('removes a path that ends in a folder, keeping no folder name', () => {
        expect(stripPaths(String.raw`rename 'c:\Users\N\projects\ZF_X' done`)).toBe("rename '' done");
    });

    it('reduces the real telemetry sample to the dotfolder only', () => {
        expect(
            stripPaths("Error: ENOENT: no such file or directory, mkdir 'd:\\WorkBuddySpace\\zcustomer\\.vscode'")
        ).toBe("Error: ENOENT: no such file or directory, mkdir '.vscode'");
    });

    it('leaves text without a path unchanged', () => {
        expect(stripPaths('A permission error occurred.')).toBe('A permission error occurred.');
    });
});

describe('curateErrorDescription', () => {
    it('reports the fs error code and file name but not the directory', () => {
        const error = Object.assign(
            new Error("ENOENT: no such file or directory, mkdir 'd:\\WorkBuddySpace\\zcustomer\\.vscode'"),
            { code: 'ENOENT' }
        );
        const description = curateErrorDescription(error, 'Error committing migration');
        expect(description).toContain('Error committing migration');
        expect(description).toContain('ENOENT');
        expect(description).toContain('.vscode');
        expect(description).not.toContain('WorkBuddySpace');
        expect(description).not.toContain('zcustomer');
    });

    it('does not duplicate the code when the message already contains it', () => {
        const error = Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
        const description = curateErrorDescription(error, 'Error committing migration');
        expect(description).toBe('Error committing migration: EPERM: operation not permitted');
    });

    it('handles a non-Error value safely', () => {
        expect(curateErrorDescription('boom', 'Migration failed')).toBe('Migration failed: boom');
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
