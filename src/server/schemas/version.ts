/**
 * Version TypeBox Schemas
 *
 * Schema definitions for the /version endpoint following the
 * Fulmen Forge Workhorse Standard.
 */

import { type Static, Type } from "@sinclair/typebox";

/**
 * Application identity information
 */
export const AppIdentitySchema = Type.Object(
  {
    vendor: Type.String({
      description: "Vendor/organization name",
      examples: ["fulmenhq"],
    }),
    binary_name: Type.String({
      description: "Binary/executable name",
      examples: ["tuvan"],
    }),
    description: Type.String({
      description: "Application description",
    }),
  },
  {
    title: "AppIdentity",
    description: "Application identity from .fulmen/app.yaml",
  },
);

export type AppIdentity = Static<typeof AppIdentitySchema>;

/**
 * Runtime environment information
 */
export const RuntimeInfoSchema = Type.Object(
  {
    name: Type.String({
      description: "Runtime name",
      examples: ["node", "bun"],
    }),
    version: Type.String({
      description: "Runtime version",
      examples: ["v20.10.0", "1.0.0"],
    }),
    platform: Type.String({
      description: "Operating system platform",
      examples: ["linux", "darwin", "win32"],
    }),
    arch: Type.String({
      description: "CPU architecture",
      examples: ["x64", "arm64"],
    }),
  },
  {
    title: "RuntimeInfo",
    description: "Runtime environment information",
  },
);

export type RuntimeInfo = Static<typeof RuntimeInfoSchema>;

/**
 * Dependency version information
 */
export const DependencyVersionsSchema = Type.Object(
  {
    tsfulmen: Type.String({
      description: "tsfulmen library version",
      examples: ["0.2.0"],
    }),
    crucible: Type.String({
      description: "Crucible SSOT version",
      examples: ["0.3.0", "unknown"],
    }),
  },
  {
    title: "DependencyVersions",
    description: "Dependency version information",
  },
);

export type DependencyVersions = Static<typeof DependencyVersionsSchema>;

/**
 * Version response envelope
 */
export const VersionResponseSchema = Type.Object(
  {
    identity: AppIdentitySchema,
    version: Type.String({
      description: "Application version (semver)",
      examples: ["0.1.1"],
    }),
    git_commit: Type.Optional(
      Type.String({
        description: "Git commit SHA (set at build time)",
        examples: ["abc123f"],
      }),
    ),
    build_date: Type.Optional(
      Type.String({
        format: "date-time",
        description: "Build timestamp (set at build time)",
      }),
    ),
    runtime: RuntimeInfoSchema,
    dependencies: DependencyVersionsSchema,
  },
  {
    $id: "VersionResponse",
    title: "VersionResponse",
    description: "Version information response",
  },
);

export type VersionResponse = Static<typeof VersionResponseSchema>;
