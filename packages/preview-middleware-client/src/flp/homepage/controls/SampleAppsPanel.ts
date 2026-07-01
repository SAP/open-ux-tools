import BaseAppPanel from 'sap/cux/home/BaseAppPanel';

/**
 * @namespace open.ux.preview.client.flp.homepage.controls
 */
export default class SampleAppsPanel extends BaseAppPanel {
    private static readonly SAMPLE_APPS = [
        {
            appId: 'product-display',
            title: 'Display Product Catalog',
            subtitle: 'Fiori Elements v4',
            icon: 'sap-icon://product',
            url: '#product-display',
            targetURL: '#product-display'
        },
        {
            appId: 'masterDetail-display',
            title: 'Manage Products',
            subtitle: 'UI Adaptation at Runtime',
            icon: 'sap-icon://manager-insight',
            url: '#masterDetail-display',
            targetURL: '#masterDetail-display'
        }
    ];

    static readonly metadata = {
        library: 'open.ux.preview.client.flp.homepage.controls'
    };

    init(): void {
        super.init();
        this.setProperty('key', 'sampleApps');
        this.setProperty('title', 'Samples');
    }

    loadApps(): Promise<void> {
        this.destroyAggregation('apps', true);
        const apps = this.generateApps(SampleAppsPanel.SAMPLE_APPS);
        this.setApps(apps);
        return Promise.resolve();
    }
}
