import merge from 'sap/base/util/merge';
import Control from 'sap/ui/core/Control';
import UIComponent from 'sap/ui/core/UIComponent';
import Utils from 'sap/ui/fl/Utils';
import RuntimeAuthoring, { type RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type { RTAPlugin } from 'sap/ui/rta/api/startAdaptation';
import FeaturesAPI from 'sap/ui/fl/write/api/FeaturesAPI';

const defaultOptions = {
    flexSettings: {
        developerMode: false,
        layer: 'CUSTOMER'
    }
};

const layers = {
    BASE: 'BASE',
    CUSTOMER: 'CUSTOMER',
    CUSTOMER_BASE: 'CUSTOMER_BASE',
    PARTNER: 'PARTNER',
    PUBLIC: 'PUBLIC',
    USER: 'USER',
    VENDOR: 'VENDOR'
};

export function isValidLayer(layer: string) {
    return Object.keys(layers).some(function (existingLayer) {
        return existingLayer === layer;
    });
}

export function checkLayer(layer: string) {
    // LayerUtils does not have isValidLayer in ui5 version 1.71.60
    if (!isValidLayer(layer)) {
        throw new Error('An invalid layer is passed');
    }
}

function checkRootControl(rootControl: Control | UIComponent) {
    if (!(rootControl instanceof Control) && !(rootControl instanceof UIComponent)) {
        throw new Error('An invalid root control was passed');
    }
}

function checkFlexEnabled(component: Control) {
    // fiori tools is always a developer scenario where the flexEnabled flag should not be evaluated
    var fioriToolsMode = new URLSearchParams(window.location.search).get('fiori-tools-rta-mode');
    if (!fioriToolsMode || fioriToolsMode === 'false') {
        // @ts-ignore
        const manifest = component.getManifest() || {};
        const flexEnabled = manifest['sap.ui5'] && manifest['sap.ui5'].flexEnabled;

        if (flexEnabled === false) {
            throw new Error('This app is not enabled for key user adaptation');
        }
    }
}

export async function checkKeyUser(layer: string) {
    if (layers.CUSTOMER === layer) {
        const isKeyUser = await FeaturesAPI.isKeyUser();
        if (!isKeyUser) {
            // Lib (sap/ui/core/Lib) does not have getResourceBundleFor in ui5 version 1.71.60
            // var rtaResourceBundle = Lib.getResourceBundleFor('sap.ui.rta');
            // throw new Error(rtaResourceBundle?.getText('MSG_NO_KEY_USER_RIGHTS_ERROR_MESSAGE'));
            throw new Error('No key user rights found');
        }
    }
    return Promise.resolve();
}

export default async function (options: RTAOptions, loadPlugins: RTAPlugin) {
    const layer = options.flexSettings.layer;
    const rootControl = options.rootControl;

    options = merge(defaultOptions, options) as RTAOptions;

    checkLayer(layer);

    checkRootControl(rootControl);

    await checkKeyUser(layer);

    options.rootControl = Utils.getAppComponentForControl(rootControl);

    checkFlexEnabled(options.rootControl);

    const rta = new RuntimeAuthoring(options);

    const fnOnStop = function () {
        rta.destroy();
    };
    rta.attachEvent('stop', fnOnStop);

    if (loadPlugins) {
        await loadPlugins(rta);
    }

    await rta.start();
}
