import { Manifest } from '@sap-ux/project-access';

export function assertInboundsHasConfig(
    crossNavigation: Manifest['sap.app']['crossNavigation'],
    {
        semanticObject,
        action,
        title,
        subTitle
    }: {
        semanticObject?: string;
        action?: string;
        title?: string;
        subTitle?: string;
    },
    i18KeyFormat = false
): void {
    const key = `${semanticObject}-${action}`;
    const expectedInboundConfig = {
        [key]: {
            signature: {
                parameters: {},
                additionalParameters: 'allowed'
            },
            semanticObject,
            action,
            title: i18KeyFormat ? `{{flpTitle}}` : title
        }
    };
    if (subTitle) {
        Object.assign(expectedInboundConfig[key], { subTitle: i18KeyFormat ? `{{flpSubtitle}}` : subTitle });
    }
    expect(crossNavigation!.inbounds[key]).toBeDefined();
    expect(crossNavigation!.inbounds[key]).toEqual(expect.objectContaining(expectedInboundConfig[key]));
}
