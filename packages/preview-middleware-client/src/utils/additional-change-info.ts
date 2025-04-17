import FlexChange from 'sap/ui/fl/Change';
import {
    getAddXMLAdditionalInfo,
    type AddXMLAdditionalInfo,
    type AddXMLChangeContent
} from '../cpe/additional-change-info/add-xml-additional-info';
import { FlexChange as Change } from '../flp/common';

const additionalChangeInfoMap = new Map<string, AddXMLAdditionalInfo>();

export type AdditionalChangeInfo = AddXMLAdditionalInfo | undefined

export function setAdditionalChangeInfo(change: FlexChange<AddXMLChangeContent> | undefined): void {
    if (!change) {
        return;
    }

    let additionalChangeInfo;
    switch (change?.getChangeType?.()) {
        case 'addXML':
            additionalChangeInfo = getAddXMLAdditionalInfo(change);
            break;
    }

    if (additionalChangeInfo) {
        additionalChangeInfoMap.set(change.getDefinition().fileName, additionalChangeInfo);
    }
}

export function getAdditionalChangeInfo(change: Change): AdditionalChangeInfo {
    const additionalChangeInfo = additionalChangeInfoMap.get(change.fileName);
    if (additionalChangeInfo) {
        return additionalChangeInfo;
    }

    return undefined;
}
