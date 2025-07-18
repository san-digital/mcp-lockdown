import fs from "fs/promises";
import { McpManifest, Registry } from "./types";
import { verifySignature, verifyHash } from "./utils";
import { compareSchemas, createSchemaFromJson } from "./schema";
import { PolicyManager } from "./policy";
import { ZodSchema } from "zod";

export async function loadManifest(path: string): Promise<McpManifest> {
  try {
    const raw = await fs.readFile(path, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed.tools || !Array.isArray(parsed.tools)) {
      throw new Error("Invalid manifest: missing or invalid tools array");
    }

    if (!parsed.signature) {
      throw new Error("Invalid manifest: missing signature");
    }

    const manifest = parsed as McpManifest;

    return manifest;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in manifest file: ${error.message}`);
    }
    throw error;
  }
}

export async function validateManifest(
  manifest: McpManifest,
  registry: Registry,
  policyManager: PolicyManager
): Promise<void> {
  if (!registry.tools || !Array.isArray(registry.tools)) {
    throw new Error("Invalid registry: missing or invalid tools array");
  }

  // TODO - separate signing from validation so that validation can be run standalone
  //        or optionally with a registry
  // TODO - tool to be able to add manifest/tools to registry
  // TODO - registry needs to store the MCP server the tool belongs to,
  //        the tool names are only unique within a server, not globally

  // Verify signature first, before any modifications to the manifest
  const firstTool = manifest.tools[0];
  const pinned = registry.tools.find(
    (t: { name: string }) => t.name === firstTool.name
  );
  if (!pinned) {
    throw new Error(`No registry entry for tool: ${firstTool.name}`);
  }

  if (!verifySignature(manifest, pinned.publicKey, manifest.signature)) {
    throw new Error(`Invalid signature for manifest`);
  }

  // Now convert schemas after signature verification
  for (const tool of manifest.tools) {
    if (tool.schema && typeof tool.schema === "object") {
      tool.schema = createSchemaFromJson(tool.schema);
    }
  }

  // Continue with other validations
  for (const tool of manifest.tools) {
    const pinned = registry.tools.find(
      (t: { name: string }) => t.name === tool.name
    );
    if (!pinned) {
      throw new Error(`No registry entry for tool: ${tool.name}`);
    }

    verifyHash(tool, pinned.handlerHash);

    const registrySchema = createSchemaFromJson(pinned.schema);
    if (!compareSchemas(tool.schema, registrySchema)) {
      throw new Error(`Schema mismatch for tool: ${tool.name}`);
    }

    const policyResult = await policyManager.evaluate(tool);
    if (!policyResult) {
      throw new Error(policyManager.lastRejection());
    }
  }
}
