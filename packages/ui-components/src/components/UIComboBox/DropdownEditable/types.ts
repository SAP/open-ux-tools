import { UIContextualMenuItem } from '../../UIContextualMenu';
import { UISelectableOption } from '../UIComboBox';

export interface UISelectableOptionWithSubValues extends UISelectableOption {
    options?: UIContextualMenuItem[];
    subValue?: UIContextualMenuItem;
    editable?: boolean;
    clone?: boolean;
    placeholder?: string;
}

export type OptionKey = string | number | string[] | number[] | null | undefined;

export interface SelectionUpdate {
    selection?: OptionKey;
    localSelection?: OptionKey;
    value?: string;
}

export interface SubMenuData {
    target: HTMLElement | null;
    option?: UISelectableOptionWithSubValues;
}
