import { ToolsLogger, NullTransport } from '@sap-ux/logger';
import fc from 'fast-check';
import { DummyStore } from '../../../src/secure-store/dummy-store';

describe('DummyStore', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

    it('save always returns true', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string(), fc.string(), fc.anything(), async (service, key, value) => {
                return (await new DummyStore(nullLogger).save(service, key, value)) === true;
            })
        );
    });
    it('retrieve always returns undefined', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string(), fc.string(), async (service, key) => {
                return (await new DummyStore(nullLogger).retrieve(service, key)) === undefined;
            })
        );
    });
    it('delete always returns true', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string(), fc.string(), async (service, key) => {
                return (await new DummyStore(nullLogger).delete(service, key)) === true;
            })
        );
    });
    it('getAll always returns {}', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string(), async (service) => {
                return Object.keys(await new DummyStore(nullLogger).getAll(service)).length === 0;
            })
        );
    });
});
