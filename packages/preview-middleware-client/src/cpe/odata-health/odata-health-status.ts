export type ODataMetadata = Record<string, unknown>;

export class ODataUpStatus {
    constructor(public readonly serviceUrl: string, public readonly metadata: ODataMetadata) {}
}

export class ODataDownStatus {
    readonly errorMessage: string;

    constructor(public readonly serviceUrl: string, public readonly reason: unknown) {
        this.errorMessage = this.formatReason(reason);
    }

    private formatReason(reason: unknown): string {
        if (reason instanceof Error) {
            return reason.message;
        }
        if (typeof reason === 'string') {
            return reason;
        }
        try {
            return JSON.stringify(reason);
        } catch {
            return String(reason);
        }
    }
}

export type ODataHealthStatus = ODataUpStatus | ODataDownStatus;

export function isODataServiceHealthy(status: ODataHealthStatus): status is ODataUpStatus {
    return 'metadata' in status;
}
