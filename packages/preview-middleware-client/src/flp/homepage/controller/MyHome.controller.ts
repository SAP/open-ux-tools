import Controller from 'sap/ui/core/mvc/Controller';
import NewsPanel from 'sap/cux/home/NewsPanel';
import Log from 'sap/base/Log';
import Page from 'sap/m/Page';
import type NewsContainer from 'sap/cux/home/NewsContainer';
import type NewsAndPagesContainer from 'sap/cux/home/NewsAndPagesContainer';

/**
 * @namespace open.ux.preview.client.flp.homepage.controller.MyHome
 */
export default class MyHomeController extends Controller {
    onInit() {
        void this.initializeNewsContainer();
    }

    private async initializeNewsContainer() {
        // Determine which NewsContainer to use based on availability
        let NewsContainerClass: typeof NewsContainer | typeof NewsAndPagesContainer;
        try {
            NewsContainerClass = (await import('sap/cux/home/NewsContainer')).default;
        } catch (e: unknown) {
            Log.info((e as Error)?.message);
            NewsContainerClass = (await import('sap/cux/home/NewsAndPagesContainer')).default;
        }

        const view = this.getView();
        if (view) {
            const newsContainer = new NewsContainerClass(`${view.getId()}-newsContainer`, {
                content: [
                    new NewsPanel(`${view.getId()}-news`, {
                        url: 'https://sapui5untested.int.sap.eu2.hana.ondemand.com/databinding/proxy/https/news.sap.com/feed'
                    })
                ]
            }).addStyleClass('homeNewsContainer');

            const page = view.byId('page') as Page;
            page?.insertContent(newsContainer, 0);
        }
    }
}
