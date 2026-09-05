// This is the production-supported subset of the pilot's governed SAP data-element map.
// Entries whose pilot role has no production value-bank contract are deliberately omitted.
const DATA_ELEMENTS_BY_ROLE: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
    ['country', ['BANKS', 'LAND1', 'LAND1_GP', 'AD_COMCTRY', 'AD_POBXCTY', 'INTCA', 'FOT_TAX_COUNTRY']],
    ['region', ['REGIO', 'AD_POBXREG', 'BLAND']],
    ['city', ['AD_CITY1', 'AD_CITY2', 'AD_CITY3', 'ORT01', 'ORT02', 'ORT01_GP', 'AD_MC_CITY']],
    ['street_address', ['AD_STREET', 'STRAS', 'STRAS_GP', 'AD_MC_STRT']],
    ['postal_code', ['AD_PSTCD1', 'AD_PSTCD2', 'AD_PSTCD3', 'PSTLZ', 'FARP_PSTLZ']],
    ['phone', ['AD_TLNMBR', 'AD_FXNMBR', 'AD_TELNRLG', 'TELF1', 'TELFX']],
    ['email', ['SMTP_ADDR', 'AD_SMTPADR']],
    ['org_name', ['BANKA', 'NAME1', 'NAME1_GP', 'BUTXT', 'AD_NAME1', 'BU_NAMEOR1', 'BU_NAMEOR2', 'BU_NAMEGR1']],
    ['currency', ['WAERS', 'WAERS_CURC', 'WAERS_V', 'WAERK']],
    ['unit_of_measure', ['MEINS', 'MSEHI', 'ISOCD_UNIT', 'MSEH3', 'FARR_QUANTITY_UNIT']],
    ['language', ['SPRAS', 'LANGU', 'DDLANGUAGE', 'BU_LANGU_CORR', 'EHFND_LANGU']],
    ['person_full_name', ['AD_NAMTEXT', 'BU_NAME1TX']],
    ['person_first_name', ['AD_NAMEFIR', 'BU_MCNAME2']],
    ['person_last_name', ['AD_NAMELAS', 'BU_MCNAME1']],
    ['product_name', ['PRODUCTDESCRIPTION', 'MAKTX']],
    [
        'description',
        [
            'VAL_TEXT',
            'LTEXT_CDS',
            'AS4TEXT',
            'EAMS_TEC_OBJ_DES',
            'AUFTEXT',
            'QKURZTEXT',
            'LTXA1',
            'PLTXT',
            'TEXT50',
            'TXT50_SKAT',
            'FARP_SGTXT',
            'KKATEXT_ABGSL',
            'FARP_LTEXT_003T',
            'DDTEXT'
        ]
    ],
    ['long_text', ['LTEXT']],
    ['order_status', ['J_STATUS', 'J_TXT30', 'J_TXT04']],
    ['timezone', ['TZNZONE']],
    ['iban', ['IBAN']],
    ['bic', ['SWIFT']]
];

const ROLE_BY_DATA_ELEMENT = new Map(
    DATA_ELEMENTS_BY_ROLE.flatMap(([role, dataElements]) => dataElements.map((dataElement) => [dataElement, role]))
);

/**
 * Resolve a language-independent ABAP Dictionary semantic key retained from the pilot.
 *
 * @param dataElement - SAP data-element identifier from EDMX or CSN evidence.
 * @returns A governed role supported by the production value banks.
 */
export function semanticRoleForSapDataElement(dataElement: string | undefined): string | undefined {
    return dataElement ? ROLE_BY_DATA_ELEMENT.get(dataElement.toUpperCase()) : undefined;
}
