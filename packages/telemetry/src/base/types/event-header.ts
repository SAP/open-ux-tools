/**
 * Hierarchical event name for a telemetry event submitted to Auzre Application Insights.
 */
class EventHeader {
    private extensionName: string;
    private eventName: string;

    /**
     * Event header that is composed of two parts.
     *
     * @param extensionName Consumer module name
     * @param eventName Telemetry event name
     */
    constructor(extensionName: string, eventName: string) {
        this.extensionName = extensionName;
        this.eventName = eventName;
    }

    /**
     * @returns Consumer module name
     */
    public getExtensionName(): string {
        return this.extensionName;
    }

    /**
     * @returns Event name
     */
    public getEventName(): string {
        return this.eventName;
    }

    /**
     * @returns serialized string of event header
     */
    public toString(): string {
        return `${this.extensionName}/${this.eventName}`;
    }
}

export { EventHeader };
