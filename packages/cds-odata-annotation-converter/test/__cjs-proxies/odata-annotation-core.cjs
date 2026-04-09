"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/odata-annotation-core/dist/index.js
var index_exports = {};
__export(index_exports, {
  ACTION_IMPORT_KIND: () => ACTION_IMPORT_KIND,
  ACTION_KIND: () => ACTION_KIND,
  ANNOTATION_FILE_TYPE: () => ANNOTATION_FILE_TYPE,
  ASSOCIATION_KIND: () => ASSOCIATION_KIND,
  ASSOCIATION_SET_KIND: () => ASSOCIATION_SET_KIND,
  ATTRIBUTE_NOT_ALLOWED_HERE: () => ATTRIBUTE_NOT_ALLOWED_HERE,
  ATTRIBUTE_TYPE: () => ATTRIBUTE_TYPE,
  COLLECTION_KIND: () => COLLECTION_KIND,
  COMMON_CASE_ISSUE: () => COMMON_CASE_ISSUE,
  COMPLEX_TYPE_KIND: () => COMPLEX_TYPE_KIND,
  DEPRECATED_$VALUE_SYNTAX: () => DEPRECATED_$VALUE_SYNTAX,
  Diagnostic: () => Diagnostic,
  DiagnosticSeverity: () => DiagnosticSeverity,
  DiagnosticTag: () => DiagnosticTag,
  EDMX_ELEMENT_NAMES: () => EDMX_ELEMENT_NAMES,
  EDMX_NAMESPACE_ALIAS: () => EDMX_NAMESPACE_ALIAS,
  EDM_NAMESPACE_ALIAS: () => EDM_NAMESPACE_ALIAS,
  ELEMENT_TYPE: () => ELEMENT_TYPE,
  ENTITY_CONTAINER_KIND: () => ENTITY_CONTAINER_KIND,
  ENTITY_SET_KIND: () => ENTITY_SET_KIND,
  ENTITY_TYPE_KIND: () => ENTITY_TYPE_KIND,
  ENUM_TYPE_KIND: () => ENUM_TYPE_KIND,
  Edm: () => Edm,
  EdmType: () => EdmType,
  Edmx: () => Edmx,
  EdmxElementName: () => EdmxElementName,
  EdmxIncludeElementAttributeName: () => EdmxIncludeElementAttributeName,
  EdmxReferenceElementAttributeName: () => EdmxReferenceElementAttributeName,
  FUNCTION_IMPORT_KIND: () => FUNCTION_IMPORT_KIND,
  FUNCTION_KIND: () => FUNCTION_KIND,
  GHOST_FILENAME_PREFIX: () => GHOST_FILENAME_PREFIX,
  IGNORE_DUPLICATE: () => IGNORE_DUPLICATE,
  IGNORE_TARGET_VALIDATION: () => IGNORE_TARGET_VALIDATION,
  INCOMPLETE_EXPRESSION_CC_FORWARD_SLASH: () => INCOMPLETE_EXPRESSION_CC_FORWARD_SLASH,
  INCOMPLETE_EXPRESSION_FORWARD_SLASH: () => INCOMPLETE_EXPRESSION_FORWARD_SLASH,
  INCOMPLETE_PATH_WITH_COMPATIBLE_TYPES: () => INCOMPLETE_PATH_WITH_COMPATIBLE_TYPES,
  INCOMPLETE_PATH_WITH_TYPE: () => INCOMPLETE_PATH_WITH_TYPE,
  INVALID_ENUM_MEMBER_TYPE: () => INVALID_ENUM_MEMBER_TYPE,
  INVALID_PATH_EXPRESSION: () => INVALID_PATH_EXPRESSION,
  INVALID_PRIMITIVE_TYPE: () => INVALID_PRIMITIVE_TYPE,
  INVALID_TYPE_TYPE: () => INVALID_TYPE_TYPE,
  Location: () => Location,
  MISSING_I18N_KEY: () => MISSING_I18N_KEY,
  MISSING_REQUIRED_ATTRIBUTE: () => MISSING_REQUIRED_ATTRIBUTE,
  MISSING_REQUIRED_PROPERTY: () => MISSING_REQUIRED_PROPERTY,
  MISSING_REQUIRED_VALUE_FOR_ATTRIBUTE: () => MISSING_REQUIRED_VALUE_FOR_ATTRIBUTE,
  MultilineType: () => MultilineType,
  NAMESPACE_TYPE: () => NAMESPACE_TYPE,
  NAME_CASE_ISSUE_PATH_VALUE: () => NAME_CASE_ISSUE_PATH_VALUE,
  NAVIGATION_PROPERTY_KIND: () => NAVIGATION_PROPERTY_KIND,
  NOT_IN_APPLICABLE_TERMS_CONSTRAINT: () => NOT_IN_APPLICABLE_TERMS_CONSTRAINT,
  NO_UNDEFINED_NAMESPACE_TYPE: () => NO_UNDEFINED_NAMESPACE_TYPE,
  NO_UNUSED_NAMESPACE_TYPE: () => NO_UNUSED_NAMESPACE_TYPE,
  NO_VALIDATION_FOR_SUBNODES: () => NO_VALIDATION_FOR_SUBNODES,
  NO_WHITESPACE_IN_PATH_EXPRESSION: () => NO_WHITESPACE_IN_PATH_EXPRESSION,
  ODATA_FUNCTION_WRONG_RETURN_TYPE: () => ODATA_FUNCTION_WRONG_RETURN_TYPE,
  ODATA_PATH_SEPARATOR_RULE: () => ODATA_PATH_SEPARATOR_RULE,
  PROPERTY_KIND: () => PROPERTY_KIND,
  Position: () => Position,
  RECORD_COLLECTION_PATH_NOT_ALLOWED: () => RECORD_COLLECTION_PATH_NOT_ALLOWED,
  REFERENCE_TYPE: () => REFERENCE_TYPE,
  Range: () => Range,
  SINGLETON_KIND: () => SINGLETON_KIND,
  TARGET_TYPE: () => TARGET_TYPE,
  TERM_KIND: () => TERM_KIND,
  TERM_NOT_APPLICABLE: () => TERM_NOT_APPLICABLE,
  TEXT_TYPE: () => TEXT_TYPE,
  TYPE_DEFINITION_KIND: () => TYPE_DEFINITION_KIND,
  TextEdit: () => TextEdit,
  UNKNOWN_TERM: () => UNKNOWN_TERM,
  UN_SUPPORTED_VOCABULARY: () => UN_SUPPORTED_VOCABULARY,
  VALUE_REQUIRED: () => VALUE_REQUIRED,
  WorkspaceEdit: () => WorkspaceEdit,
  cacheKeyAnyTermName: () => cacheKeyAnyTermName,
  createAttributeNode: () => createAttributeNode,
  createElementNode: () => createElementNode,
  createNamespace: () => createNamespace,
  createReference: () => createReference,
  createTarget: () => createTarget,
  createTextNode: () => createTextNode,
  elements: () => elements,
  elementsWithName: () => elementsWithName,
  findPathToPosition: () => findPathToPosition,
  getAliasInformation: () => getAliasInformation,
  getAllNamespacesAndReferences: () => getAllNamespacesAndReferences,
  getElementAttribute: () => getElementAttribute,
  getElementAttributeValue: () => getElementAttributeValue,
  getIndentLevel: () => getIndentLevel,
  getPathBaseMetadataElement: () => getPathBaseMetadataElement,
  getPositionData: () => getPositionData,
  getSegmentWithoutAlias: () => getSegmentWithoutAlias,
  getSingleTextNode: () => getSingleTextNode,
  indent: () => indent,
  isBefore: () => isBefore,
  isElementWithName: () => isElementWithName,
  parseIdentifier: () => parseIdentifier,
  parsePath: () => parsePath,
  positionAt: () => positionAt,
  positionContained: () => positionContained,
  positionContainedStrict: () => positionContainedStrict,
  printOptions: () => printOptions,
  rangeContained: () => rangeContained,
  resolveName: () => resolveName,
  toAliasQualifiedName: () => toAliasQualifiedName,
  toFullyQualifiedName: () => toFullyQualifiedName,
  toFullyQualifiedPath: () => toFullyQualifiedPath,
  wrapInQuotes: () => wrapInQuotes
});
module.exports = __toCommonJS(index_exports);

// packages/odata-annotation-core/dist/names/parse.js
var COLLECTION_PREFIX = "Collection(";
function parseIdentifier(identifier) {
  if (identifier.startsWith(COLLECTION_PREFIX)) {
    return parseCollection(identifier);
  }
  const parameterStartIndex = identifier.indexOf("(") + 1;
  if (parameterStartIndex > 0) {
    const functionNameIdentifier = identifier.slice(0, parameterStartIndex - 1);
    const parameterString = identifier.slice(parameterStartIndex, -1);
    const parsedIdentifier = parseInternal(functionNameIdentifier);
    const parameters = parameterString.length > 0 ? parameterString.split(",").map((parameter) => parameter.startsWith(COLLECTION_PREFIX) ? parseCollection(parameter) : parseInternal(parameter)) : [];
    return { ...parsedIdentifier, type: "action-function", parameters };
  }
  return parseInternal(identifier);
}
function parseCollection(identifier) {
  const substringEndIndex = identifier.endsWith(")") ? -1 : void 0;
  const parsedIdentifier = parseInternal(identifier.slice(COLLECTION_PREFIX.length, substringEndIndex));
  return { ...parsedIdentifier, type: "collection" };
}
function parseInternal(identifier) {
  const parts = identifier.split(".");
  if (parts.length > 1) {
    return {
      type: "identifier",
      namespaceOrAlias: parts.slice(0, -1).join("."),
      name: parts.splice(-1)[0]
    };
  } else {
    return {
      type: "identifier",
      name: identifier
    };
  }
}

// packages/odata-annotation-core/dist/names/normalization.js
function toFullyQualifiedName(namespaceMap, currentNamespace, identifier) {
  const namespace = identifier.namespaceOrAlias ? namespaceMap[identifier.namespaceOrAlias] : currentNamespace;
  if (!namespace) {
    return void 0;
  }
  if (identifier.type === "action-function") {
    const parameters = identifier.parameters.map((parameter) => toFullyQualifiedName(namespaceMap, currentNamespace, parameter)).filter((parameter) => !!parameter).join(",");
    return `${namespace}.${identifier.name}(${parameters})`;
  }
  const fullyQualifiedName = `${namespace}.${identifier.name}`;
  if (identifier.type === "collection") {
    return `Collection(${fullyQualifiedName})`;
  }
  return fullyQualifiedName;
}
function resolveName(qualifiedName, aliasMap) {
  const resolvedName = { name: qualifiedName, qName: qualifiedName };
  if (qualifiedName && typeof qualifiedName === "string" && qualifiedName.indexOf(".")) {
    const indexFirstBracket = qualifiedName.indexOf("(");
    const nameBeforeBracket = indexFirstBracket > -1 ? qualifiedName.slice(0, indexFirstBracket) : qualifiedName;
    const { name, namespaceOrAlias: namespace } = parseIdentifier(nameBeforeBracket);
    resolveNonCollectionNames(qualifiedName, namespace, aliasMap, resolvedName, name);
    resolveCollectionAndFunctionNames(qualifiedName, indexFirstBracket, aliasMap, resolvedName, namespace);
  }
  return resolvedName;
}
function toAliasQualifiedName(qualifiedName, aliasInfo) {
  const resolvedName = resolveName(qualifiedName, aliasInfo.aliasMap);
  const alias = resolvedName.namespace ? aliasInfo.reverseAliasMap[resolvedName.namespace] : void 0;
  let aliasQualifiedName = alias ? `${alias}.${resolvedName.name}` : qualifiedName;
  const indexFirstBracket = aliasQualifiedName.indexOf("(");
  if (indexFirstBracket > -1) {
    const beforeBracket = aliasQualifiedName.slice(0, indexFirstBracket);
    const bracketContent = aliasQualifiedName.slice(indexFirstBracket + 1, aliasQualifiedName.lastIndexOf(")"));
    let bracketEntries = bracketContent.split(",");
    bracketEntries = bracketEntries.map((qName) => toAliasQualifiedName(qName, aliasInfo));
    aliasQualifiedName = beforeBracket + "(" + bracketEntries.join(",") + ")";
  }
  return aliasQualifiedName;
}
function resolveNonCollectionNames(qualifiedName, namespace, aliasMap, resolvedName, name) {
  if (!qualifiedName.startsWith(COLLECTION_PREFIX)) {
    if (namespace && aliasMap?.[namespace]) {
      if (aliasMap[namespace] && aliasMap[namespace] !== namespace) {
        resolvedName.alias = namespace;
        resolvedName.namespace = aliasMap[namespace];
      } else {
        resolvedName.namespace = namespace;
      }
      resolvedName.name = name;
      resolvedName.qName = resolvedName.namespace + "." + name;
    } else if (!aliasMap) {
      resolvedName.name = name;
      resolvedName.namespace = namespace;
    }
  }
}
function resolveCollectionAndFunctionNames(qualifiedName, indexFirstBracket, aliasMap, resolvedName, namespace) {
  if (indexFirstBracket > -1) {
    const bracketContent = qualifiedName.slice(indexFirstBracket + 1, qualifiedName.lastIndexOf(")"));
    const identifier = parseIdentifier(qualifiedName);
    if (identifier.type !== "collection") {
      resolvedName.name += "(" + bracketContent + ")";
    }
    if (namespace && aliasMap?.[namespace]) {
      if (identifier.type === "collection") {
        const name = `${identifier.namespaceOrAlias}.${identifier.name}`;
        const valueType = convertValueTypeFromString(identifier.type, name);
        valueType.name = resolveName(valueType.name, aliasMap).qName;
        const bracketEntriesResolved = convertValueTypeToString(valueType);
        resolvedName.qName = bracketEntriesResolved;
      } else if (identifier.type === "action-function") {
        const bracketEntriesResolved = identifier.parameters.map((param) => {
          const name = `${param.namespaceOrAlias}.${param.name}`;
          const valueType = convertValueTypeFromString(param.type, name);
          valueType.name = resolveName(valueType.name, aliasMap).qName;
          return convertValueTypeToString(valueType);
        });
        resolvedName.qName += "(" + bracketEntriesResolved.join(",") + ")";
      }
    } else if (identifier.type === "collection") {
      const qName = resolveName(bracketContent, aliasMap).qName;
      resolvedName.qName = "Collection(" + qName + ")";
    }
  }
}
function convertValueTypeToString(valueType) {
  return valueType?.asCollection ? "Collection(" + valueType.name + ")" : valueType?.name || "";
}
function convertValueTypeFromString(paramType, name) {
  const valueType = { name, asCollection: paramType === "collection" };
  return valueType;
}

// packages/odata-annotation-core/dist/names/namespaces.js
function getAliasInformation(namespaces, metadataNamespaces) {
  const aliasMap = {};
  const reverseAliasMap = {};
  const aliasMapMetadata = {};
  const aliasMapVocabulary = {};
  let currentFileNamespace = "";
  let currentFileAlias = "";
  namespaces.forEach((namespace) => {
    const aliasEntry = {};
    const reverseAliasEntry = {};
    if (namespace?.name) {
      aliasEntry[namespace.name] = namespace.name;
      reverseAliasEntry[namespace.name] = namespace.name;
      if (namespace.alias) {
        aliasEntry[namespace.alias] = namespace.name;
        reverseAliasEntry[namespace.name] = namespace.alias;
      }
      Object.assign(aliasMap, aliasEntry);
      Object.assign(reverseAliasMap, reverseAliasEntry);
      const forMetadata = metadataNamespaces.has(namespace.name);
      if (namespace.type === "namespace") {
        currentFileNamespace = namespace.name;
        currentFileAlias = namespace.alias ?? "";
        if (forMetadata) {
          Object.assign(aliasMapMetadata, aliasEntry);
        }
      } else {
        Object.assign(forMetadata ? aliasMapMetadata : aliasMapVocabulary, aliasEntry);
      }
    }
  });
  return {
    currentFileNamespace,
    currentFileAlias,
    aliasMap,
    reverseAliasMap,
    aliasMapMetadata,
    aliasMapVocabulary
  };
}
function getAllNamespacesAndReferences(namespace, references) {
  const result = [];
  if (namespace?.name) {
    result.push(namespace);
  }
  if (references?.length) {
    result.push(...references);
  }
  return result;
}

// packages/odata-annotation-core/dist/paths/parse.js
var PATH_SEPARATOR = "/";
function parsePath(path) {
  const segments = path.split(PATH_SEPARATOR).map((segment) => {
    const termCastStartIndex = segment.indexOf("@");
    if (termCastStartIndex === 0) {
      const [term, qualifier] = segment.slice(1).split("#");
      const termCastIdentifier = parseIdentifier(term);
      return {
        ...termCastIdentifier,
        type: "term-cast",
        qualifier
      };
    } else if (termCastStartIndex > 0) {
      const [name, termCast] = segment.split("@");
      const termCastIdentifier = parseIdentifier(name);
      const [term, qualifier] = termCast.split("#");
      return {
        ...termCastIdentifier,
        type: "navigation-property-annotation",
        term: {
          ...parseIdentifier(term),
          type: "term-cast",
          qualifier
        }
      };
    }
    const identifier = parseIdentifier(segment);
    if (identifier.type === "identifier" || identifier.type === "action-function") {
      return identifier;
    }
    return void 0;
  }).filter((segment) => !!segment);
  return {
    segments
  };
}

// packages/odata-annotation-core/dist/paths/normalization.js
function toFullyQualifiedPath(namespaceMap, currentNamespace, path) {
  return path.segments.map((segment) => toFullyQualifiedPathSegment(namespaceMap, currentNamespace, segment)).join(PATH_SEPARATOR);
}
function toFullyQualifiedPathSegment(namespaceMap, currentNamespace, segment) {
  const namespace = segment.namespaceOrAlias ? namespaceMap[segment.namespaceOrAlias] : currentNamespace;
  switch (segment.type) {
    case "action-function": {
      const parameters = segment.parameters.map((parameter) => toFullyQualifiedName(namespaceMap, currentNamespace, parameter)).filter((parameter) => !!parameter).join(",");
      return `${namespace ?? segment.namespaceOrAlias}.${segment.name}(${parameters})`;
    }
    case "identifier":
      if (segment.namespaceOrAlias === void 0) {
        return segment.name;
      }
      return `${namespace ?? segment.namespaceOrAlias}.${segment.name}`;
    case "term-cast":
      return `@${toFullyQualifiedName(namespaceMap, currentNamespace, { ...segment, type: "identifier" }) ?? ""}${segment.qualifier ? "#" + segment.qualifier : ""}`;
    case "navigation-property-annotation":
      return `${toFullyQualifiedName(namespaceMap, currentNamespace, {
        type: "identifier",
        name: segment.name,
        namespaceOrAlias: segment.namespaceOrAlias
      }) ?? ""}@${toFullyQualifiedName(namespaceMap, currentNamespace, { ...segment.term, type: "identifier" }) ?? ""}${segment.term.qualifier ? "#" + segment.term.qualifier : ""}`;
    default:
      return "";
  }
}

// packages/odata-annotation-core-types/dist/annotation-file.js
var ATTRIBUTE_TYPE = "attribute";
var TEXT_TYPE = "text";
var MultilineType;
(function(MultilineType2) {
  MultilineType2["StripIndentation"] = "StripIndentation";
  MultilineType2["KeepIndentation"] = "KeepIndentation";
})(MultilineType || (MultilineType = {}));
var ELEMENT_TYPE = "element";
var EDMX_NAMESPACE_ALIAS = "Edmx";
var EDM_NAMESPACE_ALIAS = "Edm";
var REFERENCE_TYPE = "reference";
var NAMESPACE_TYPE = "namespace";
var TARGET_TYPE = "target";
var ANNOTATION_FILE_TYPE = "annotation-file";
function createAttributeNode(name, value, nameRange, valueRange) {
  const attribute = {
    type: ATTRIBUTE_TYPE,
    name,
    value
  };
  if (nameRange) {
    attribute.nameRange = nameRange;
  }
  if (valueRange) {
    attribute.valueRange = valueRange;
  }
  return attribute;
}
function createTextNode(text, range, fragmentRanges, multilineType) {
  const node = { type: TEXT_TYPE, text };
  if (range) {
    node.range = range;
  }
  if (fragmentRanges) {
    node.fragmentRanges = fragmentRanges;
  }
  if (multilineType) {
    node.multilineType = multilineType;
  }
  return node;
}
function createElementNode({ name, range, nameRange, attributes, content, contentRange, namespace, namespaceAlias }) {
  const node = {
    type: ELEMENT_TYPE,
    name,
    attributes: attributes ?? {},
    content: content ?? []
  };
  if (range) {
    node.range = range;
  }
  if (nameRange) {
    node.nameRange = nameRange;
  }
  if (contentRange) {
    node.contentRange = contentRange;
  }
  if (namespace) {
    node.namespace = namespace;
  }
  if (namespaceAlias) {
    node.namespaceAlias = namespaceAlias;
  }
  return node;
}
var GHOST_FILENAME_PREFIX = "!";
function createTarget(path) {
  return { type: "target", name: path, terms: [], range: void 0, nameRange: void 0, termsRange: void 0 };
}
function createNamespace(namespace, alias, ranges) {
  const { aliasRange, contentRange, nameRange, range } = ranges ?? {};
  return {
    type: "namespace",
    name: namespace,
    alias,
    range,
    nameRange,
    aliasRange,
    contentRange
  };
}
function createReference(name, alias, uri, ranges) {
  const { aliasRange, uriRange, nameRange, range } = ranges ?? {};
  return {
    type: "reference",
    name,
    alias,
    uri,
    range,
    nameRange,
    aliasRange,
    uriRange
  };
}

// packages/odata-annotation-core-types/dist/base.js
var TYPE_DEFINITION_KIND = "TypeDefinition";
var ENUM_TYPE_KIND = "EnumType";
var COMPLEX_TYPE_KIND = "ComplexType";
var TERM_KIND = "Term";
var ENTITY_TYPE_KIND = "EntityType";
var ACTION_KIND = "Action";
var FUNCTION_KIND = "Function";
var ASSOCIATION_KIND = "Association";
var ENTITY_CONTAINER_KIND = "EntityContainer";
var PROPERTY_KIND = "Property";
var NAVIGATION_PROPERTY_KIND = "NavigationProperty";
var ENTITY_SET_KIND = "EntitySet";
var SINGLETON_KIND = "Singleton";
var ACTION_IMPORT_KIND = "ActionImport";
var FUNCTION_IMPORT_KIND = "FunctionImport";
var ASSOCIATION_SET_KIND = "AssociationSet";
var COLLECTION_KIND = "Collection";
var cacheKeyAnyTermName = "Impl.AnyTerm";

// packages/odata-annotation-core-types/dist/edm.js
var Edm;
(function(Edm2) {
  Edm2["Action"] = "Action";
  Edm2["ActionImport"] = "ActionImport";
  Edm2["Add"] = "Add";
  Edm2["Alias"] = "Alias";
  Edm2["And"] = "And";
  Edm2["Annotation"] = "Annotation";
  Edm2["Annotations"] = "Annotations";
  Edm2["AnnotationPath"] = "AnnotationPath";
  Edm2["Association"] = "Association";
  Edm2["AssociationSet"] = "AssociationSet";
  Edm2["Apply"] = "Apply";
  Edm2["Binary"] = "Binary";
  Edm2["Bool"] = "Bool";
  Edm2["Cast"] = "Cast";
  Edm2["Collection"] = "Collection";
  Edm2["ComplexType"] = "ComplexType";
  Edm2["ContainsTarget"] = "ContainsTarget";
  Edm2["Date"] = "Date";
  Edm2["DateTimeOffset"] = "DateTimeOffset";
  Edm2["Decimal"] = "Decimal";
  Edm2["DefaultValue"] = "DefaultValue";
  Edm2["Div"] = "Div";
  Edm2["Duration"] = "Duration";
  Edm2["EntityContainer"] = "EntityContainer";
  Edm2["EntitySet"] = "EntitySet";
  Edm2["EntityType"] = "EntityType";
  Edm2["EnumMember"] = "EnumMember";
  Edm2["EnumType"] = "EnumType";
  Edm2["Eq"] = "Eq";
  Edm2["Float"] = "Float";
  Edm2["Function"] = "Function";
  Edm2["FunctionImport"] = "FunctionImport";
  Edm2["Ge"] = "Ge";
  Edm2["Gt"] = "Gt";
  Edm2["Guid"] = "Guid";
  Edm2["If"] = "If";
  Edm2["In"] = "In";
  Edm2["Include"] = "Include";
  Edm2["Int"] = "Int";
  Edm2["IsOf"] = "IsOf";
  Edm2["LabeledElement"] = "LabeledElement";
  Edm2["Le"] = "Le";
  Edm2["Lt"] = "Lt";
  Edm2["MaxLength"] = "MaxLength";
  Edm2["Member"] = "Member";
  Edm2["ModelElementPath"] = "ModelElementPath";
  Edm2["Mul"] = "Mul";
  Edm2["Name"] = "Name";
  Edm2["Namespace"] = "Namespace";
  Edm2["NavigationProperty"] = "NavigationProperty";
  Edm2["NavigationPropertyPath"] = "NavigationPropertyPath";
  Edm2["Ne"] = "Ne";
  Edm2["Neg"] = "Neg";
  Edm2["Not"] = "Not";
  Edm2["Null"] = "Null";
  Edm2["Nullable"] = "Nullable";
  Edm2["OnDelete"] = "OnDelete";
  Edm2["Parameter"] = "Parameter";
  Edm2["Partner"] = "Partner";
  Edm2["Path"] = "Path";
  Edm2["Precision"] = "Precision";
  Edm2["Property"] = "Property";
  Edm2["PropertyPath"] = "PropertyPath";
  Edm2["PropertyValue"] = "PropertyValue";
  Edm2["Or"] = "Or";
  Edm2["Qualifier"] = "Qualifier";
  Edm2["Record"] = "Record";
  Edm2["Reference"] = "Reference";
  Edm2["ReferentialConstraint"] = "ReferentialConstraint";
  Edm2["ReferencedProperty"] = "ReferencedProperty";
  Edm2["ReturnType"] = "ReturnType";
  Edm2["Scale"] = "Scale";
  Edm2["Schema"] = "Schema";
  Edm2["Singleton"] = "Singleton";
  Edm2["SRID"] = "SRID";
  Edm2["String"] = "String";
  Edm2["Sub"] = "Sub";
  Edm2["Target"] = "Target";
  Edm2["Term"] = "Term";
  Edm2["TimeOfDay"] = "TimeOfDay";
  Edm2["Type"] = "Type";
  Edm2["TypeDefinition"] = "TypeDefinition";
  Edm2["Unicode"] = "Unicode";
  Edm2["UrlRef"] = "UrlRef";
})(Edm || (Edm = {}));
var EdmType;
(function(EdmType2) {
  EdmType2["Binary"] = "Edm.Binary";
  EdmType2["Boolean"] = "Edm.Boolean";
  EdmType2["Byte"] = "Edm.Byte";
  EdmType2["Date"] = "Edm.Date";
  EdmType2["DateTimeOffset"] = "Edm.DateTimeOffset";
  EdmType2["Decimal"] = "Edm.Decimal";
  EdmType2["Double"] = "Edm.Double";
  EdmType2["Duration"] = "Edm.Duration";
  EdmType2["Guid"] = "Edm.Guid";
  EdmType2["Int16"] = "Edm.Int16";
  EdmType2["Int32"] = "Edm.Int32";
  EdmType2["Int64"] = "Edm.Int64";
  EdmType2["SByte"] = "Edm.SByte";
  EdmType2["Single"] = "Edm.Single";
  EdmType2["Stream"] = "Edm.Stream";
  EdmType2["String"] = "Edm.String";
  EdmType2["TimeOfDay"] = "Edm.TimeOfDay";
  EdmType2["PrimitiveType"] = "Edm.PrimitiveType";
  EdmType2["ComplexType"] = "Edm.ComplexType";
  EdmType2["EntityType"] = "Edm.EntityType";
  EdmType2["Untyped"] = "Edm.Untyped";
  EdmType2["EntityTypeCollection"] = "Edm.EntityTypeCollection";
  EdmType2["NonEntityTypeCollection"] = "Edm.NonEntityTypeCollection";
  EdmType2["AnnotationPath"] = "Edm.AnnotationPath";
  EdmType2["AnyPropertyPath"] = "Edm.AnyPropertyPath";
  EdmType2["ModelElementPath"] = "Edm.ModelElementPath";
  EdmType2["NavigationPropertyPath"] = "Edm.NavigationPropertyPath";
  EdmType2["PropertyPath"] = "Edm.PropertyPath";
  EdmType2["VirtualProperty"] = "Edm.VirtualProperty";
  EdmType2["PrimitiveCollection"] = "Edm.PrimitiveCollection";
  EdmType2["DataModelEnum"] = "Edm.DataModelEnum";
})(EdmType || (EdmType = {}));

// packages/odata-annotation-core-types/dist/edmx.js
var Edmx;
(function(Edmx2) {
  Edmx2["Alias"] = "Alias";
  Edmx2["DataServices"] = "DataServices";
  Edmx2["Edmx"] = "Edmx";
  Edmx2["Import"] = "Import";
  Edmx2["Include"] = "Include";
  Edmx2["Namespace"] = "Namespace";
  Edmx2["Reference"] = "Reference";
  Edmx2["Uri"] = "Uri";
  Edmx2["Version"] = "Version";
})(Edmx || (Edmx = {}));
var EdmxElementName;
(function(EdmxElementName2) {
  EdmxElementName2["DataServices"] = "DataServices";
  EdmxElementName2["Edmx"] = "Edmx";
  EdmxElementName2["Include"] = "Include";
  EdmxElementName2["IncludeAnnotations"] = "IncludeAnnotations";
  EdmxElementName2["Reference"] = "Reference";
})(EdmxElementName || (EdmxElementName = {}));
var EdmxReferenceElementAttributeName;
(function(EdmxReferenceElementAttributeName2) {
  EdmxReferenceElementAttributeName2["Uri"] = "Uri";
})(EdmxReferenceElementAttributeName || (EdmxReferenceElementAttributeName = {}));
var EdmxIncludeElementAttributeName;
(function(EdmxIncludeElementAttributeName2) {
  EdmxIncludeElementAttributeName2["Alias"] = "Alias";
  EdmxIncludeElementAttributeName2["Namespace"] = "Namespace";
})(EdmxIncludeElementAttributeName || (EdmxIncludeElementAttributeName = {}));
var EDMX_ELEMENT_NAMES = /* @__PURE__ */ new Set([
  EdmxElementName.DataServices,
  EdmxElementName.Edmx,
  EdmxElementName.Include,
  EdmxElementName.IncludeAnnotations,
  EdmxElementName.Reference
]);

// packages/odata-annotation-core-types/dist/text-formatting.js
var wrapInQuotes = (text) => `'${text}'`;
var printOptions = {
  printWidth: 300,
  tabWidth: 4,
  useTabs: false,
  useSnippetSyntax: true
};

// packages/odata-annotation-core-types/dist/diagnostics.js
var NO_UNUSED_NAMESPACE_TYPE = "no-unused-namespace";
var NO_UNDEFINED_NAMESPACE_TYPE = "no-undefined-namespace";
var NAME_CASE_ISSUE_PATH_VALUE = "name-case-issue-path-value";
var MISSING_I18N_KEY = "missing-i18n-key";
var VALUE_REQUIRED = "value-required";
var NO_WHITESPACE_IN_PATH_EXPRESSION = "no-whitespace-in-path-expression";
var INCOMPLETE_EXPRESSION_CC_FORWARD_SLASH = "incomplete-expression-cc-forward-slash";
var INCOMPLETE_EXPRESSION_FORWARD_SLASH = "incomplete-expression-forward-slash";
var IGNORE_TARGET_VALIDATION = "ignore-target-validation";
var UNKNOWN_TERM = "unknown-term";
var UN_SUPPORTED_VOCABULARY = "un-supported-vocabulary";
var ATTRIBUTE_NOT_ALLOWED_HERE = "attribute-not-allowed-here";
var MISSING_REQUIRED_PROPERTY = "missing-required-property";
var MISSING_REQUIRED_ATTRIBUTE = "missing-required-attribute";
var MISSING_REQUIRED_VALUE_FOR_ATTRIBUTE = "missing-required-value-for-attribute";
var TERM_NOT_APPLICABLE = "term-not-applicable";
var NOT_IN_APPLICABLE_TERMS_CONSTRAINT = "not-in-applicable-terms-constraint";
var RECORD_COLLECTION_PATH_NOT_ALLOWED = "record-collection-path-not-allowed";
var ODATA_FUNCTION_WRONG_RETURN_TYPE = "odata-function-wrong-return-type";
var IGNORE_DUPLICATE = "ignore-duplicate";
var INVALID_PATH_EXPRESSION = "invlid-path-expression";
var INVALID_ENUM_MEMBER_TYPE = "unknown-enum-member";
var INVALID_TYPE_TYPE = "invalid-type";
var NO_VALIDATION_FOR_SUBNODES = "no-validation-subnodes";
var INCOMPLETE_PATH_WITH_TYPE = "incomplete-path-with-type";
var INCOMPLETE_PATH_WITH_COMPATIBLE_TYPES = "incomplete-path-with-compatible-types";
var COMMON_CASE_ISSUE = "common-case-issue";
var ODATA_PATH_SEPARATOR_RULE = "no-odata-path-separator";
var INVALID_PRIMITIVE_TYPE = "invalid-primitive-type";
var DEPRECATED_$VALUE_SYNTAX = "deprecated-$value-syntax";

// node_modules/.pnpm/vscode-languageserver-types@3.17.5/node_modules/vscode-languageserver-types/lib/esm/main.js
var DocumentUri;
(function(DocumentUri2) {
  function is(value) {
    return typeof value === "string";
  }
  DocumentUri2.is = is;
})(DocumentUri || (DocumentUri = {}));
var URI;
(function(URI2) {
  function is(value) {
    return typeof value === "string";
  }
  URI2.is = is;
})(URI || (URI = {}));
var integer;
(function(integer2) {
  integer2.MIN_VALUE = -2147483648;
  integer2.MAX_VALUE = 2147483647;
  function is(value) {
    return typeof value === "number" && integer2.MIN_VALUE <= value && value <= integer2.MAX_VALUE;
  }
  integer2.is = is;
})(integer || (integer = {}));
var uinteger;
(function(uinteger2) {
  uinteger2.MIN_VALUE = 0;
  uinteger2.MAX_VALUE = 2147483647;
  function is(value) {
    return typeof value === "number" && uinteger2.MIN_VALUE <= value && value <= uinteger2.MAX_VALUE;
  }
  uinteger2.is = is;
})(uinteger || (uinteger = {}));
var Position;
(function(Position2) {
  function create(line, character) {
    if (line === Number.MAX_VALUE) {
      line = uinteger.MAX_VALUE;
    }
    if (character === Number.MAX_VALUE) {
      character = uinteger.MAX_VALUE;
    }
    return { line, character };
  }
  Position2.create = create;
  function is(value) {
    let candidate = value;
    return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
  }
  Position2.is = is;
})(Position || (Position = {}));
var Range;
(function(Range2) {
  function create(one, two, three, four) {
    if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
      return { start: Position.create(one, two), end: Position.create(three, four) };
    } else if (Position.is(one) && Position.is(two)) {
      return { start: one, end: two };
    } else {
      throw new Error(`Range#create called with invalid arguments[${one}, ${two}, ${three}, ${four}]`);
    }
  }
  Range2.create = create;
  function is(value) {
    let candidate = value;
    return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
  }
  Range2.is = is;
})(Range || (Range = {}));
var Location;
(function(Location2) {
  function create(uri, range) {
    return { uri, range };
  }
  Location2.create = create;
  function is(value) {
    let candidate = value;
    return Is.objectLiteral(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
  }
  Location2.is = is;
})(Location || (Location = {}));
var LocationLink;
(function(LocationLink2) {
  function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
    return { targetUri, targetRange, targetSelectionRange, originSelectionRange };
  }
  LocationLink2.create = create;
  function is(value) {
    let candidate = value;
    return Is.objectLiteral(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri) && Range.is(candidate.targetSelectionRange) && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
  }
  LocationLink2.is = is;
})(LocationLink || (LocationLink = {}));
var Color;
(function(Color2) {
  function create(red, green, blue, alpha) {
    return {
      red,
      green,
      blue,
      alpha
    };
  }
  Color2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1) && Is.numberRange(candidate.green, 0, 1) && Is.numberRange(candidate.blue, 0, 1) && Is.numberRange(candidate.alpha, 0, 1);
  }
  Color2.is = is;
})(Color || (Color = {}));
var ColorInformation;
(function(ColorInformation2) {
  function create(range, color) {
    return {
      range,
      color
    };
  }
  ColorInformation2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
  }
  ColorInformation2.is = is;
})(ColorInformation || (ColorInformation = {}));
var ColorPresentation;
(function(ColorPresentation2) {
  function create(label, textEdit, additionalTextEdits) {
    return {
      label,
      textEdit,
      additionalTextEdits
    };
  }
  ColorPresentation2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
  }
  ColorPresentation2.is = is;
})(ColorPresentation || (ColorPresentation = {}));
var FoldingRangeKind;
(function(FoldingRangeKind2) {
  FoldingRangeKind2.Comment = "comment";
  FoldingRangeKind2.Imports = "imports";
  FoldingRangeKind2.Region = "region";
})(FoldingRangeKind || (FoldingRangeKind = {}));
var FoldingRange;
(function(FoldingRange2) {
  function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
    const result = {
      startLine,
      endLine
    };
    if (Is.defined(startCharacter)) {
      result.startCharacter = startCharacter;
    }
    if (Is.defined(endCharacter)) {
      result.endCharacter = endCharacter;
    }
    if (Is.defined(kind)) {
      result.kind = kind;
    }
    if (Is.defined(collapsedText)) {
      result.collapsedText = collapsedText;
    }
    return result;
  }
  FoldingRange2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine) && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
  }
  FoldingRange2.is = is;
})(FoldingRange || (FoldingRange = {}));
var DiagnosticRelatedInformation;
(function(DiagnosticRelatedInformation2) {
  function create(location, message) {
    return {
      location,
      message
    };
  }
  DiagnosticRelatedInformation2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
  }
  DiagnosticRelatedInformation2.is = is;
})(DiagnosticRelatedInformation || (DiagnosticRelatedInformation = {}));
var DiagnosticSeverity;
(function(DiagnosticSeverity2) {
  DiagnosticSeverity2.Error = 1;
  DiagnosticSeverity2.Warning = 2;
  DiagnosticSeverity2.Information = 3;
  DiagnosticSeverity2.Hint = 4;
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
var DiagnosticTag;
(function(DiagnosticTag2) {
  DiagnosticTag2.Unnecessary = 1;
  DiagnosticTag2.Deprecated = 2;
})(DiagnosticTag || (DiagnosticTag = {}));
var CodeDescription;
(function(CodeDescription2) {
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Is.string(candidate.href);
  }
  CodeDescription2.is = is;
})(CodeDescription || (CodeDescription = {}));
var Diagnostic;
(function(Diagnostic2) {
  function create(range, message, severity, code, source, relatedInformation) {
    let result = { range, message };
    if (Is.defined(severity)) {
      result.severity = severity;
    }
    if (Is.defined(code)) {
      result.code = code;
    }
    if (Is.defined(source)) {
      result.source = source;
    }
    if (Is.defined(relatedInformation)) {
      result.relatedInformation = relatedInformation;
    }
    return result;
  }
  Diagnostic2.create = create;
  function is(value) {
    var _a;
    let candidate = value;
    return Is.defined(candidate) && Range.is(candidate.range) && Is.string(candidate.message) && (Is.number(candidate.severity) || Is.undefined(candidate.severity)) && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code)) && (Is.undefined(candidate.codeDescription) || Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)) && (Is.string(candidate.source) || Is.undefined(candidate.source)) && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
  }
  Diagnostic2.is = is;
})(Diagnostic || (Diagnostic = {}));
var Command;
(function(Command2) {
  function create(title, command, ...args) {
    let result = { title, command };
    if (Is.defined(args) && args.length > 0) {
      result.arguments = args;
    }
    return result;
  }
  Command2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
  }
  Command2.is = is;
})(Command || (Command = {}));
var TextEdit;
(function(TextEdit2) {
  function replace(range, newText) {
    return { range, newText };
  }
  TextEdit2.replace = replace;
  function insert(position, newText) {
    return { range: { start: position, end: position }, newText };
  }
  TextEdit2.insert = insert;
  function del(range) {
    return { range, newText: "" };
  }
  TextEdit2.del = del;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range);
  }
  TextEdit2.is = is;
})(TextEdit || (TextEdit = {}));
var ChangeAnnotation;
(function(ChangeAnnotation2) {
  function create(label, needsConfirmation, description) {
    const result = { label };
    if (needsConfirmation !== void 0) {
      result.needsConfirmation = needsConfirmation;
    }
    if (description !== void 0) {
      result.description = description;
    }
    return result;
  }
  ChangeAnnotation2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
  }
  ChangeAnnotation2.is = is;
})(ChangeAnnotation || (ChangeAnnotation = {}));
var ChangeAnnotationIdentifier;
(function(ChangeAnnotationIdentifier2) {
  function is(value) {
    const candidate = value;
    return Is.string(candidate);
  }
  ChangeAnnotationIdentifier2.is = is;
})(ChangeAnnotationIdentifier || (ChangeAnnotationIdentifier = {}));
var AnnotatedTextEdit;
(function(AnnotatedTextEdit2) {
  function replace(range, newText, annotation) {
    return { range, newText, annotationId: annotation };
  }
  AnnotatedTextEdit2.replace = replace;
  function insert(position, newText, annotation) {
    return { range: { start: position, end: position }, newText, annotationId: annotation };
  }
  AnnotatedTextEdit2.insert = insert;
  function del(range, annotation) {
    return { range, newText: "", annotationId: annotation };
  }
  AnnotatedTextEdit2.del = del;
  function is(value) {
    const candidate = value;
    return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
  }
  AnnotatedTextEdit2.is = is;
})(AnnotatedTextEdit || (AnnotatedTextEdit = {}));
var TextDocumentEdit;
(function(TextDocumentEdit2) {
  function create(textDocument, edits) {
    return { textDocument, edits };
  }
  TextDocumentEdit2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) && Array.isArray(candidate.edits);
  }
  TextDocumentEdit2.is = is;
})(TextDocumentEdit || (TextDocumentEdit = {}));
var CreateFile;
(function(CreateFile2) {
  function create(uri, options, annotation) {
    let result = {
      kind: "create",
      uri
    };
    if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
      result.options = options;
    }
    if (annotation !== void 0) {
      result.annotationId = annotation;
    }
    return result;
  }
  CreateFile2.create = create;
  function is(value) {
    let candidate = value;
    return candidate && candidate.kind === "create" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
  }
  CreateFile2.is = is;
})(CreateFile || (CreateFile = {}));
var RenameFile;
(function(RenameFile2) {
  function create(oldUri, newUri, options, annotation) {
    let result = {
      kind: "rename",
      oldUri,
      newUri
    };
    if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
      result.options = options;
    }
    if (annotation !== void 0) {
      result.annotationId = annotation;
    }
    return result;
  }
  RenameFile2.create = create;
  function is(value) {
    let candidate = value;
    return candidate && candidate.kind === "rename" && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
  }
  RenameFile2.is = is;
})(RenameFile || (RenameFile = {}));
var DeleteFile;
(function(DeleteFile2) {
  function create(uri, options, annotation) {
    let result = {
      kind: "delete",
      uri
    };
    if (options !== void 0 && (options.recursive !== void 0 || options.ignoreIfNotExists !== void 0)) {
      result.options = options;
    }
    if (annotation !== void 0) {
      result.annotationId = annotation;
    }
    return result;
  }
  DeleteFile2.create = create;
  function is(value) {
    let candidate = value;
    return candidate && candidate.kind === "delete" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.recursive === void 0 || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === void 0 || Is.boolean(candidate.options.ignoreIfNotExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
  }
  DeleteFile2.is = is;
})(DeleteFile || (DeleteFile = {}));
var WorkspaceEdit;
(function(WorkspaceEdit2) {
  function is(value) {
    let candidate = value;
    return candidate && (candidate.changes !== void 0 || candidate.documentChanges !== void 0) && (candidate.documentChanges === void 0 || candidate.documentChanges.every((change) => {
      if (Is.string(change.kind)) {
        return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
      } else {
        return TextDocumentEdit.is(change);
      }
    }));
  }
  WorkspaceEdit2.is = is;
})(WorkspaceEdit || (WorkspaceEdit = {}));
var TextDocumentIdentifier;
(function(TextDocumentIdentifier2) {
  function create(uri) {
    return { uri };
  }
  TextDocumentIdentifier2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.string(candidate.uri);
  }
  TextDocumentIdentifier2.is = is;
})(TextDocumentIdentifier || (TextDocumentIdentifier = {}));
var VersionedTextDocumentIdentifier;
(function(VersionedTextDocumentIdentifier2) {
  function create(uri, version) {
    return { uri, version };
  }
  VersionedTextDocumentIdentifier2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
  }
  VersionedTextDocumentIdentifier2.is = is;
})(VersionedTextDocumentIdentifier || (VersionedTextDocumentIdentifier = {}));
var OptionalVersionedTextDocumentIdentifier;
(function(OptionalVersionedTextDocumentIdentifier2) {
  function create(uri, version) {
    return { uri, version };
  }
  OptionalVersionedTextDocumentIdentifier2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
  }
  OptionalVersionedTextDocumentIdentifier2.is = is;
})(OptionalVersionedTextDocumentIdentifier || (OptionalVersionedTextDocumentIdentifier = {}));
var TextDocumentItem;
(function(TextDocumentItem2) {
  function create(uri, languageId, version, text) {
    return { uri, languageId, version, text };
  }
  TextDocumentItem2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
  }
  TextDocumentItem2.is = is;
})(TextDocumentItem || (TextDocumentItem = {}));
var MarkupKind;
(function(MarkupKind2) {
  MarkupKind2.PlainText = "plaintext";
  MarkupKind2.Markdown = "markdown";
  function is(value) {
    const candidate = value;
    return candidate === MarkupKind2.PlainText || candidate === MarkupKind2.Markdown;
  }
  MarkupKind2.is = is;
})(MarkupKind || (MarkupKind = {}));
var MarkupContent;
(function(MarkupContent2) {
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value);
  }
  MarkupContent2.is = is;
})(MarkupContent || (MarkupContent = {}));
var CompletionItemKind;
(function(CompletionItemKind2) {
  CompletionItemKind2.Text = 1;
  CompletionItemKind2.Method = 2;
  CompletionItemKind2.Function = 3;
  CompletionItemKind2.Constructor = 4;
  CompletionItemKind2.Field = 5;
  CompletionItemKind2.Variable = 6;
  CompletionItemKind2.Class = 7;
  CompletionItemKind2.Interface = 8;
  CompletionItemKind2.Module = 9;
  CompletionItemKind2.Property = 10;
  CompletionItemKind2.Unit = 11;
  CompletionItemKind2.Value = 12;
  CompletionItemKind2.Enum = 13;
  CompletionItemKind2.Keyword = 14;
  CompletionItemKind2.Snippet = 15;
  CompletionItemKind2.Color = 16;
  CompletionItemKind2.File = 17;
  CompletionItemKind2.Reference = 18;
  CompletionItemKind2.Folder = 19;
  CompletionItemKind2.EnumMember = 20;
  CompletionItemKind2.Constant = 21;
  CompletionItemKind2.Struct = 22;
  CompletionItemKind2.Event = 23;
  CompletionItemKind2.Operator = 24;
  CompletionItemKind2.TypeParameter = 25;
})(CompletionItemKind || (CompletionItemKind = {}));
var InsertTextFormat;
(function(InsertTextFormat2) {
  InsertTextFormat2.PlainText = 1;
  InsertTextFormat2.Snippet = 2;
})(InsertTextFormat || (InsertTextFormat = {}));
var CompletionItemTag;
(function(CompletionItemTag2) {
  CompletionItemTag2.Deprecated = 1;
})(CompletionItemTag || (CompletionItemTag = {}));
var InsertReplaceEdit;
(function(InsertReplaceEdit2) {
  function create(newText, insert, replace) {
    return { newText, insert, replace };
  }
  InsertReplaceEdit2.create = create;
  function is(value) {
    const candidate = value;
    return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
  }
  InsertReplaceEdit2.is = is;
})(InsertReplaceEdit || (InsertReplaceEdit = {}));
var InsertTextMode;
(function(InsertTextMode2) {
  InsertTextMode2.asIs = 1;
  InsertTextMode2.adjustIndentation = 2;
})(InsertTextMode || (InsertTextMode = {}));
var CompletionItemLabelDetails;
(function(CompletionItemLabelDetails2) {
  function is(value) {
    const candidate = value;
    return candidate && (Is.string(candidate.detail) || candidate.detail === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
  }
  CompletionItemLabelDetails2.is = is;
})(CompletionItemLabelDetails || (CompletionItemLabelDetails = {}));
var CompletionItem;
(function(CompletionItem2) {
  function create(label) {
    return { label };
  }
  CompletionItem2.create = create;
})(CompletionItem || (CompletionItem = {}));
var CompletionList;
(function(CompletionList2) {
  function create(items, isIncomplete) {
    return { items: items ? items : [], isIncomplete: !!isIncomplete };
  }
  CompletionList2.create = create;
})(CompletionList || (CompletionList = {}));
var MarkedString;
(function(MarkedString2) {
  function fromPlainText(plainText) {
    return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
  }
  MarkedString2.fromPlainText = fromPlainText;
  function is(value) {
    const candidate = value;
    return Is.string(candidate) || Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value);
  }
  MarkedString2.is = is;
})(MarkedString || (MarkedString = {}));
var Hover;
(function(Hover2) {
  function is(value) {
    let candidate = value;
    return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) || MarkedString.is(candidate.contents) || Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === void 0 || Range.is(value.range));
  }
  Hover2.is = is;
})(Hover || (Hover = {}));
var ParameterInformation;
(function(ParameterInformation2) {
  function create(label, documentation) {
    return documentation ? { label, documentation } : { label };
  }
  ParameterInformation2.create = create;
})(ParameterInformation || (ParameterInformation = {}));
var SignatureInformation;
(function(SignatureInformation2) {
  function create(label, documentation, ...parameters) {
    let result = { label };
    if (Is.defined(documentation)) {
      result.documentation = documentation;
    }
    if (Is.defined(parameters)) {
      result.parameters = parameters;
    } else {
      result.parameters = [];
    }
    return result;
  }
  SignatureInformation2.create = create;
})(SignatureInformation || (SignatureInformation = {}));
var DocumentHighlightKind;
(function(DocumentHighlightKind2) {
  DocumentHighlightKind2.Text = 1;
  DocumentHighlightKind2.Read = 2;
  DocumentHighlightKind2.Write = 3;
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
var DocumentHighlight;
(function(DocumentHighlight2) {
  function create(range, kind) {
    let result = { range };
    if (Is.number(kind)) {
      result.kind = kind;
    }
    return result;
  }
  DocumentHighlight2.create = create;
})(DocumentHighlight || (DocumentHighlight = {}));
var SymbolKind;
(function(SymbolKind2) {
  SymbolKind2.File = 1;
  SymbolKind2.Module = 2;
  SymbolKind2.Namespace = 3;
  SymbolKind2.Package = 4;
  SymbolKind2.Class = 5;
  SymbolKind2.Method = 6;
  SymbolKind2.Property = 7;
  SymbolKind2.Field = 8;
  SymbolKind2.Constructor = 9;
  SymbolKind2.Enum = 10;
  SymbolKind2.Interface = 11;
  SymbolKind2.Function = 12;
  SymbolKind2.Variable = 13;
  SymbolKind2.Constant = 14;
  SymbolKind2.String = 15;
  SymbolKind2.Number = 16;
  SymbolKind2.Boolean = 17;
  SymbolKind2.Array = 18;
  SymbolKind2.Object = 19;
  SymbolKind2.Key = 20;
  SymbolKind2.Null = 21;
  SymbolKind2.EnumMember = 22;
  SymbolKind2.Struct = 23;
  SymbolKind2.Event = 24;
  SymbolKind2.Operator = 25;
  SymbolKind2.TypeParameter = 26;
})(SymbolKind || (SymbolKind = {}));
var SymbolTag;
(function(SymbolTag2) {
  SymbolTag2.Deprecated = 1;
})(SymbolTag || (SymbolTag = {}));
var SymbolInformation;
(function(SymbolInformation2) {
  function create(name, kind, range, uri, containerName) {
    let result = {
      name,
      kind,
      location: { uri, range }
    };
    if (containerName) {
      result.containerName = containerName;
    }
    return result;
  }
  SymbolInformation2.create = create;
})(SymbolInformation || (SymbolInformation = {}));
var WorkspaceSymbol;
(function(WorkspaceSymbol2) {
  function create(name, kind, uri, range) {
    return range !== void 0 ? { name, kind, location: { uri, range } } : { name, kind, location: { uri } };
  }
  WorkspaceSymbol2.create = create;
})(WorkspaceSymbol || (WorkspaceSymbol = {}));
var DocumentSymbol;
(function(DocumentSymbol2) {
  function create(name, detail, kind, range, selectionRange, children) {
    let result = {
      name,
      detail,
      kind,
      range,
      selectionRange
    };
    if (children !== void 0) {
      result.children = children;
    }
    return result;
  }
  DocumentSymbol2.create = create;
  function is(value) {
    let candidate = value;
    return candidate && Is.string(candidate.name) && Is.number(candidate.kind) && Range.is(candidate.range) && Range.is(candidate.selectionRange) && (candidate.detail === void 0 || Is.string(candidate.detail)) && (candidate.deprecated === void 0 || Is.boolean(candidate.deprecated)) && (candidate.children === void 0 || Array.isArray(candidate.children)) && (candidate.tags === void 0 || Array.isArray(candidate.tags));
  }
  DocumentSymbol2.is = is;
})(DocumentSymbol || (DocumentSymbol = {}));
var CodeActionKind;
(function(CodeActionKind2) {
  CodeActionKind2.Empty = "";
  CodeActionKind2.QuickFix = "quickfix";
  CodeActionKind2.Refactor = "refactor";
  CodeActionKind2.RefactorExtract = "refactor.extract";
  CodeActionKind2.RefactorInline = "refactor.inline";
  CodeActionKind2.RefactorRewrite = "refactor.rewrite";
  CodeActionKind2.Source = "source";
  CodeActionKind2.SourceOrganizeImports = "source.organizeImports";
  CodeActionKind2.SourceFixAll = "source.fixAll";
})(CodeActionKind || (CodeActionKind = {}));
var CodeActionTriggerKind;
(function(CodeActionTriggerKind2) {
  CodeActionTriggerKind2.Invoked = 1;
  CodeActionTriggerKind2.Automatic = 2;
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
var CodeActionContext;
(function(CodeActionContext2) {
  function create(diagnostics, only, triggerKind) {
    let result = { diagnostics };
    if (only !== void 0 && only !== null) {
      result.only = only;
    }
    if (triggerKind !== void 0 && triggerKind !== null) {
      result.triggerKind = triggerKind;
    }
    return result;
  }
  CodeActionContext2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === void 0 || Is.typedArray(candidate.only, Is.string)) && (candidate.triggerKind === void 0 || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
  }
  CodeActionContext2.is = is;
})(CodeActionContext || (CodeActionContext = {}));
var CodeAction;
(function(CodeAction2) {
  function create(title, kindOrCommandOrEdit, kind) {
    let result = { title };
    let checkKind = true;
    if (typeof kindOrCommandOrEdit === "string") {
      checkKind = false;
      result.kind = kindOrCommandOrEdit;
    } else if (Command.is(kindOrCommandOrEdit)) {
      result.command = kindOrCommandOrEdit;
    } else {
      result.edit = kindOrCommandOrEdit;
    }
    if (checkKind && kind !== void 0) {
      result.kind = kind;
    }
    return result;
  }
  CodeAction2.create = create;
  function is(value) {
    let candidate = value;
    return candidate && Is.string(candidate.title) && (candidate.diagnostics === void 0 || Is.typedArray(candidate.diagnostics, Diagnostic.is)) && (candidate.kind === void 0 || Is.string(candidate.kind)) && (candidate.edit !== void 0 || candidate.command !== void 0) && (candidate.command === void 0 || Command.is(candidate.command)) && (candidate.isPreferred === void 0 || Is.boolean(candidate.isPreferred)) && (candidate.edit === void 0 || WorkspaceEdit.is(candidate.edit));
  }
  CodeAction2.is = is;
})(CodeAction || (CodeAction = {}));
var CodeLens;
(function(CodeLens2) {
  function create(range, data) {
    let result = { range };
    if (Is.defined(data)) {
      result.data = data;
    }
    return result;
  }
  CodeLens2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
  }
  CodeLens2.is = is;
})(CodeLens || (CodeLens = {}));
var FormattingOptions;
(function(FormattingOptions2) {
  function create(tabSize, insertSpaces) {
    return { tabSize, insertSpaces };
  }
  FormattingOptions2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
  }
  FormattingOptions2.is = is;
})(FormattingOptions || (FormattingOptions = {}));
var DocumentLink;
(function(DocumentLink2) {
  function create(range, target, data) {
    return { range, target, data };
  }
  DocumentLink2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
  }
  DocumentLink2.is = is;
})(DocumentLink || (DocumentLink = {}));
var SelectionRange;
(function(SelectionRange2) {
  function create(range, parent) {
    return { range, parent };
  }
  SelectionRange2.create = create;
  function is(value) {
    let candidate = value;
    return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === void 0 || SelectionRange2.is(candidate.parent));
  }
  SelectionRange2.is = is;
})(SelectionRange || (SelectionRange = {}));
var SemanticTokenTypes;
(function(SemanticTokenTypes2) {
  SemanticTokenTypes2["namespace"] = "namespace";
  SemanticTokenTypes2["type"] = "type";
  SemanticTokenTypes2["class"] = "class";
  SemanticTokenTypes2["enum"] = "enum";
  SemanticTokenTypes2["interface"] = "interface";
  SemanticTokenTypes2["struct"] = "struct";
  SemanticTokenTypes2["typeParameter"] = "typeParameter";
  SemanticTokenTypes2["parameter"] = "parameter";
  SemanticTokenTypes2["variable"] = "variable";
  SemanticTokenTypes2["property"] = "property";
  SemanticTokenTypes2["enumMember"] = "enumMember";
  SemanticTokenTypes2["event"] = "event";
  SemanticTokenTypes2["function"] = "function";
  SemanticTokenTypes2["method"] = "method";
  SemanticTokenTypes2["macro"] = "macro";
  SemanticTokenTypes2["keyword"] = "keyword";
  SemanticTokenTypes2["modifier"] = "modifier";
  SemanticTokenTypes2["comment"] = "comment";
  SemanticTokenTypes2["string"] = "string";
  SemanticTokenTypes2["number"] = "number";
  SemanticTokenTypes2["regexp"] = "regexp";
  SemanticTokenTypes2["operator"] = "operator";
  SemanticTokenTypes2["decorator"] = "decorator";
})(SemanticTokenTypes || (SemanticTokenTypes = {}));
var SemanticTokenModifiers;
(function(SemanticTokenModifiers2) {
  SemanticTokenModifiers2["declaration"] = "declaration";
  SemanticTokenModifiers2["definition"] = "definition";
  SemanticTokenModifiers2["readonly"] = "readonly";
  SemanticTokenModifiers2["static"] = "static";
  SemanticTokenModifiers2["deprecated"] = "deprecated";
  SemanticTokenModifiers2["abstract"] = "abstract";
  SemanticTokenModifiers2["async"] = "async";
  SemanticTokenModifiers2["modification"] = "modification";
  SemanticTokenModifiers2["documentation"] = "documentation";
  SemanticTokenModifiers2["defaultLibrary"] = "defaultLibrary";
})(SemanticTokenModifiers || (SemanticTokenModifiers = {}));
var SemanticTokens;
(function(SemanticTokens2) {
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && (candidate.resultId === void 0 || typeof candidate.resultId === "string") && Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === "number");
  }
  SemanticTokens2.is = is;
})(SemanticTokens || (SemanticTokens = {}));
var InlineValueText;
(function(InlineValueText2) {
  function create(range, text) {
    return { range, text };
  }
  InlineValueText2.create = create;
  function is(value) {
    const candidate = value;
    return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
  }
  InlineValueText2.is = is;
})(InlineValueText || (InlineValueText = {}));
var InlineValueVariableLookup;
(function(InlineValueVariableLookup2) {
  function create(range, variableName, caseSensitiveLookup) {
    return { range, variableName, caseSensitiveLookup };
  }
  InlineValueVariableLookup2.create = create;
  function is(value) {
    const candidate = value;
    return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.boolean(candidate.caseSensitiveLookup) && (Is.string(candidate.variableName) || candidate.variableName === void 0);
  }
  InlineValueVariableLookup2.is = is;
})(InlineValueVariableLookup || (InlineValueVariableLookup = {}));
var InlineValueEvaluatableExpression;
(function(InlineValueEvaluatableExpression2) {
  function create(range, expression) {
    return { range, expression };
  }
  InlineValueEvaluatableExpression2.create = create;
  function is(value) {
    const candidate = value;
    return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && (Is.string(candidate.expression) || candidate.expression === void 0);
  }
  InlineValueEvaluatableExpression2.is = is;
})(InlineValueEvaluatableExpression || (InlineValueEvaluatableExpression = {}));
var InlineValueContext;
(function(InlineValueContext2) {
  function create(frameId, stoppedLocation) {
    return { frameId, stoppedLocation };
  }
  InlineValueContext2.create = create;
  function is(value) {
    const candidate = value;
    return Is.defined(candidate) && Range.is(value.stoppedLocation);
  }
  InlineValueContext2.is = is;
})(InlineValueContext || (InlineValueContext = {}));
var InlayHintKind;
(function(InlayHintKind2) {
  InlayHintKind2.Type = 1;
  InlayHintKind2.Parameter = 2;
  function is(value) {
    return value === 1 || value === 2;
  }
  InlayHintKind2.is = is;
})(InlayHintKind || (InlayHintKind = {}));
var InlayHintLabelPart;
(function(InlayHintLabelPart2) {
  function create(value) {
    return { value };
  }
  InlayHintLabelPart2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.location === void 0 || Location.is(candidate.location)) && (candidate.command === void 0 || Command.is(candidate.command));
  }
  InlayHintLabelPart2.is = is;
})(InlayHintLabelPart || (InlayHintLabelPart = {}));
var InlayHint;
(function(InlayHint2) {
  function create(position, label, kind) {
    const result = { position, label };
    if (kind !== void 0) {
      result.kind = kind;
    }
    return result;
  }
  InlayHint2.create = create;
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && Position.is(candidate.position) && (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) && (candidate.kind === void 0 || InlayHintKind.is(candidate.kind)) && candidate.textEdits === void 0 || Is.typedArray(candidate.textEdits, TextEdit.is) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.paddingLeft === void 0 || Is.boolean(candidate.paddingLeft)) && (candidate.paddingRight === void 0 || Is.boolean(candidate.paddingRight));
  }
  InlayHint2.is = is;
})(InlayHint || (InlayHint = {}));
var StringValue;
(function(StringValue2) {
  function createSnippet(value) {
    return { kind: "snippet", value };
  }
  StringValue2.createSnippet = createSnippet;
})(StringValue || (StringValue = {}));
var InlineCompletionItem;
(function(InlineCompletionItem2) {
  function create(insertText, filterText, range, command) {
    return { insertText, filterText, range, command };
  }
  InlineCompletionItem2.create = create;
})(InlineCompletionItem || (InlineCompletionItem = {}));
var InlineCompletionList;
(function(InlineCompletionList2) {
  function create(items) {
    return { items };
  }
  InlineCompletionList2.create = create;
})(InlineCompletionList || (InlineCompletionList = {}));
var InlineCompletionTriggerKind;
(function(InlineCompletionTriggerKind2) {
  InlineCompletionTriggerKind2.Invoked = 0;
  InlineCompletionTriggerKind2.Automatic = 1;
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
var SelectedCompletionInfo;
(function(SelectedCompletionInfo2) {
  function create(range, text) {
    return { range, text };
  }
  SelectedCompletionInfo2.create = create;
})(SelectedCompletionInfo || (SelectedCompletionInfo = {}));
var InlineCompletionContext;
(function(InlineCompletionContext2) {
  function create(triggerKind, selectedCompletionInfo) {
    return { triggerKind, selectedCompletionInfo };
  }
  InlineCompletionContext2.create = create;
})(InlineCompletionContext || (InlineCompletionContext = {}));
var WorkspaceFolder;
(function(WorkspaceFolder2) {
  function is(value) {
    const candidate = value;
    return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
  }
  WorkspaceFolder2.is = is;
})(WorkspaceFolder || (WorkspaceFolder = {}));
var TextDocument;
(function(TextDocument2) {
  function create(uri, languageId, version, content) {
    return new FullTextDocument(uri, languageId, version, content);
  }
  TextDocument2.create = create;
  function is(value) {
    let candidate = value;
    return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount) && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
  }
  TextDocument2.is = is;
  function applyEdits(document, edits) {
    let text = document.getText();
    let sortedEdits = mergeSort(edits, (a, b) => {
      let diff = a.range.start.line - b.range.start.line;
      if (diff === 0) {
        return a.range.start.character - b.range.start.character;
      }
      return diff;
    });
    let lastModifiedOffset = text.length;
    for (let i = sortedEdits.length - 1; i >= 0; i--) {
      let e = sortedEdits[i];
      let startOffset = document.offsetAt(e.range.start);
      let endOffset = document.offsetAt(e.range.end);
      if (endOffset <= lastModifiedOffset) {
        text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
      } else {
        throw new Error("Overlapping edit");
      }
      lastModifiedOffset = startOffset;
    }
    return text;
  }
  TextDocument2.applyEdits = applyEdits;
  function mergeSort(data, compare) {
    if (data.length <= 1) {
      return data;
    }
    const p = data.length / 2 | 0;
    const left = data.slice(0, p);
    const right = data.slice(p);
    mergeSort(left, compare);
    mergeSort(right, compare);
    let leftIdx = 0;
    let rightIdx = 0;
    let i = 0;
    while (leftIdx < left.length && rightIdx < right.length) {
      let ret = compare(left[leftIdx], right[rightIdx]);
      if (ret <= 0) {
        data[i++] = left[leftIdx++];
      } else {
        data[i++] = right[rightIdx++];
      }
    }
    while (leftIdx < left.length) {
      data[i++] = left[leftIdx++];
    }
    while (rightIdx < right.length) {
      data[i++] = right[rightIdx++];
    }
    return data;
  }
})(TextDocument || (TextDocument = {}));
var FullTextDocument = class {
  constructor(uri, languageId, version, content) {
    this._uri = uri;
    this._languageId = languageId;
    this._version = version;
    this._content = content;
    this._lineOffsets = void 0;
  }
  get uri() {
    return this._uri;
  }
  get languageId() {
    return this._languageId;
  }
  get version() {
    return this._version;
  }
  getText(range) {
    if (range) {
      let start = this.offsetAt(range.start);
      let end = this.offsetAt(range.end);
      return this._content.substring(start, end);
    }
    return this._content;
  }
  update(event, version) {
    this._content = event.text;
    this._version = version;
    this._lineOffsets = void 0;
  }
  getLineOffsets() {
    if (this._lineOffsets === void 0) {
      let lineOffsets = [];
      let text = this._content;
      let isLineStart = true;
      for (let i = 0; i < text.length; i++) {
        if (isLineStart) {
          lineOffsets.push(i);
          isLineStart = false;
        }
        let ch = text.charAt(i);
        isLineStart = ch === "\r" || ch === "\n";
        if (ch === "\r" && i + 1 < text.length && text.charAt(i + 1) === "\n") {
          i++;
        }
      }
      if (isLineStart && text.length > 0) {
        lineOffsets.push(text.length);
      }
      this._lineOffsets = lineOffsets;
    }
    return this._lineOffsets;
  }
  positionAt(offset) {
    offset = Math.max(Math.min(offset, this._content.length), 0);
    let lineOffsets = this.getLineOffsets();
    let low = 0, high = lineOffsets.length;
    if (high === 0) {
      return Position.create(0, offset);
    }
    while (low < high) {
      let mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > offset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    let line = low - 1;
    return Position.create(line, offset - lineOffsets[line]);
  }
  offsetAt(position) {
    let lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return this._content.length;
    } else if (position.line < 0) {
      return 0;
    }
    let lineOffset = lineOffsets[position.line];
    let nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
    return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
  }
  get lineCount() {
    return this.getLineOffsets().length;
  }
};
var Is;
(function(Is2) {
  const toString = Object.prototype.toString;
  function defined(value) {
    return typeof value !== "undefined";
  }
  Is2.defined = defined;
  function undefined2(value) {
    return typeof value === "undefined";
  }
  Is2.undefined = undefined2;
  function boolean(value) {
    return value === true || value === false;
  }
  Is2.boolean = boolean;
  function string(value) {
    return toString.call(value) === "[object String]";
  }
  Is2.string = string;
  function number(value) {
    return toString.call(value) === "[object Number]";
  }
  Is2.number = number;
  function numberRange(value, min, max) {
    return toString.call(value) === "[object Number]" && min <= value && value <= max;
  }
  Is2.numberRange = numberRange;
  function integer2(value) {
    return toString.call(value) === "[object Number]" && -2147483648 <= value && value <= 2147483647;
  }
  Is2.integer = integer2;
  function uinteger2(value) {
    return toString.call(value) === "[object Number]" && 0 <= value && value <= 2147483647;
  }
  Is2.uinteger = uinteger2;
  function func(value) {
    return toString.call(value) === "[object Function]";
  }
  Is2.func = func;
  function objectLiteral(value) {
    return value !== null && typeof value === "object";
  }
  Is2.objectLiteral = objectLiteral;
  function typedArray(value, check) {
    return Array.isArray(value) && value.every(check);
  }
  Is2.typedArray = typedArray;
})(Is || (Is = {}));

// packages/text-document-utils/dist/position.js
function positionAt(lineOffsets, offset, textLength) {
  const target = Math.max(Math.min(offset, textLength), 0);
  let low = 0;
  let high = lineOffsets.length;
  if (high === 0) {
    return Position.create(0, target);
  }
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (lineOffsets[mid] > target) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  const line = low - 1;
  return Position.create(line, target - lineOffsets[line]);
}
function isBefore(pos1, pos2, includeEqual = false) {
  if (pos1.line < pos2.line) {
    return true;
  }
  if (pos1.line > pos2.line) {
    return false;
  }
  if (includeEqual) {
    return pos1.character <= pos2.character;
  }
  return pos1.character < pos2.character;
}
function positionContained(range, position) {
  return range !== void 0 && !isBefore(position, range.start, false) && isBefore(position, range.end, true);
}
function positionContainedStrict(range, position) {
  return !isBefore(position, range.start, false) && isBefore(position, range.end, true);
}
function rangeContained(a, b) {
  return isBefore(a.start, b.start, true) && isBefore(b.end, a.end, true);
}
function getIndentLevel(startPosition, tabWidth) {
  let level;
  if (startPosition < 0) {
    level = -1;
  } else {
    level = startPosition / tabWidth;
  }
  return level;
}
function indent(tabWidth, useTabs, level) {
  if (useTabs) {
    return "	".repeat(level);
  } else {
    return " ".repeat(tabWidth * level);
  }
}

// packages/odata-annotation-core/dist/search/find-by-position.js
var PositionVisitor = class {
  forCompletion = false;
  /**
   *
   * @param node
   * @param position
   * @param segments
   * @returns visitor result or undefined
   */
  visit(node, position, segments) {
    const handler = this[node.type];
    if (node.range && !positionContained(node.range, position)) {
      return void 0;
    }
    if (handler) {
      return handler(node, position, segments);
    } else {
      return void 0;
    }
  }
  [ANNOTATION_FILE_TYPE] = (node, position, segments) => {
    return this.visitChildren("references", node.references, node.range, position, segments) ?? this.visitChildren("targets", node.targets, node.range, position, segments) ?? this.visitChild(node.namespace, position, [...segments, "namespace"]);
  };
  [TARGET_TYPE] = (node, position, segments) => {
    const fallbackSegment = positionContained(node.termsRange, position) ? "terms" : "";
    return this.visitTextProperty("name", node.name, node.nameRange, position, segments) ?? this.visitChildren("terms", node.terms, node.termsRange, position, segments) ?? {
      path: [...segments, fallbackSegment],
      range: node.termsRange
    };
  };
  [NAMESPACE_TYPE] = (node, position, segments) => {
    return this.visitTextProperty("name", node.name, node.nameRange, position, segments) ?? this.visitTextProperty("alias", node.alias, node.aliasRange, position, segments) ?? {
      path: [...segments, "targets"],
      range: node.range
    };
  };
  [REFERENCE_TYPE] = (node, position, segments) => {
    return this.visitTextProperty("name", node.name, node.nameRange, position, segments) ?? this.visitTextProperty("alias", node.alias, node.aliasRange, position, segments);
  };
  [TEXT_TYPE] = (node, position, segments) => {
    return this.visitTextProperty("text", node.text, node.range, position, segments);
  };
  [ATTRIBUTE_TYPE] = (attribute, position, segments) => {
    return this.visitTextProperty("name", attribute.name, attribute.nameRange, position, segments) ?? this.visitTextProperty("value", attribute.value, attribute.valueRange, position, segments);
  };
  [ELEMENT_TYPE] = (element, position, segments) => {
    if (!element.range) {
      return;
    }
    const offset = this.forCompletion ? 1 : 0;
    const startCharacter = element.range.start.character + offset;
    const adjustedRange = Range.create(Position.create(element.range.start.line, startCharacter), element.range.end);
    if (!positionContained(adjustedRange, position)) {
      return void 0;
    }
    const attributeNames = Object.keys(element.attributes);
    if (positionContained(element.nameRange, position)) {
      return this.visitTextProperty("name", element.name, element.nameRange, position, segments);
    }
    for (const attributeName of attributeNames) {
      const attribute = element.attributes[attributeName];
      const children = this.visit(attribute, position, [...segments, "attributes", attributeName]);
      if (children) {
        return children;
      }
    }
    if (!positionContained(element.contentRange, position)) {
      element.attributes[""] = createAttributeNode("", "");
      return {
        path: [...segments, "attributes", "", "name"],
        range: element.range
      };
    }
    return this.visitContent(element, position, segments);
  };
  /**
   *
   * @param element
   * @param position
   * @param segments
   * @returns visitor result or undefined
   */
  visitContent(element, position, segments) {
    return this.visitChildren("content", element.content, element.contentRange, position, segments) ?? this.findRelativePosition(element, position, segments);
  }
  /**
   *
   * @param element
   * @param position
   * @param segments
   * @returns visitor result
   */
  findRelativePosition(element, position, segments) {
    const index = element.content.findIndex((item) => item.range && isBefore(position, item.range.start, true));
    if (index === -1) {
      element.content.push(createTextNode("", element.contentRange));
      return {
        path: [...segments, "content", 0, "text"],
        range: element.contentRange
      };
    }
    return {
      path: [...segments, `$${index === -1 ? element.content.length : index}`],
      range: element.contentRange
    };
  }
  /**
   *
   * @param name
   * @param nodes
   * @param range
   * @param position
   * @param segments
   * @returns visitor result or undefined
   */
  visitChildren(name, nodes, range, position, segments) {
    if (positionContained(range, position)) {
      for (let index = 0; index < nodes.length; index++) {
        const child = nodes[index];
        const result = this.visitChild(child, position, [...segments, name, index]);
        if (result) {
          return result;
        }
      }
    }
    return void 0;
  }
  /**
   *
   * @param child
   * @param position
   * @param segments
   * @returns visitor result or undefined
   */
  visitChild(child, position, segments) {
    if (child === void 0) {
      return void 0;
    }
    const children = this.visit(child, position, segments);
    if (children) {
      return children;
    }
    return void 0;
  }
  /**
   *
   * @param name
   * @param value
   * @param range
   * @param position
   * @param segments
   * @returns visitor result or undefined
   */
  visitTextProperty(name, value, range, position, segments) {
    if (value !== void 0 && positionContained(range, position)) {
      const textFragments = getTextFragmentsUntilPosition(value, range, position);
      const offset = position.character - range.start.character;
      return {
        path: [...segments, name, `$${offset}`],
        range,
        ...textFragments
      };
    }
    return void 0;
  }
};
var visitor = new PositionVisitor();
function findPathToPosition(annotationFile, position, forCompletion = false) {
  visitor.forCompletion = forCompletion;
  const result = visitor.visit(annotationFile, position, []);
  if (result) {
    return {
      path: result.path.join("/"),
      range: result.range
    };
  }
  return void 0;
}
function getTextFragmentsUntilPosition(content, rangeContent, position) {
  const length = position.character - rangeContent.start.character;
  return {
    startString: content.slice(0, length),
    remainingString: content.slice(length, rangeContent.end.character)
  };
}
function getPositionData(annotationFile, positionPointer) {
  const segments = positionPointer.split("/");
  if (segments[0] === "") {
    segments.shift();
  }
  let found = true;
  let path = "$";
  let startString = "";
  let remainingString = "";
  let currentContext = annotationFile;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.startsWith("$")) {
      if (typeof currentContext === "string") {
        const offset = Number.parseInt(segment.substring(1), 10);
        startString = currentContext.substring(0, offset);
        remainingString = currentContext.substring(offset);
      } else if (typeof currentContext === "object") {
        path += convertSegment(segment, true);
      }
      if (i < segments.length - 1) {
        return { found: false, path, startString, remainingString };
      }
    } else if (segment === Number.parseInt(segment, 10).toString() && Array.isArray(currentContext)) {
      path += convertSegment(segment, false);
      const index = Number.parseInt(segment, 10);
      currentContext = currentContext[index];
    } else if (typeof currentContext === "object") {
      path += convertSegment(segment);
      currentContext = currentContext[segment];
    } else {
      found = false;
    }
  }
  return { found, path, startString, remainingString };
}
function convertSegment(segment, escape = true) {
  const escapedSegment = escape ? `'${segment}'` : segment;
  return `[${escapedSegment}]`;
}

// packages/odata-annotation-core/dist/annotation-file.js
var elements = (predicate, element) => (element.content || []).filter((content) => content.type === ELEMENT_TYPE && (!predicate || predicate(content)));
var elementsWithName = (name, element) => elements((content) => content.name === name, element);
var getElementAttribute = (element, name) => element?.attributes?.[name];
var getElementAttributeValue = (element, name) => {
  const attributeNode = getElementAttribute(element, name);
  return attributeNode?.value ?? "";
};
function isElementWithName(node, name) {
  return node?.type === ELEMENT_TYPE && node.name === name;
}
function isEmptyText(text) {
  return (text || "").replace(/\s/g, "").length === 0;
}
function getSingleTextNode(element) {
  let isInvalid = false;
  let firstTextNode = null;
  (element.content || []).forEach((node) => {
    if (!isInvalid) {
      if (node.type === ELEMENT_TYPE && node.name !== Edm.Annotation) {
        isInvalid = true;
      } else if (node.type === TEXT_TYPE && !isEmptyText(node.text)) {
        if (firstTextNode) {
          isInvalid = true;
        } else {
          firstTextNode = node;
        }
      }
    }
  });
  return isInvalid ? null : firstTextNode;
}

// packages/odata-annotation-core/dist/utils/metadata.js
function getPathBaseMetadataElement(metadata, targetPath, aliasInfo) {
  const originalSegments = (targetPath.startsWith("/") ? targetPath.slice(1) : targetPath).split("/");
  const segments = originalSegments.map((originalSegment) => {
    return aliasInfo ? getSegmentWithoutAlias(aliasInfo, originalSegment) : originalSegment;
  });
  const currentSegments = [];
  let pathBaseMetadataElement = null;
  let mostSpecificMetadataElement = null;
  for (let i = 0; i < segments.length && !pathBaseMetadataElement; i++) {
    currentSegments.push(segments[i]);
    const currentPath = currentSegments.join("/");
    const currentMetadataElement = metadata.getMetadataElement(currentPath);
    if (currentMetadataElement) {
      mostSpecificMetadataElement = currentMetadataElement;
      if (isEntityOrComplexOrStructuredType(currentMetadataElement) || isPathPointingToActionKindElement(metadata, currentPath)) {
        pathBaseMetadataElement = currentMetadataElement;
      }
    }
  }
  return pathBaseMetadataElement ?? mostSpecificMetadataElement;
}
function isEntityOrComplexOrStructuredType(currentMetadataElement) {
  return !!currentMetadataElement.isEntityType || !!currentMetadataElement.isComplexType || !!currentMetadataElement.structuredType;
}
function isPathPointingToActionKindElement(metadata, path) {
  const edmxTypes = metadata.getEdmTargetKinds(path);
  const actionKinds = /* @__PURE__ */ new Set([ACTION_KIND, FUNCTION_KIND, ACTION_IMPORT_KIND, FUNCTION_IMPORT_KIND]);
  return edmxTypes.findIndex((edmxType) => actionKinds.has(edmxType)) >= 0;
}
function getSegmentWithoutAlias(aliasInfo, segment) {
  let segmentWithoutAlias = "";
  const indexAt = segment.indexOf("@");
  if (indexAt >= 0) {
    const term = resolveName(segment.substring(indexAt + 1), aliasInfo.aliasMap).qName;
    segmentWithoutAlias = segment.substring(0, indexAt) + "@" + term;
  } else if (segment.indexOf(".") > -1) {
    segmentWithoutAlias = resolveName(segment, aliasInfo.aliasMap).qName;
  } else {
    segmentWithoutAlias = segment;
  }
  return segmentWithoutAlias;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTION_IMPORT_KIND,
  ACTION_KIND,
  ANNOTATION_FILE_TYPE,
  ASSOCIATION_KIND,
  ASSOCIATION_SET_KIND,
  ATTRIBUTE_NOT_ALLOWED_HERE,
  ATTRIBUTE_TYPE,
  COLLECTION_KIND,
  COMMON_CASE_ISSUE,
  COMPLEX_TYPE_KIND,
  DEPRECATED_$VALUE_SYNTAX,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  EDMX_ELEMENT_NAMES,
  EDMX_NAMESPACE_ALIAS,
  EDM_NAMESPACE_ALIAS,
  ELEMENT_TYPE,
  ENTITY_CONTAINER_KIND,
  ENTITY_SET_KIND,
  ENTITY_TYPE_KIND,
  ENUM_TYPE_KIND,
  Edm,
  EdmType,
  Edmx,
  EdmxElementName,
  EdmxIncludeElementAttributeName,
  EdmxReferenceElementAttributeName,
  FUNCTION_IMPORT_KIND,
  FUNCTION_KIND,
  GHOST_FILENAME_PREFIX,
  IGNORE_DUPLICATE,
  IGNORE_TARGET_VALIDATION,
  INCOMPLETE_EXPRESSION_CC_FORWARD_SLASH,
  INCOMPLETE_EXPRESSION_FORWARD_SLASH,
  INCOMPLETE_PATH_WITH_COMPATIBLE_TYPES,
  INCOMPLETE_PATH_WITH_TYPE,
  INVALID_ENUM_MEMBER_TYPE,
  INVALID_PATH_EXPRESSION,
  INVALID_PRIMITIVE_TYPE,
  INVALID_TYPE_TYPE,
  Location,
  MISSING_I18N_KEY,
  MISSING_REQUIRED_ATTRIBUTE,
  MISSING_REQUIRED_PROPERTY,
  MISSING_REQUIRED_VALUE_FOR_ATTRIBUTE,
  MultilineType,
  NAMESPACE_TYPE,
  NAME_CASE_ISSUE_PATH_VALUE,
  NAVIGATION_PROPERTY_KIND,
  NOT_IN_APPLICABLE_TERMS_CONSTRAINT,
  NO_UNDEFINED_NAMESPACE_TYPE,
  NO_UNUSED_NAMESPACE_TYPE,
  NO_VALIDATION_FOR_SUBNODES,
  NO_WHITESPACE_IN_PATH_EXPRESSION,
  ODATA_FUNCTION_WRONG_RETURN_TYPE,
  ODATA_PATH_SEPARATOR_RULE,
  PROPERTY_KIND,
  Position,
  RECORD_COLLECTION_PATH_NOT_ALLOWED,
  REFERENCE_TYPE,
  Range,
  SINGLETON_KIND,
  TARGET_TYPE,
  TERM_KIND,
  TERM_NOT_APPLICABLE,
  TEXT_TYPE,
  TYPE_DEFINITION_KIND,
  TextEdit,
  UNKNOWN_TERM,
  UN_SUPPORTED_VOCABULARY,
  VALUE_REQUIRED,
  WorkspaceEdit,
  cacheKeyAnyTermName,
  createAttributeNode,
  createElementNode,
  createNamespace,
  createReference,
  createTarget,
  createTextNode,
  elements,
  elementsWithName,
  findPathToPosition,
  getAliasInformation,
  getAllNamespacesAndReferences,
  getElementAttribute,
  getElementAttributeValue,
  getIndentLevel,
  getPathBaseMetadataElement,
  getPositionData,
  getSegmentWithoutAlias,
  getSingleTextNode,
  indent,
  isBefore,
  isElementWithName,
  parseIdentifier,
  parsePath,
  positionAt,
  positionContained,
  positionContainedStrict,
  printOptions,
  rangeContained,
  resolveName,
  toAliasQualifiedName,
  toFullyQualifiedName,
  toFullyQualifiedPath,
  wrapInQuotes
});
