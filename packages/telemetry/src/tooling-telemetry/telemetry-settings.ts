import type { ToolsSuiteTelemetryInitSettings } from './types';
import { reportRuntimeError, reportEnableTelemetryOnOff } from '../base/utils/reporting';
import { getService, Entity, TelemetrySetting, TelemetrySettingKey, getFilesystemWatcherFor, Service } from '@sap-ux/store';
import { isAppStudio } from '@sap-ux/btp-utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getCommonProperties } from './data-processor';
import { TelemetrySettings } from '../base/config-state';

const deprecatedSettingPaths: Record<string, string> = {
    win32: '\\AppData\\Roaming\\Code\\User\\settings.json',
    darwin: '/Library/Application Support/Code/User/settings.json',
    linux: '/.config/Code/User/settings.json',
    theia: '/.theia/settings.json'
};

const deprecatedExtensionPropKeys = [
    'sap.ux.annotation.lsp.enableTelemetry',
    'sap.ux.applicationModeler.enableTelemetry',
    'sap.ux.help.enableTelemetry',
    'sap.ux.serviceModeler.enableTelemetry'
];

export const ToolingTelemetrySettings = {
    internalFeature: false
}

const definePath = (paths: Record<string, string>): string | null => {
    const platform = process.platform;
    let settingsPath = paths[platform];
    if (isAppStudio()) {
        settingsPath = paths.theia;
    }
    if (!settingsPath) {
        console.error('no path for current OS is provided - ', platform);
        return null;
    }
    const homedir = os.homedir();
    return path.join(homedir, settingsPath);
};

async function readEnableTelemetryFromStore(storeService: Service<TelemetrySetting, TelemetrySettingKey>): Promise<void> {

    let setting: TelemetrySetting | undefined;
    try {
        setting = await storeService.read(new TelemetrySettingKey());
    } catch {
        // ignore read failure, assume file doens't exist and thus setting is undefined
    }

    if (!setting) {
        // If no telemetry setting found in .fioritools folder,
        // check telemetry setting in vscode settings for extensions
        const deprecatedSettingPath = definePath(deprecatedSettingPaths);
        if (!deprecatedSettingPath) {
            // If no vscode setting found, default central telemetry setting to true
            setEnableTelemetry(true);
        } else {
            // If deprecated vscode setting exists, set central telemetry setting to false if any of vscode setting was false
            let content: string;
            try {
                content = await fs.promises.readFile(deprecatedSettingPath, 'utf-8');
                const deprecatedSetting = JSON.parse(content);
                const propValues = deprecatedExtensionPropKeys.map(
                    (propKey) => (deprecatedSetting[propKey] ?? true) as boolean
                );
                const deprecatedEnableTelemetrySetting = propValues.reduce(
                    (prevValue, currentValue) => prevValue && currentValue
                );
                setEnableTelemetry(deprecatedEnableTelemetrySetting);
            } catch {
                // ignore read failure and content is undefined
                setEnableTelemetry(true);
            }
        }
    } else {
        TelemetrySettings.telemetryEnabled = setting.enableTelemetry;
    }
};


function watchTelemetrySettingStore(storeService: Service<TelemetrySetting, TelemetrySettingKey>) {
    getFilesystemWatcherFor(Entity.TelemetrySetting, async () => {
        const watchedSetting = await storeService.read(new TelemetrySettingKey());
        if (watchedSetting) {
            TelemetrySettings.telemetryEnabled = watchedSetting.enableTelemetry;
        }
    });
}

/**
 * Telemetry API function to init settings.
 * @param options
 */
export const initTelemetrySettings = async (options: ToolsSuiteTelemetryInitSettings): Promise<void> => {
    try {
        TelemetrySettings.consumerModuleName = options.modulePackageJson.name;
        TelemetrySettings.consumerModuleVersion = options.modulePackageJson.version;
        ToolingTelemetrySettings.internalFeature = options.internalFeature ?? false;
        const storeService = await getService<TelemetrySetting, TelemetrySettingKey>({
            entityName: 'telemetrySetting'
        });

        await readEnableTelemetryFromStore(storeService);
        watchTelemetrySettingStore(storeService);
    } catch (err) {
        reportRuntimeError(err);
    }
};

/**
 * Toggle on/off enable telemetry setting. This will update telemetry settings file
 * and the runtime setting.
 * 
 * @param enableTelemetry 
 */
export async function setEnableTelemetry(enableTelemetry: boolean): Promise<void> {
    try {
        const storeService = await getService<TelemetrySetting, TelemetrySettingKey>({
            entityName: 'telemetrySetting'
        });
        const setting = new TelemetrySetting({ enableTelemetry });
        await storeService.write(setting);
        TelemetrySettings.telemetryEnabled = enableTelemetry;
    } catch (e) {
        console.error(`Telemetry settings could not be written. Error : ${e.message}`);
    }

    const commonProperties = await getCommonProperties();
    reportEnableTelemetryOnOff(enableTelemetry, commonProperties as Record<string, string>);
};

/**
 * 
 * @returns 
 */
export async function getTelemetrySetting(): Promise<TelemetrySetting | undefined> {
    let setting: TelemetrySetting | undefined;
    try {
        const storeService = await getService<TelemetrySetting, TelemetrySettingKey>({
            entityName: 'telemetrySetting'
        });
        setting = await storeService.read(new TelemetrySettingKey());
    } catch {
        // ignore if settings could not be read, return undefined
    }
    return setting;
};
