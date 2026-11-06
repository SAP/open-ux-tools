import base from '../../jest.base.mjs';

export default {
    ...base,
    // The training tooling under training/ is plain ESM JavaScript; its tests are .mjs.
    testMatch: [...base.testMatch, '**/test/training/**/*.test.mjs']
};
