import FlexChange from 'sap/ui/fl/Change';
import { getAddXMLAdditionalInfo, type AddXMLAdditionalInfo, type AddXMLChangeContent } from '../cpe/additional-change-info/add-xml-additional-info';
import { FlexChange as Change } from '../flp/common';

export function setAdditionalChangeInfoInSession(change: FlexChange<AddXMLChangeContent> | undefined): void {
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
        // eslint-disable-next-line fiori-custom/sap-no-sessionstorage
        sessionStorage.setItem(change.getDefinition().fileName, JSON.stringify(additionalChangeInfo));
    }
}

export function getAdditionalChangeInforFromSession(change: Change): AddXMLAdditionalInfo | undefined {
    // eslint-disable-next-line fiori-custom/sap-no-sessionstorage
    const additionalChangeInfo = sessionStorage.getItem(change.fileName);
    if (additionalChangeInfo) {
        return JSON.parse(additionalChangeInfo);
    }

    return undefined;
}