export type ODataMetadata = Record<string, unknown>;

/**
 * Represents the status for a healthy OData service.
 */
export class ODataUpStatus {
    /**
     * Creates an instance representing a healthy OData service.
     *
     * @param serviceUrl The service url.
     */
    constructor(public readonly serviceUrl: string) {}
}

/**
 * Represents the status for an unhealthy OData service.
 */
export class ODataDownStatus {
    readonly errorMessage: string;

    /**
     * Creates an instance representing an unhealthy OData service.
     *
     * @param serviceUrl The service url.
     * @param reason The provided reason for the failure.
     */
    constructor(public readonly serviceUrl: string, public readonly reason: unknown) {
        this.errorMessage = this.formatReason(reason);
    }

    /**
     * Formats the reason.
     *
     * @param reason The provided reason for the failure.
     * @returns Formatted reason as string.
     */
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
