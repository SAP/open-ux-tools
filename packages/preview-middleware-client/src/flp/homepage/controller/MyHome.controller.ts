import Controller from 'sap/ui/core/mvc/Controller';
import NewsPanel from 'sap/cux/home/NewsPanel';
import Log from 'sap/base/Log';
import Page from 'sap/m/Page';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Device from 'sap/ui/Device';
import DateFormat from 'sap/ui/core/format/DateFormat';
import Formatting from 'sap/base/i18n/Formatting';
import Locale from 'sap/ui/core/Locale';
import type ResourceBundle from 'sap/base/i18n/ResourceBundle';
import type ResourceModel from 'sap/ui/model/resource/ResourceModel';
import type Text from 'sap/m/Text';
import type NewsContainer from 'sap/cux/home/NewsContainer';
import type NewsAndPagesContainer from 'sap/cux/home/NewsAndPagesContainer';
import { getSalutationBarBackground } from '../utils/salutationBarUtils';
import Title from 'sap/m/Title';

/**
 * @namespace open.ux.preview.client.flp.homepage.controller.MyHome
 */
export default class MyHomeController extends Controller {
    private static readonly DeviceWidth = {
        Mobile: 600,
        Tablet: 1024,
        Desktop: 1280,
        LargeDesktop: 1440
    };

    private static calculateDeviceType(width: number): string {
        const { DeviceWidth } = MyHomeController;
        if (width < DeviceWidth.Mobile || Device.system.phone) {
            return 'Mobile';
        } else if (width < DeviceWidth.Tablet) {
            return 'Tablet';
        } else if (width < DeviceWidth.Desktop) {
            return 'Desktop';
        } else if (width < DeviceWidth.LargeDesktop) {
            return 'LargeDesktop';
        } else {
            return 'XLargeDesktop';
        }
    }
    onInit() {
        const view = this.getView();
        if (view) {
            const oViewModel = new JSONModel({
                deviceType: MyHomeController.calculateDeviceType(Device.resize.width),
                cards: []
            });
            view.setModel(oViewModel, 'view');

            Device.resize.attachHandler((oEvent: { width: number }) => {
                oViewModel.setProperty('/deviceType', MyHomeController.calculateDeviceType(oEvent.width));
                const salutationBar = this.byId('salutationBar');
                void this.applySalutationBarBackground(salutationBar?.getDomRef() as HTMLElement);
            });
        }

        void this.initSalutationBar();
        void this.initializeNewsContainer();
        void this.initializeInsightsContainer();
    }

    private getText(sKey: string, aArgs?: string[]): string {
        const view = this.getView();
        if (view) {
            const resourceModel = view.getModel('i18n') as ResourceModel;
            const resourceBundle = resourceModel?.getResourceBundle() as ResourceBundle;
            return resourceBundle?.getText(sKey, aArgs) ?? '';
        }
        return '';
    }

    private async initSalutationBar(): Promise<void> {
        const view = this.getView();
        if (!view) {
            return;
        }

        // set user name in greeting title
        const userInfoService = await sap.ushell.Container.getServiceAsync('UserInfo');
        const userName = (userInfoService as { getFirstName(): string }).getFirstName() || '';
        const greetingTitle = this.byId('greetingTitle') as Text;
        greetingTitle?.setText(this.getText('greetingTitle', [userName]));

        // set date
        const headerDateText = this.byId('headerDate') as Text;
        const date = this.formatDate(Date.now());
        headerDateText?.setText(date);

        //apply background to salutation bar
        const salutationBar = this.byId('salutationBar');
        salutationBar?.addEventDelegate(
            {
                onAfterRendering: () => {
                    void this.applySalutationBarBackground(salutationBar.getDomRef() as HTMLElement);
                }
            },
            this
        );
    }

    private formatDate(date: number): string {
        const locale = new Locale(Formatting.getLanguageTag().language);
        const dateInstance = DateFormat.getDateInstance({ style: 'full' }, locale);
        return dateInstance.format(new Date(date)) || '';
    }

    private async applySalutationBarBackground(salutationBarElement: HTMLElement) {
        const deviceType = MyHomeController.calculateDeviceType(Device.resize.width);
        const isLargeScreen =
            deviceType === 'Desktop' || deviceType === 'LargeDesktop' || deviceType === 'XLargeDesktop';
        const background = await getSalutationBarBackground(!isLargeScreen);

        if (salutationBarElement) {
            salutationBarElement.style.background = background;
            salutationBarElement.style.backgroundSize = isLargeScreen
                ? 'auto, cover, auto, cover'
                : 'cover, auto, cover';
        }
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
            const newsContainer = new NewsContainerClass(view.createId('newsContainer'), {
                content: [new NewsPanel(view.createId('news'), { url: '/homepage/news' })]
            }).addStyleClass('homeNewsContainer');

            const page = view.byId('page') as Page;
            page?.insertContent(newsContainer, 0);
        }
    }

    private async initializeInsightsContainer() {
        try {
            const response = await fetch('/cards/store');
            if (!response.ok) {
                Log.error('Failed to load insights data: ' + response.statusText);
                return;
            }

            const cards = await response.json() as object[];
            const view = this.getView();
            if (!view) {
                return;
            }

            const viewModel = view.getModel('view') as JSONModel;
            viewModel?.setProperty('/cards', cards);
            (view.byId('insightsTitle') as Title)?.setText(
                this.getText('insightsTitleWithCount', [String(cards.length)])
            );
        } catch (error: unknown) {
            Log.error('Failed to load insights data', error instanceof Error ? error : new Error(String(error)));
        }
    }
}
