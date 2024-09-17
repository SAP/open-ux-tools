import type { Range } from '@sap-ux/text-document-utils';

/**
 * Value node
 */
export interface ValueNode<T> {
    value: T;
    range: Range;
}

/**
 * Text node
 */
export type TextNode = ValueNode<string>;

/**
 * i18n annotation node
 */
export interface I18nAnnotationNode {
    textType: ValueNode<SapTextType>;
    maxLength?: ValueNode<number>;
    /**
     * Note for translator
     */
    note?: TextNode;
}

/**
 * Annotations for the translation entry, which can contain additional metadata about the entry.
 */
export interface I18nAnnotation {
    textType: SapTextType;
    maxLength?: number;
    /**
     * Note for translator
     */
    note?: string;
}

/**
 * new i18n entry
 */
export interface NewI18nEntry {
    key: string;
    value: string;
    /**
     * Annotations for the translation entry, which can contain additional metadata about the entry
     */
    annotation?: I18nAnnotation | string;
}

/**
 * i18n entry
 */
export interface I18nEntry {
    filePath: string;
    key: TextNode;
    value: TextNode;
    /**
     * Annotations for the translation entry, which can contain additional metadata about the entry
     */
    annotation?: I18nAnnotationNode;
}

/**
 * i18n bundle
 */
export type I18nBundle = Record<string, I18nEntry[]>;

/**
 * Text types for texts that are less than 120 characters long
 * https://openui5.hana.ondemand.com/topic/831039835e7c4da3a8a0b49567573afe
 */
export enum SapShortTextType {
    Accessibility = 'XACT',
    AlternativeText = 'XALT',
    BreadcrumbStep = 'XBCB',
    BulletListItemText = 'XBLI',
    ButtonText = 'XBUT',
    Caption = 'XCAP',
    Cell = 'XCEL',
    Checkbox = 'XCKL',
    ColumnHeader = 'XCOL',
    Tabstrip = 'XCRD',
    DataNavigationText = 'XDAT',
    Label = 'XFLD',
    Frame = 'XFRM',
    Term = 'XGLS',
    GroupTitle = 'XGRP',
    Heading = 'XHED',
    LegendText = 'XLGD',
    HyperlinkText = 'XLNK',
    LogEntry = 'XLOG',
    ListBoxItem = 'XLST',
    MenuHeader = 'XMEN',
    MenuItem = 'XMIT',
    MessageText = 'XMSG',
    RadioButton = 'XRBL',
    RoadmapStep = 'XRMP',
    TableRowHeading = 'XROW',
    SelectionText = 'XSEL',
    TabStripText = 'XTBS',
    TableTitle = 'XTIT',
    TreeNodeText = 'XTND',
    QuickInfoText = 'XTOL',
    GeneralText = 'XTXT'
}

/**
 * Text types for texts that are more than 120 characters long
 * https://openui5.hana.ondemand.com/topic/831039835e7c4da3a8a0b49567573afe
 */
export enum SapLongTextType {
    Accessibility = 'YACT',
    BulletListItemText = 'YBLI',
    Definition = 'YDEF',
    Description = 'YDES',
    Explanation = 'YEXP',
    FaqAnswer = 'YFAA',
    Faq = 'YFAQ',
    GlossaryDefinition = 'YGLS',
    Information = 'YINF',
    Instruction = 'YINS',
    LogEntry = 'YLOG',
    ErrorMessage = 'YMSE',
    MessageText = 'YMSG',
    InformationMessageLong = 'YMSI',
    WarningMessage = 'YMSW',
    TechnicalText = 'YTEC',
    Ticker = 'YTIC',
    GeneralTextLong = 'YTXT'
}

export const NOT_RELEVANT_FOR_TRANSLATION = 'NOTR';

export type SapTextType = SapShortTextType | SapLongTextType | typeof NOT_RELEVANT_FOR_TRANSLATION;

/**
 * CDS environment.
 */
export interface CdsEnvironment {
    i18n?: CdsI18nEnv;
}

/**
 * CDS i18n configuration.
 */
export interface CdsI18nConfiguration {
    folders: string[];
    baseFileName: string;
    defaultLanguage: string;
    fallbackLanguage: string;
}

/**
 * CDS i18n environment.
 */
export interface CdsI18nEnv {
    folders?: string[];
    file?: string;
    default_language?: string;
    fallback_bundle?: string;
}
