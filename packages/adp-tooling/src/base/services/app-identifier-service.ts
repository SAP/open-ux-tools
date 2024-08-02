import { Manifest } from '@sap-ux/project-access';
import { t } from 'i18next';
import { getApplicationType, isSupportedAppTypeForAdaptationProject } from '../app-utils';
import { isV4Application } from './manifest-service';
import { Application } from '../../types';

export class AppIdentifier {
    public appSync: boolean;
    public isV4AppInternalMode: boolean;
    public isSupportedAdpOverAdp: boolean;
    public isPartiallySupportedAdpOverAdp: boolean;

    constructor(private isCustomerBase: boolean) {}

    public getIsSupportedAdpOverAdp() {
        return this.isSupportedAdpOverAdp && !this.isPartiallySupportedAdpOverAdp;
    }

    public getIsPartiallySupportedAdpOverAdp() {
        return this.isPartiallySupportedAdpOverAdp;
    }

    public async validateSelectedApplication(
        application: Application,
        checkForAdpOverAdpSupport: boolean,
        checkForAdpOverAdpPartialSupport: boolean,
        manifest: Manifest | null
    ): Promise<void> {
        if (!application) {
            throw new Error(t('validators.selectCannotBeEmptyError', { value: 'Application' }));
        }

        if (!manifest) {
            throw new Error(t('validators.manifestCouldNotBeValidated'));
        }

        this.isV4AppInternalMode = false;

        this.setAdpOverAdpSupport(checkForAdpOverAdpSupport, checkForAdpOverAdpPartialSupport, application.fileType);

        await this.validateSmartTemplateApplication(manifest);
    }

    public async validateSmartTemplateApplication(manifest: Manifest) {
        const isV4App = isV4Application(manifest);

        this.isV4AppInternalMode = isV4App && !this.isCustomerBase;

        const appType = getApplicationType(manifest);

        if (isSupportedAppTypeForAdaptationProject(appType)) {
            if (manifest['sap.ui5']) {
                if (manifest['sap.ui5'].flexEnabled === false) {
                    throw new Error(t('validators.appDoesNotSupportAdaptation'));
                }
                this.checkForSyncLoadedViews(manifest['sap.ui5']);
            }
        } else {
            throw new Error(t('validators.adpPluginSmartTemplateProjectError'));
        }
    }

    public checkForSyncLoadedViews(ui5Settings: Manifest['sap.ui5']) {
        if (ui5Settings?.rootView) {
            // @ts-ignore // TODO:
            this.appSync = !ui5Settings['rootView']['async'];
            return;
        }
        if (ui5Settings?.routing && ui5Settings['routing']['config']) {
            this.appSync = !ui5Settings['routing']['config']['async'];
            return;
        }

        this.appSync = false;
    }

    private setAdpOverAdpSupport(
        checkForAdpOverAdpSupport: boolean,
        checkForAdpOverAdpPartialSupport: boolean,
        fileType: string
    ) {
        this.isSupportedAdpOverAdp = !(checkForAdpOverAdpSupport && fileType === 'appdescr_variant');
        this.isPartiallySupportedAdpOverAdp = checkForAdpOverAdpPartialSupport && fileType === 'appdescr_variant';
    }
}
