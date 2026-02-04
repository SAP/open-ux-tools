declare module 'sap/cux/home/NewsPanel' {
    import Control from 'sap/ui/core/Control';

    interface NewsPanelSettings {
        url?: string;
    }

    export default class NewsPanel extends Control {
        constructor(id?: string, settings?: NewsPanelSettings);
        constructor(settings?: NewsPanelSettings);
    }
}

declare module 'sap/cux/home/NewsContainer' {
    import Control from 'sap/ui/core/Control';

    interface NewsContainerSettings {
        content?: Control[];
    }

    export default class NewsContainer extends Control {
        constructor(id?: string, settings?: NewsContainerSettings);
        constructor(settings?: NewsContainerSettings);
    }
}

declare module 'sap/cux/home/NewsAndPagesContainer' {
    import Control from 'sap/ui/core/Control';

    interface NewsAndPagesContainerSettings {
        content?: Control[];
    }

    export default class NewsAndPagesContainer extends Control {
        constructor(id?: string, settings?: NewsAndPagesContainerSettings);
        constructor(settings?: NewsAndPagesContainerSettings);
    }
}
