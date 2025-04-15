import FlexChange from 'sap/ui/fl/Change';
import { getExtendedAddXMLChange } from './extend-add-xml-change';

export async function setExtendedChangeInSession(change: FlexChange<any>) {
    let extendedChangeContent;
    switch (change.getChangeType()) {
        case 'addXML':
            extendedChangeContent = getExtendedAddXMLChange(change);
            break;
    }

    if (extendedChangeContent) {
        sessionStorage.setItem(change.getDefinition().fileName, JSON.stringify(extendedChangeContent));
    }
}

export async function getExtendedChangeFromSession(change: FlexChange<any>) {
    const extendedChangeData = sessionStorage.getItem(change.getDefinition().fileName);
    let extendedChange;
    if (extendedChangeData) {
        extendedChange = JSON.parse(extendedChangeData);
    }

    return extendedChange;
}