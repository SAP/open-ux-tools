// pointer in the form /<propertyName>/<arrayIndex>/.. to specify position inside object tree
// used as an alternative to specify e.g. cursor position  (for completion/hover) in the generic annotation file
// Node: last segment can have special meanings:

//   - when last segment is integer to be applied on a string: integer value specifies character index in that string
export type PositionPointer = string;

/**
 * AppName as used in project instance
 */
export type AppName = string;

export type FileContent = string;
