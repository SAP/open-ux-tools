import BaseAppPanel from 'sap/cux/home/BaseAppPanel';

const SAMPLE_APPS = [
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

/**
 * @namespace open.ux.preview.client.flp.homepage.controls
 */
export default class SampleAppsPanel extends BaseAppPanel {
    static readonly metadata = {
        library: 'open.ux.preview.client.flp.homepage.controls'
    };

    init(): void {
        super.init();
        this.setProperty('key', 'sampleApps');
        this.setProperty('title', 'Sample Apps');
    }

    loadApps(): Promise<void> {
        this.destroyAggregation('apps', true);
        const apps = this.generateApps(SAMPLE_APPS);
        this.setApps(apps);
        return Promise.resolve();
    }
}
