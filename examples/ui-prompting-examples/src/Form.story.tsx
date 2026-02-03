import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Form' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.Form} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Form}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'GeneralInformationForm',
                    title: 'General Information',
                    metaPath: {
                        entitySet: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                        qualifier: '@com.sap.vocabularies.UI.v1.FieldGroup#GeneralInformation',
                        bindingContextType: 'absolute'
                    }
                }
            }}
        />
    );
};

export const WithContextPath = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Form}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'CustomerDetailsForm',
                    title: 'Customer Details',
                    contextPath: '/Customer',
                    metaPath: '@com.sap.vocabularies.UI.v1.FieldGroup#Details'
                }
            }}
        />
    );
};

export const WithReferenceFacet = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Form}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'AddressForm',
                    title: 'Address Information',
                    metaPath: {
                        entitySet: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                        qualifier: '@com.sap.vocabularies.UI.v1.ReferenceFacet#AddressDetails',
                        bindingContextType: 'relative'
                    }
                }
            }}
        />
    );
};

export const WithCollectionFacet = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Form}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'ContactForm',
                    title: 'Contact Information',
                    metaPath: {
                        entitySet: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                        qualifier: '@com.sap.vocabularies.UI.v1.CollectionFacet#ContactInfo',
                        bindingContextType: 'absolute'
                    }
                }
            }}
        />
    );
};

export const MinimalConfiguration = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Form}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'form',
                    id: 'SimpleForm'
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.Form} liveValidation={false} />;
};
