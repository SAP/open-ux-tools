import { UIContextualMenuItem } from "../../UIContextualMenu";
import { UISelectableOption } from "../UIComboBox";

export interface UISelectableOptionWithSubValues extends UISelectableOption {
    options?: UIContextualMenuItem[];
    subValue?: UIContextualMenuItem;
    editable?: boolean;
    // editedValue?: string;
}
