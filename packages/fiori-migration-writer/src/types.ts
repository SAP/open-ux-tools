// Re-export all migration types for backward compatibility
// TODO: Replace TypeScript enums with const objects and union types per AGENTS.md guidance
// This affects: ODataVersion, SapUxLayer, neoAppJsonRouteTargetTypes, TemplateDataKey, CapType
// Requires breaking API change - schedule for next major version
export * from './migration-types.js';
