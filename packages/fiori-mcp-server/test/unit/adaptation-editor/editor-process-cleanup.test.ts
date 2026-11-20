import { jest } from '@jest/globals';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import type * as EditorLifecycle from '../../../src/adaptation-editor/editor-session.js';

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({ logger: { warn: jest.fn() } }));

// The child deliberately survives SIGTERM and the CLI parent's exit, in the parent's process group.
const descendantScript = `
    process.on('SIGTERM', () => {});
    process.send('ready');
    setInterval(() => {}, 1000);
`;
const parentScript = `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc']
    });
    child.once('message', () => process.send(child.pid));
    process.on('message', () => process.exit(0));
    setInterval(() => {}, 1000);
`;

const describePosix = process.platform === 'win32' ? describe.skip : describe;
describePosix('owned POSIX editor process cleanup', () => {
    let lifecycle: typeof EditorLifecycle;
    const children = new Set<ChildProcess>();

    beforeEach(async () => {
        jest.resetModules();
        lifecycle = await import('../../../src/adaptation-editor/editor-session.js');
    });

    afterEach(async () => {
        // Failure cleanup targets only the detached groups created by this test.
        for (const child of children) {
            if (child.pid) {
                try {
                    process.kill(-child.pid, 'SIGKILL');
                } catch (error) {
                    if (error?.code !== 'ESRCH') {
                        throw error;
                    }
                }
                await lifecycle.terminateEditorProcess(child);
            }
        }
        children.clear();
        await lifecycle.stopEditorSessions();
    });

    async function startTree(): Promise<{ parent: ChildProcess; descendantPid: number }> {
        const parent = spawn(process.execPath, ['-e', parentScript], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore', 'ipc']
        });
        children.add(parent);
        const ready = once(parent, 'message');
        await lifecycle.trackEditorProcess(parent, true);
        const descendantPid: unknown = (await ready)[0];
        if (typeof descendantPid !== 'number') {
            throw new Error('Expected the owned descendant PID');
        }
        return { parent, descendantPid };
    }

    function expectStopped(parent: ChildProcess, descendantPid: number): void {
        expect(() => process.kill(descendantPid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
        expect(parent.pid).toBeDefined();
        expect(() => process.kill(-Number(parent.pid), 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
        children.delete(parent);
    }

    test('shutdown kills an editor tree that has not registered a URL', async () => {
        const { parent, descendantPid } = await startTree();
        await lifecycle.stopEditorSessions();
        expectStopped(parent, descendantPid);
    }, 10000);

    test('parent exit triggers descendant cleanup before any explicit stop request', async () => {
        const { parent, descendantPid } = await startTree();
        const exited = once(parent, 'exit');
        parent.send('exit');
        await exited;
        expect(process.kill(descendantPid, 0)).toBe(true);
        // Observe automatic exit cleanup; do not initiate termination from this test.
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
            try {
                process.kill(-Number(parent.pid), 0);
            } catch (error) {
                if (error?.code !== 'ESRCH') {
                    throw error;
                }
                expectStopped(parent, descendantPid);
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error('The owned group survived parent exit cleanup');
    }, 10000);
});
