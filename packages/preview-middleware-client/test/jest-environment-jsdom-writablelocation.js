/**
 * Custom Jest environment that extends jsdom and makes window.location.reload
 * spyable so tests can mock it.
 *
 * jsdom 21+ defines Location properties as "unforgeable" (configurable: false, writable: false)
 * per the HTML spec, so Object.defineProperty(window, 'location', ...) and
 * Object.defineProperty(window.location, 'reload', ...) both throw.
 *
 * The workaround: patch the `[impl]` object's `reload` method directly.
 * The generated wrapper (Location.js) calls `esValue[implSymbol].reload()`, so replacing
 * it on the impl is sufficient and does not require touching the non-configurable wrapper.
 *
 * Tests can then set `window.__locationImpl.reload = jest.fn()` directly
 * and restore it via `window.__locationImplOriginalReload` in afterEach.
 */
const { TestEnvironment } = require(require.resolve('jest-environment-jsdom', {
    paths: [require.resolve('jest/package.json', { paths: [__dirname] }).replace('/package.json', '')]
}));

class JsdomWithWritableLocation extends TestEnvironment {
    async setup() {
        await super.setup();
        // Expose the impl symbol on the global so setupFiles/tests can replace impl.reload.
        const locationInstance = this.global.window.location;
        const implSymbol = Object.getOwnPropertySymbols(locationInstance).find(
            (s) => s.toString() === 'Symbol(impl)'
        );
        if (implSymbol) {
            // Make the impl's reload property writable so tests can replace it.
            const impl = locationInstance[implSymbol];
            const originalReload = impl.reload.bind(impl);
            // Store on the global for test access
            this.global.__locationImpl = impl;
            this.global.__locationImplOriginalReload = originalReload;
        }
    }
}

module.exports = JsdomWithWritableLocation;
