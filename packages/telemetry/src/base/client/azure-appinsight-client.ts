import { Client } from './client';
import * as appInsights from 'applicationinsights';
import { EventHeader } from '../types/event-header';
import { SampleRate } from '../types/sample-rate';
import { configAzureTelemetryClient } from '../utils/azure-client-config';
import { TelemetrySettings } from '../config-state';
import type { TelemetryMeasurements, TelemetryProperties } from '../types';

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

        // Graceful handling of missing or invalid application key
        if (!applicationKey || typeof applicationKey !== 'string' || applicationKey.trim().length === 0) {
            console.warn(
                'Azure Application Insights: Invalid or missing instrumentation key. Telemetry will be disabled.'
            );
            this.applicationKey = '';
        } else {
            this.applicationKey = applicationKey;
        }

        this.extensionVersion = extensionVersion || 'unknown';
        this.extensionName = extensionName || 'unknown';

        try {
            const clientOnePercent = this.createTelemetryClient(SampleRate.OnePercent);
            const clientTenPercent = this.createTelemetryClient(SampleRate.TenPercent);
            const clientNoSampling = this.createTelemetryClient(SampleRate.NoSampling);

            this.clients.set(SampleRate.OnePercent, clientOnePercent);
            this.clients.set(SampleRate.TenPercent, clientTenPercent);
            this.clients.set(SampleRate.NoSampling, clientNoSampling);
        } catch (error) {
            console.warn('Azure Application Insights: Failed to initialize telemetry clients:', error);
            // Initialize with empty clients map to prevent further errors
            this.clients = new Map<SampleRate, appInsights.TelemetryClient>();
        }
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
        properties: TelemetryProperties,
        measurements: TelemetryMeasurements,
        sampleRate: SampleRate | undefined,
        ignoreSettings: boolean = false
    ): Promise<void> {
        if (!ignoreSettings || TelemetrySettings.telemetryEnabled) {
            try {
                const { client, event } = this.prepareClientAndEvent(eventName, properties, measurements, sampleRate);
                return this.trackEventBlocking(client, event);
            } catch (error) {
                console.warn('Azure Application Insights: Error in reportBlocking method:', error);
                return Promise.resolve();
            }
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
        properties: TelemetryProperties,
        measurements: TelemetryMeasurements,
        sampleRate: SampleRate | undefined,
        telemetryHelperProperties?: { [key: string]: string },
        ignoreSettings?: boolean
    ): Promise<void> {
        if ((ignoreSettings !== undefined && !ignoreSettings) || !TelemetrySettings.telemetryEnabled) {
            return;
        }
        try {
            const { client, event } = this.prepareClientAndEvent(eventName, properties, measurements, sampleRate);
            this.trackEvent(client, event);
        } catch (error) {
            console.warn('Azure Application Insights: Error in report method:', error);
        }
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
        properties: TelemetryProperties,
        measurements: TelemetryMeasurements,
        sampleRate = SampleRate.NoSampling
    ): { client: appInsights.TelemetryClient | null; event: appInsights.Contracts.EventTelemetry } {
        let client: appInsights.TelemetryClient | null = null;

        try {
            client = this.clients.get(sampleRate) || null;
            if (!client && this.clients.size > 0) {
                // Fallback to any available client if requested sample rate client is not available
                client = this.clients.values().next().value || null;
            }
        } catch (error) {
            console.warn('Azure Application Insights: Error retrieving telemetry client:', error);
            client = null;
        }

        let event: appInsights.Contracts.EventTelemetry;
        try {
            const eventHeader: EventHeader = new EventHeader(this.extensionName, eventName);
            event = {
                name: eventHeader.toString(),
                properties: (properties || {}) as Record<string, string>,
                measurements: measurements || {}
            };
        } catch (error) {
            console.warn('Azure Application Insights: Error creating telemetry event:', error);
            // Create minimal fallback event
            event = {
                name: `${this.extensionName || 'unknown'}.${eventName || 'unknown'}`,
                properties: {},
                measurements: {}
            };
        }

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
        client: appInsights.TelemetryClient | null,
        event: appInsights.Contracts.EventTelemetry
    ): Promise<void> {
        if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY === 'true') {
            return Promise.resolve();
        }

        if (!client) {
            console.warn('Azure Application Insights: No telemetry client available, skipping event tracking');
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            try {
                client.trackEvent(event);
                client.flush({
                    callback: (response: string | Error) => {
                        if (response instanceof Error) {
                            console.warn('Azure Application Insights: Error flushing telemetry:', response);
                        }
                        resolve();
                    }
                });
            } catch (error) {
                console.warn('Azure Application Insights: Error tracking event:', error);
                resolve(); // Always resolve to prevent blocking execution
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
    private trackEvent(
        client: appInsights.TelemetryClient | null,
        event: appInsights.Contracts.EventTelemetry
    ): boolean {
        if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY === 'true') {
            return false;
        }

        if (!client) {
            console.warn('Azure Application Insights: No telemetry client available, skipping event tracking');
            return false;
        }

        try {
            client.trackEvent(event);
            return true;
        } catch (error) {
            console.warn('Azure Application Insights: Error tracking event:', error);
            return false;
        }
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

        try {
            if (!this.applicationKey || this.applicationKey.trim().length === 0) {
                throw new Error('Invalid or missing application key');
            }

            const client: appInsights.TelemetryClient = new appInsights.TelemetryClient(this.applicationKey);

            try {
                client.config.samplingPercentage = sampleRateNumer;
                configAzureTelemetryClient(client);
            } catch (configError) {
                console.warn('Azure Application Insights: Error configuring telemetry client:', configError);
                // Continue with basic client even if configuration fails
            }

            return client;
        } catch (error) {
            console.warn('Azure Application Insights: Failed to create telemetry client:', error);
            // Create a no-op client to prevent further errors
            const noOpClient = {
                trackEvent: () => {},
                flush: (options?: { callback?: (response: string) => void }) => {
                    if (options?.callback) {
                        options.callback('no-op client');
                    }
                },
                config: { samplingPercentage: sampleRateNumer }
            } as unknown as appInsights.TelemetryClient;

            return noOpClient;
        }
    }
}

export { ApplicationInsightClient };
