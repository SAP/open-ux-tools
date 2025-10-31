export type ODataMetadata = Record<string, unknown>;

/**
 * Represents the status for a healthy OData service.
 */
export class ODataUpStatus {
    /**
     * Creates an instance representing a healthy OData service.
     *
     * @param serviceUrl The service url.
     * @param metadata The OData metadata.
     */
    constructor(public readonly serviceUrl: string, public readonly metadata: ODataMetadata) {}
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
     * Fromats the reason.
     *
     * @param reason The provided reason for the failure.
     * @returns Formated reasion as string.
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

/**
 * Determines if an OData service is healthy based on its status.
 * A service is considered healthy if it has metadata available.
 *
 * @param status The OData service healths status.
 * @returns True if the service is up otherwise false.
 */
export function isODataServiceHealthy(status: ODataHealthStatus): status is ODataUpStatus {
    return 'metadata' in status;
}
