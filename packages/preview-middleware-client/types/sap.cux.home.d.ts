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

declare module 'sap/ushell/ui/shell/SysInfoBar' {
    import Control from 'sap/ui/core/Control';

    interface SysInfoBarSettings {
        color?: string;
        icon?: string;
        text?: string;
        subText?: string;
    }

    export default class SysInfoBar extends Control {
        constructor(id?: string, settings?: SysInfoBarSettings);
    }
}

declare module "sap/cux/home/App" {
    import Element from "sap/ui/core/Element";
    export default class App extends Element {}
}

declare module 'sap/cux/home/BaseAppPanel' {
    import Control from 'sap/ui/core/Control';
    import App from 'sap/cux/home/App';

    export interface ICustomVisualization {
        appId?: string;
        url?: string;
        title?: string;
        subtitle?: string;
        BGColor?: string;
        icon?: string;
        vizId?: string;
        targetURL?: string;
    }

    export default abstract class BaseAppPanel extends Control {
        init(): void;
        abstract loadApps(): Promise<void>;
        generateApps(visualizationsData: ICustomVisualization[]): App[];
        setApps(apps: App[]): void;
    }
}
