import FlexChange from 'sap/ui/fl/Change';
import { getAddXMLAdditionalInfo, type AddXMLAdditionalInfo } from '../cpe/additional-change-info/add-xml-additional-info';
import { FlexChange as Change } from '../flp/common';

export function setAdditionalChangeInfoInSession(change: FlexChange<any> | undefined): void {
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
        sessionStorage.setItem(change.getDefinition().fileName, JSON.stringify(additionalChangeInfo));
    }
}

export function getAdditionalChangeInforFromSession(change: Change): AddXMLAdditionalInfo | undefined {
    const additionalChangeInfo = sessionStorage.getItem(change.fileName);
    if (additionalChangeInfo) {
        return JSON.parse(additionalChangeInfo);
    }

    return undefined;
}