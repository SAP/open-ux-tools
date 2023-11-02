import type { manifest, VSCodeManifest, modules } from './types';

class TelemetrySystem {
    static WORKSTREAM: string;
    static telemetryEnabled: boolean;
    static manifest: manifest | VSCodeManifest;
}

export { TelemetrySystem };
