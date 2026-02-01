export interface EnvVarDescriptor {
  id: string;
  description: string;
  canonicalKey?: string;
  aliasKey?: string;
  sensitive?: boolean;
}

export interface EnvVarStatus {
  id: string;
  description: string;
  canonicalKey?: string;
  aliasKey?: string;
  canonicalSet: boolean;
  aliasSet: boolean;
  conflict: boolean;
  effectiveKey?: string;
  effectiveValue?: string;
  sensitive: boolean;
}

function normalizeValue(value: string | undefined): string {
  return (value ?? "").trim();
}

export function analyzeEnvVar(descriptor: EnvVarDescriptor): EnvVarStatus {
  const canonicalValue = descriptor.canonicalKey
    ? normalizeValue(process.env[descriptor.canonicalKey])
    : "";
  const aliasValue = descriptor.aliasKey ? normalizeValue(process.env[descriptor.aliasKey]) : "";

  const canonicalSet = canonicalValue !== "";
  const aliasSet = aliasValue !== "";

  const conflict =
    canonicalSet &&
    aliasSet &&
    descriptor.canonicalKey !== undefined &&
    descriptor.aliasKey !== undefined
      ? canonicalValue !== aliasValue
      : false;

  const effectiveKey = aliasSet
    ? descriptor.aliasKey
    : canonicalSet
      ? descriptor.canonicalKey
      : undefined;

  const effectiveValue = aliasSet ? aliasValue : canonicalSet ? canonicalValue : undefined;

  return {
    id: descriptor.id,
    description: descriptor.description,
    canonicalKey: descriptor.canonicalKey,
    aliasKey: descriptor.aliasKey,
    canonicalSet,
    aliasSet,
    conflict,
    effectiveKey,
    effectiveValue,
    sensitive: descriptor.sensitive === true,
  };
}

export function formatEnvVarStatusLine(status: EnvVarStatus): string {
  const parts: string[] = [];

  const canonicalLabel = status.canonicalKey
    ? `${status.canonicalKey}=${status.canonicalSet ? "set" : "unset"}`
    : undefined;
  const aliasLabel = status.aliasKey
    ? `${status.aliasKey}=${status.aliasSet ? "set" : "unset"}`
    : undefined;

  if (canonicalLabel) parts.push(canonicalLabel);
  if (aliasLabel) parts.push(aliasLabel);

  if (status.effectiveKey) {
    if (status.sensitive) {
      parts.push(`effective=${status.effectiveKey} (set)`);
    } else {
      parts.push(`effective=${status.effectiveKey}=${status.effectiveValue ?? ""}`);
    }
  } else {
    parts.push("effective=unset");
  }

  if (status.conflict) {
    parts.push("CONFLICT");
  }

  return parts.join(" | ");
}
