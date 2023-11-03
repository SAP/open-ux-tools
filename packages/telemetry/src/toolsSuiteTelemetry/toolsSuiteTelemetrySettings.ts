import type { ToolsSuiteTelemetryInitSettings } from './types';
import { reportRuntimeError, reportEnableTelemetryOnOff } from '../util/reporting';
import { debug } from '../util/cloudDebugger';
import { TelemetrySystem } from '../../src/system/system';
import type { manifest, VSCodeManifest } from '../system/types';
import { getService, Entity, TelemetrySetting, TelemetrySettingKey, getFilesystemWatcherFor } from '@sap-ux/store';
import { isAppStudio } from '@sap-ux/btp-utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getCommonProperties } from './toolsSuiteTelemetryDataProcessor';

const isExtensionModule = (packageJson: manifest) => {
    return (
        packageJson['contributes'] || packageJson['activationEvents'] || packageJson.name.match(/sap-ux-.*-extension/g)
    );
};

const settingPaths: Record<string, string> = {
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

export const setEnableTelemetry = async (enableTelemetry: boolean): Promise<void> => {
    try {
        const storeService = await getService<TelemetrySetting, TelemetrySettingKey>({
            entityName: 'telemetrySetting'
        });
        const setting = new TelemetrySetting({ enableTelemetry });
        await storeService.write(setting);
        TelemetrySystem.telemetryEnabled = enableTelemetry;
    } catch (e) {
        console.error(`Telemetry settings could not be written. Error : ${e.message}`);
    }

    const commonProperties = await getCommonProperties();

    reportEnableTelemetryOnOff(enableTelemetry, commonProperties as Record<string, string>);
};

export const getTelemetrySetting = async (): Promise<TelemetrySetting | undefined> => {
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

const readEnableTelemetryFromSetting = async (): Promise<void> => {
    const storeService = await getService<TelemetrySetting, TelemetrySettingKey>({
        entityName: 'telemetrySetting'
    });
    let setting: TelemetrySetting | undefined;
    try {
        setting = await storeService.read(new TelemetrySettingKey());
    } catch {
        // ignore read failure, assume file doens't exist and thus setting is undefined
    }

    if (!setting) {
        // If no telemetry setting found in .fioritools folder,
        // check telemetry setting in vscode settings for extensions
        const deprecatedSettingPath = definePath(settingPaths);
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
        TelemetrySystem.telemetryEnabled = setting.enableTelemetry;
    }

    if (TelemetrySystem.WORKSTREAM === 'extension') {
        getFilesystemWatcherFor(Entity.TelemetrySetting, async () => {
            const watchedSetting = await storeService.read(new TelemetrySettingKey());
            TelemetrySystem.telemetryEnabled = watchedSetting.enableTelemetry;
        });
    }
};

const initToolsSuiteTelemetrySettings = async (): Promise<void> => {
    debug('start initTelemetrySettings');
    if (!TelemetrySystem.WORKSTREAM) {
        throw new Error('Workstream is undefined');
    }
    debug(`workstream: ${TelemetrySystem.WORKSTREAM}`);
    TelemetrySystem.telemetryEnabled = true;
    await readEnableTelemetryFromSetting();
};

const initWithInputManifest = async (options: ToolsSuiteTelemetryInitSettings): Promise<void> => {
    TelemetrySystem.WORKSTREAM = isExtensionModule(options.modulePackageJson) ? 'extension' : 'core';
    TelemetrySystem.manifest = options.modulePackageJson as unknown as manifest | VSCodeManifest;
    await initToolsSuiteTelemetrySettings();
};

/**
 * Telemetry API function to init settings.
 * @param options
 */
export const initTelemetrySettings = async (options: ToolsSuiteTelemetryInitSettings): Promise<void> => {
    try {
        await initWithInputManifest(options);
    } catch (err) {
        reportRuntimeError(err);
    }
};
