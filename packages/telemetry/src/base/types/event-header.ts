/**
 * Hierarchical event name for a telemetry event submitted to Auzre Application Insights.
 */
class EventHeader {
    private extensionName: string;
    private eventName: string;

    constructor(extensionName: string, eventName: string) {
        this.extensionName = extensionName;
        this.eventName = eventName;
    }

    public getExtensionName(): string {
        return this.extensionName;
    }

    public getEventName(): string {
        return this.eventName;
    }

    public toString(): string {
        return `${this.extensionName}/${this.eventName}`;
    }
}

export { EventHeader };
