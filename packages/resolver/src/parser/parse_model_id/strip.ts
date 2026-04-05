import { REGIONS } from "./constants";

export interface StrippedResult {
  bareId: string;
  region?: string | undefined;
  vendor?: string | undefined;
  deploymentVersion?: string | undefined;
  routingTag?: string | undefined;
  maasSuffix?: boolean | undefined;
}

function stripBedrock(raw: string): StrippedResult {
  let id = raw;
  let region: string | undefined;
  let vendor: string | undefined;
  let deploymentVersion: string | undefined;

  const dvMatch = id.match(/:(\d[\w:]*?)$/);
  if (dvMatch && dvMatch[1] !== undefined) {
    deploymentVersion = dvMatch[1];
    id = id.slice(0, id.length - dvMatch[0].length);
  }

  const dotParts = id.split(".");
  if (dotParts.length >= 2) {
    let startIdx = 0;

    if (dotParts[0] !== undefined && REGIONS.has(dotParts[0])) {
      region = dotParts[0];
      startIdx = 1;
    }

    vendor = dotParts[startIdx];
    id = dotParts.slice(startIdx + 1).join(".");
  }

  const apiVerMatch = id.match(/-v(\d+)$/);
  if (apiVerMatch) {
    if (deploymentVersion === undefined) {
      deploymentVersion = `v${apiVerMatch[1]}`;
    }
    id = id.slice(0, id.length - apiVerMatch[0].length);
  }

  return { bareId: id, region, vendor, deploymentVersion };
}

function stripVertexAnthropic(raw: string): StrippedResult {
  const atIdx = raw.indexOf("@");
  if (atIdx === -1) return { bareId: raw };

  const bareId = raw.slice(0, atIdx);
  const routingTag = raw.slice(atIdx + 1);
  return { bareId, routingTag };
}

function stripVertex(raw: string): StrippedResult {
  let id = raw;
  let vendor: string | undefined;
  let maasSuffix: boolean | undefined;

  const slashIdx = id.indexOf("/");
  if (slashIdx !== -1) {
    vendor = id.slice(0, slashIdx);
    id = id.slice(slashIdx + 1);
  }

  if (id.endsWith("-maas")) {
    maasSuffix = true;
    id = id.slice(0, -5);
  }

  return { bareId: id, vendor, maasSuffix };
}

function stripOpenRouterSlug(raw: string): StrippedResult {
  const slashIdx = raw.indexOf("/");
  if (slashIdx === -1) return { bareId: raw };

  const vendor = raw.slice(0, slashIdx);
  const bareId = raw.slice(slashIdx + 1);
  return { bareId, vendor };
}

function stripMinimal(raw: string): StrippedResult {
  return { bareId: raw };
}

export function stripProviderWrapper(raw: string, platform: string): StrippedResult {
  switch (platform) {
    case "amazon-bedrock":
      return stripBedrock(raw);
    case "google-vertex-anthropic":
      return stripVertexAnthropic(raw);
    case "google-vertex":
      return stripVertex(raw);
    case "openrouter":
      return stripOpenRouterSlug(raw);
    case "anthropic":
    case "azure":
    case "openai":
    default:
      return stripMinimal(raw);
  }
}
