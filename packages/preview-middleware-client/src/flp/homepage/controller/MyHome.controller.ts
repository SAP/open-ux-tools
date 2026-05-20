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
import Text from 'sap/m/Text';
import type NewsContainer from 'sap/cux/home/NewsContainer';
import type NewsAndPagesContainer from 'sap/cux/home/NewsAndPagesContainer';
import { getSalutationBarBackground } from '../utils/salutationBarUtils';
import Title from 'sap/m/Title';
import GridContainer from 'sap/f/GridContainer';
import UI5Element from 'sap/ui/core/Element';
import SysInfoBar from 'sap/ushell/ui/shell/SysInfoBar';
import { GenericTileScope, PlacementType } from 'sap/m/library';
import GenericTile from 'sap/m/GenericTile';
import App from 'sap/cux/home/App';
import Event from 'sap/ui/base/Event';
import Control from 'sap/ui/core/Control';
import Popover from 'sap/m/Popover';
import List from 'sap/m/List';
import StandardListItem from 'sap/m/StandardListItem';
import HBox from 'sap/m/HBox';
import Icon from 'sap/ui/core/Icon';
import { Button$PressEvent } from 'sap/m/Button';

interface CardConfig {
    containerWidth: number;
    totalCards: number;
    minWidth: number;
    maxWidth: number;
    gap: number;
}

/**
 * @namespace open.ux.preview.client.flp.homepage.controller.MyHome
 */
export default class MyHomeController extends Controller {
    private static readonly HERO_BANNER_MIN_UI5_VERSION = 149;
    private static readonly CARDS_GAP = 16;
    private static readonly MIN_CARD_WIDTH = 304;
    private static readonly MIN_CARD_WIDTH_NARROW = 285;
    private static readonly MAX_CARD_WIDTH = 583;
    private static readonly NARROW_BREAKPOINT = 320;
    private static readonly MOBILE_CARD_WIDTH_REM = 19;
    private static readonly MOBILE_CARD_HEIGHT_REM = 25.5;
    private static readonly DEFAULT_CARD_HEIGHT_REM = 33;

    private static readonly DeviceWidth = {
        Mobile: 600,
        Tablet: 1024,
        Desktop: 1280,
        LargeDesktop: 1440
    };

    private terminalWarningsPopover: Popover | undefined;
    private insightsActionsPopover: Popover | undefined;
    private useHeroBanner: boolean = false;

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

    private static calculateCardWidth(config: CardConfig): number {
        const { containerWidth, totalCards, minWidth, maxWidth, gap } = config;

        const maxColumns = Math.floor((containerWidth + gap) / (minWidth + gap));
        const columns = Math.min(maxColumns, totalCards);

        if (columns <= 0) {
            return minWidth;
        }

        const totalGap = (columns - 1) * gap;
        const cardWidth = (containerWidth - totalGap) / columns;

        return Math.min(Math.max(cardWidth, minWidth), maxWidth);
    }

    private static fetchElementProperties(element: Element, properties: string[]): Record<string, number> {
        const style = window.getComputedStyle(element);
        const result: Record<string, number> = {};
        properties.forEach((prop) => {
            result[prop] = parseFloat(style.getPropertyValue(prop)) || 0;
        });
        return result;
    }

    onInit() {
        const view = this.getView();
        if (view) {
            const oViewModel = new JSONModel({
                deviceType: MyHomeController.calculateDeviceType(Device.resize.width),
                insightsCardWidth: `${MyHomeController.MIN_CARD_WIDTH / 16}rem`,
                insightsCardHeight: `${MyHomeController.DEFAULT_CARD_HEIGHT_REM}rem`,
                cards: [],
                hasWarnings: false,
                warnings: []
            });
            view.setModel(oViewModel, 'view');

            Device.resize.attachHandler((oEvent: { width: number }) => {
                oViewModel.setProperty('/deviceType', MyHomeController.calculateDeviceType(oEvent.width));
                this._updateInsightsCardWidth();
                if (!this.useHeroBanner) {
                    const salutationBar = this.byId('salutationBar');
                    void this.applySalutationBarBackground(salutationBar?.getDomRef() as HTMLElement);
                }
            });
        }

        this.setupSystemInfoBar();
        void this.initSalutationBar();
        void this.initializeNewsContainer();
        void this.initializeInsightsContainer();
        void this.fetchWarnings();
    }

    onBeforeRendering(): void {
        const favAppsPanel = this.byId('favoriteApps') as UI5Element;
        favAppsPanel.setProperty('title', 'Previews');
        favAppsPanel.removeAllAggregation('menuItems');
        favAppsPanel.removeAllAggregation('actionButtons');
    }

    private setupSystemInfoBar(): void {
        const systemInfoHtml = '<div id="systemInfo-shellArea"></div>';
        // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access, @sap-ux/fiori-tools/sap-browser-api-warning
        const shellHeaderShellArea = document.getElementById('shell-header');
        shellHeaderShellArea?.insertAdjacentHTML('beforebegin', systemInfoHtml);

        new SysInfoBar('sysInfoBar', {
            icon: 'sap-icon://source-code',
            text: this.getText('infoBarText'),
            subText: this.getText('infoBarSubText', [sap.ui.version]),
            color: 'orange'
        }).placeAt('systemInfo-shellArea');
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

        const salutationBar = this.byId('salutationBar') as Control | undefined;
        const ui5MinorVersion = parseInt(sap.ui.version.split('.')[1], 10);
        this.useHeroBanner = ui5MinorVersion >= MyHomeController.HERO_BANNER_MIN_UI5_VERSION;

        if (this.useHeroBanner) {
            salutationBar?.addStyleClass('salutationBar--heroBanner');
        } else {
            salutationBar?.addEventDelegate(
                {
                    onAfterRendering: () => {
                        void this.applySalutationBarBackground(salutationBar.getDomRef() as HTMLElement);
                    }
                },
                this
            );
        }
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
            page?.insertContent(newsContainer, 1);
        }
    }

    /**
     * Calculates and updates the insights card column width based on the current container dimensions.
     */
    private _updateInsightsCardWidth(): void {
        const view = this.getView();
        const viewModel = view?.getModel('view') as JSONModel;
        const gridContainer = this.byId('insightsCardContainer') as GridContainer;
        const layoutDomRef = gridContainer?.getDomRef();

        if (!layoutDomRef) {
            return;
        }

        const domProperties = MyHomeController.fetchElementProperties(layoutDomRef, ['width', 'padding-left', 'padding-right']);
        const availableWidth = domProperties.width - domProperties['padding-left'] - domProperties['padding-right'];

        const isMobile = Device.system.phone;
        let cardWidthRem: string;

        if (isMobile) {
            cardWidthRem = `${MyHomeController.MOBILE_CARD_WIDTH_REM}rem`;
        } else {
            const cards = (viewModel.getProperty('/cards') as object[]) || [];
            const cardLayoutConfig: CardConfig = {
                containerWidth: availableWidth,
                totalCards: cards.length || 1,
                minWidth: availableWidth <= MyHomeController.NARROW_BREAKPOINT ? MyHomeController.MIN_CARD_WIDTH_NARROW : MyHomeController.MIN_CARD_WIDTH,
                maxWidth: MyHomeController.MAX_CARD_WIDTH,
                gap: MyHomeController.CARDS_GAP
            };
            const cardWidth = MyHomeController.calculateCardWidth(cardLayoutConfig);
            cardWidthRem = `${cardWidth / 16}rem`;
        }

        viewModel.setProperty('/insightsCardWidth', cardWidthRem);
        viewModel.setProperty(
            '/insightsCardHeight',
            `${isMobile ? MyHomeController.MOBILE_CARD_HEIGHT_REM : MyHomeController.DEFAULT_CARD_HEIGHT_REM}rem`
        );
    }

    private async initializeInsightsContainer() {
        const gridContainer = this.byId('insightsCardContainer') as GridContainer;
        gridContainer?.addEventDelegate(
            {
                onAfterRendering: () => {
                    this._updateInsightsCardWidth();
                }
            },
            this
        );

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

            const cardCount = cards.length;
            const viewModel = view.getModel('view') as JSONModel;
            viewModel?.setProperty('/cards', cards);
            (view.byId('insightsTitle') as Title)?.setText(
                `${this.getText('insightsTitle')}${cardCount > 0 ? ` (${cardCount})` : ''}`
            );
        } catch (error: unknown) {
            Log.error('Failed to load insights data', error instanceof Error ? error : new Error(String(error)));
        }
    }

    onAppsLoaded(event: Event<{ apps: App[], tiles: GenericTile[] }>) {
        const tiles = event.getParameter('tiles');
        tiles.forEach((tile, index) => {
            if (!tile.getId().includes('sampleApps')) {
                // eslint-disable-next-line @sap-ux/fiori-tools/sap-timeout-usage
                setTimeout(() => {
                    // apply color to the preview app
                    if (index === 0) {
                        tile.setBackgroundColor('sapLegendColor12');
                    }
                }, 100);
            }

            // prevent tile-level actions
            tile.setScope(GenericTileScope.Display)

            // remove dnd configuration from parent
            const parentContainer = tile.getParent() as Control;
            if (parentContainer?.getAggregation('dragDropConfig')) {
                parentContainer.removeAllAggregation('dragDropConfig');
            }
        });
    }

    onTerminalWarningsButtonPress(event: Button$PressEvent): void {
        if (!this.terminalWarningsPopover) {
            this.terminalWarningsPopover = this.createTerminalWarningsPopover();
        }
        const button = event.getSource();
        this.terminalWarningsPopover.openBy(button);
    }

    private createTerminalWarningsPopover(): Popover {
        const warningsList = new List({
            items: {
                path: 'view>/warnings',
                template: new StandardListItem({
                    title: '{view>message}'
                })
            }
        });

        const popover = new Popover({
            contentWidth: '528px',
            customHeader: new HBox({
                alignItems: 'Center',
                items: [
                    new Icon({ src: 'sap-icon://alert', color: '#e76500' }).addStyleClass('sapUiTinyMarginEnd'),
                    new Title({ text: this.getText('terminalMessagesDialogTitle'), level: 'H5' })
                ]
            }).addStyleClass('sapUiTinyMargin'),
            content: [warningsList],
            placement: PlacementType.HorizontalPreferredLeft
        }).addStyleClass('terminalWarningsPopover');

        const view = this.getView();
        if (view) {
            popover.setModel(view.getModel('view'), 'view');
        }

        return popover;
    }

    onInsightsActionsButtonPress(event: Button$PressEvent): void {
        if (!this.insightsActionsPopover) {
            this.insightsActionsPopover = this.createInsightsActionsPopover();
        }
        const button = event.getSource();
        this.insightsActionsPopover.openBy(button);
    }

    private createInsightsActionsPopover(): Popover {
        const actionsList = new List({
            items: [
                new StandardListItem({
                    title: this.getText('refreshInsightsCards'),
                    icon: 'sap-icon://refresh',
                    type: 'Active',
                    press: () => {
                        this.insightsActionsPopover?.close();
                        void this.initializeInsightsContainer();
                    }
                })
            ]
        });

        return new Popover({
            showHeader: false,
            content: [actionsList],
            placement: PlacementType.Bottom
        });
    }

    private async fetchWarnings(): Promise<void> {
        try {
            const response = await fetch('/homepage/warnings');
            if (!response.ok) {
                Log.error('Failed to fetch terminal warnings: ' + response.statusText);
                return;
            }
            const warnings = (await response.json()) as { message: string }[];
            const viewModel = this.getView()?.getModel('view') as JSONModel;
            viewModel?.setProperty('/warnings', warnings);
            viewModel?.setProperty('/hasWarnings', warnings.length > 0);
        } catch (error: unknown) {
            Log.error('Failed to fetch terminal warnings', error instanceof Error ? error : new Error(String(error)));
        }
    }

}
