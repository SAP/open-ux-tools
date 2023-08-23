import type ManagedObject from 'sap/ui/base/ManagedObject';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

/**
 * Get runtime control.
 *
 * @param overlayControl
 * @returns {ManagedObject}
 */
export function getRuntimeControl(overlayControl: ElementOverlay): ManagedObject {
    let runtimeControl;
    if (overlayControl.getElementInstance) {
        runtimeControl = overlayControl.getElementInstance();
    } else {
        runtimeControl = overlayControl.getElement();
    }
    return runtimeControl;
}

/**
 * Get library of a control name.
 *
 * @param controlName
 * @returns {Promise<string>}
 */
export async function getLibrary(controlName: string): Promise<string> {
    return new Promise((resolve) => {
        const controlPath = controlName.replace(/\./g, '/');
        sap.ui.require([controlPath], (control) => {
            const contMetadata = control.getMetadata();
            // getLibraryName method does not exist on events
            if (contMetadata && contMetadata.getLibraryName) {
                const contLibName = contMetadata.getLibraryName();
                resolve(contLibName);
            } else {
                resolve(''); // return empty for events
            }
        });
    });
}
