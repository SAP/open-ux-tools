import { Client } from './client';
import * as appInsights from 'applicationinsights';
import { EventHeader } from '../types/event-header';
import { SampleRate } from '../types/sample-rate';
import { configAzureTelemetryClient } from '../utils/azure-client-config';
import { TelemetrySettings } from '../config-state';

/**
 *
 */
class ApplicationInsightClient extends Client {
    private clients: Map<SampleRate, appInsights.TelemetryClient>;

    /**
     *
     * @param applicationKey Application key to identify the Azure Application Insight resource
     * @param extensionName Unique name of the extension in the format of {publisher}.{extension}
     * @param extensionVersion Conventional version number of the extension
     */
    public constructor(applicationKey: string, extensionName: string, extensionVersion: string) {
        super();
        this.clients = new Map<SampleRate, appInsights.TelemetryClient>();

        this.applicationKey = applicationKey;
        this.extensionVersion = extensionVersion;
        this.extensionName = extensionName;
        const clientOnePercent = this.createTelemetryClient(SampleRate.OnePercent);
        const clientTenPercent = this.createTelemetryClient(SampleRate.TenPercent);
        const clientNoSampling = this.createTelemetryClient(SampleRate.NoSampling);

        this.clients.set(SampleRate.OnePercent, clientOnePercent);
        this.clients.set(SampleRate.TenPercent, clientTenPercent);
        this.clients.set(SampleRate.NoSampling, clientNoSampling);
    }

    /**
     * Send a telemetry event to Azure Application Insights. This API makes sure the telemetry event
     * is flushed to Azure backend before executing the next statement. Since this API blocks
     * normal execution flow, please use this API cautiously. See `report()` method for non-blocking
     * usage.
     *
     * @param eventName Categorize the type of the event within the scope of an extension.
     * @param properties A set of string properties to be reported
     * @param measurements  A set of numeric measurements to be reported
     * @param sampleRate Sampling the event to be sent
     * @param ignoreSettings Ignore telemetryEnabled settings and skip submitting telemetry data
     * @returns Promise<void>
     */
    public reportBlocking(
        eventName: string,
        properties: { [key: string]: string | boolean },
        measurements: { [key: string]: number },
        sampleRate: SampleRate | undefined,
        ignoreSettings: boolean = false
    ): Promise<void> {
        if (!ignoreSettings || TelemetrySettings.telemetryEnabled) {
            const { client, event } = this.prepareClientAndEvent(eventName, properties, measurements, sampleRate);
            return this.trackEventBlocking(client, event);
        }
        return Promise.resolve();
    }

    /**
     * Send a telemetry event to Azure Application Insights. The telemetry event sending is still non-blocking
     * in this API. To make sure telemetry event is sent to Azure backend before next statement, please see
     * `reportBlocking()`.
     *
     * @param eventName Categorize the type of the event within the scope of an extension.
     * @param properties A set of string properties to be reported
     * @param measurements  A set of numeric measurements to be reported
     * @param sampleRate Sampling the event to be sent
     * @param telemetryHelperProperties Properties that are passed to specific TelemetryClient for generating specific properties (E.g. ToolsSuiteTelemetryClient)
     * @param ignoreSettings Ignore telemetryEnabled settings and skip submitting telemetry data
     */
    public async report(
        eventName: string,
        properties: { [key: string]: string | boolean },
        measurements: { [key: string]: number },
        sampleRate: SampleRate | undefined,
        telemetryHelperProperties?: { [key: string]: string },
        ignoreSettings?: boolean
    ): Promise<void> {
        if ((ignoreSettings !== undefined && !ignoreSettings) || !TelemetrySettings.telemetryEnabled) {
            return;
        }
        const { client, event } = this.prepareClientAndEvent(eventName, properties, measurements, sampleRate);
        this.trackEvent(client, event);
    }

    /**
     * Provide specification of telemetry event to be sent.
     *
     * @param eventName Categorize the type of the event within the scope of an extension.
     * @param properties A set of string properties to be reported
     * @param measurements A set of numeric measurements to be reported
     * @param sampleRate  Sampling the event to be sent
     * @returns TelemetryClient instance and telemetry event
     */
    private prepareClientAndEvent(
        eventName: string,
        properties: { [key: string]: string | boolean },
        measurements: { [key: string]: number },
        sampleRate = SampleRate.NoSampling
    ): { client: appInsights.TelemetryClient; event: appInsights.Contracts.EventTelemetry } {
        const client = this.clients.get(sampleRate) as appInsights.TelemetryClient;

        const eventHeader: EventHeader = new EventHeader(this.extensionName, eventName);
        const event: appInsights.Contracts.EventTelemetry = {
            name: eventHeader.toString(),
            properties: properties as Record<string, string>,
            measurements: measurements
        };

        return {
            client,
            event
        };
    }

    /**
     * Send telemetry event in blocking style. It blocks
     * the subsequent statements until telemetry event has been sent.
     *
     * @param client TelemetryClient instance
     * @param event Telemetry event
     * @returns Promise<void>
     */
    private async trackEventBlocking(
        client: appInsights.TelemetryClient,
        event: appInsights.Contracts.EventTelemetry
    ): Promise<void> {
        if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY === 'true') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                client.trackEvent(event);
                client.flush({
                    callback: () => resolve()
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send teleemtry event in non-blocking fashion.
     *
     * @param client Telemetry client instance
     * @param event Telemetry event
     * @returns Send telemetry succeeded or not
     */
    private trackEvent(client: appInsights.TelemetryClient, event: appInsights.Contracts.EventTelemetry): boolean {
        if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY !== 'true') {
            client.trackEvent(event);
            return true;
        }
        return false;
    }

    /**
     * Create telemetry client instance based on sample rate.
     *
     * @param sampleRate Sampling telemetry event
     * @returns Telemetry client instance
     */
    private createTelemetryClient(sampleRate: SampleRate): appInsights.TelemetryClient {
        let sampleRateNumer: number;

        switch (sampleRate) {
            case SampleRate.OnePercent:
                sampleRateNumer = 1;
                break;
            case SampleRate.TenPercent:
                sampleRateNumer = 10;
                break;
            case SampleRate.NoSampling:
            default:
                sampleRateNumer = 100;
                break;
        }

        const client: appInsights.TelemetryClient = new appInsights.TelemetryClient(this.applicationKey);
        client.config.samplingPercentage = sampleRateNumer;
        configAzureTelemetryClient(client);
        return client;
    }
}

export { ApplicationInsightClient };
