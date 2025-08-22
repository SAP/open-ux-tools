export class ODataUpStatus {
    constructor(public readonly serviceUrl: string, public readonly metadata: any) {}
}

export class ODataDownStatus {
    get errorMessage(): string {
        return this.formatReason(this.reason);
    }

    constructor(public readonly serviceUrl: string, public readonly reason: any) {}

    private formatReason(reason: any): string {
        if (reason instanceof Error) {
            return reason.message;
        }
        if (typeof reason === 'string') {
            return reason;
        }
        return JSON.stringify(reason);
    }
}

export type ODataHealthStatus = ODataUpStatus | ODataDownStatus;

export function isODataServiceHealthy(status: ODataHealthStatus): status is ODataUpStatus {
    return 'metadata' in status;
}
