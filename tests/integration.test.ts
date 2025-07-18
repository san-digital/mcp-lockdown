import { loadManifest, validateManifest } from "../src/manifest";
import { PolicyManager, builtInPolicies } from "../src/policy";
import { McpManifest, McpTool, Registry } from "../src/types";
import { z } from "zod";
import fs from "fs/promises";

// Mock fs for testing
jest.mock("fs/promises");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Integration Tests", () => {
  describe("Complete Workflow", () => {
    let validManifest: McpManifest;
    let validRegistry: Registry;
    let policyManager: PolicyManager;

    beforeEach(() => {
      // Create a valid manifest with proper signature
      const tools = [
        {
          name: "safe-tool",
          description: JSON.stringify({
            desc: "A safe tool",
            version: "1.0.0",
          }),
          schema: z.object({ input: z.string() }),
          handlerHash: "abc123hash",
          publicKey: "test-public-key",
        },
        {
          name: "another-tool",
          description: JSON.stringify({
            desc: "Another safe tool",
            category: "utility",
          }),
          schema: z.object({ count: z.number() }),
          handlerHash: "def456hash",
          publicKey: "test-public-key",
        },
      ];

      validManifest = {
        schemaVersion: "2024-01-01",
        nameForHuman: "Test Manifest",
        nameForModel: "test_manifest",
        description: "A test manifest",
        version: "1.0.0",
        signature: "test-signature",
        tools,
      };

      validRegistry = {
        tools: [
          {
            name: "safe-tool",
            description: "desc",
            handlerHash: "abc123hash",
            publicKey: "test-public-key",
            schema: z.object({ input: z.string() }),
          },
          {
            name: "another-tool",
            description: "desc",
            handlerHash: "def456hash",
            publicKey: "test-public-key",
            schema: z.object({ count: z.number() }),
          },
        ],
      };

      policyManager = new PolicyManager();
      policyManager.registerPolicies(builtInPolicies);
    });

    it("should successfully validate a complete valid manifest", async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(validManifest));

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      const loadedManifest = await loadManifest("./test-manifest.json");
      await expect(
        validateManifest(loadedManifest, validRegistry, policyManager)
      ).resolves.not.toThrow();
    });

    it("should reject manifest with policy violations", async () => {
      const maliciousManifest: McpManifest = {
        ...validManifest,
        tools: [
          {
            name: "malicious-tool",
            description:
              "This tool uses fs.readFileSync to read sensitive files",
            schema: z.string(),
            handlerHash: "malicious-hash",
            publicKey: "test-public-key",
          },
        ],
      };

      const maliciousRegistry: Registry = {
        tools: [
          {
            name: "malicious-tool",
            description:
              "This tool uses fs.readFileSync to read sensitive files",
            handlerHash: "malicious-hash",
            publicKey: "test-public-key",
            schema: z.string(),
          },
        ],
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(maliciousManifest));

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      const loadedManifest = await loadManifest("./test-manifest.json");
      await expect(
        validateManifest(loadedManifest, maliciousRegistry, policyManager)
      ).rejects.toThrow(/policy veto/);
    });

    it("should reject manifest with exec violations", async () => {
      const execManifest: McpManifest = {
        ...validManifest,
        tools: [
          {
            name: "exec-tool",
            description: "This tool executes child_process.exec('rm -rf /')",
            schema: z.string(),
            handlerHash: "exec-hash",
            publicKey: "test-public-key",
          },
        ],
      };

      const execRegistry: Registry = {
        tools: [
          {
            name: "exec-tool",
            description: "This tool executes child_process.exec('rm -rf /')",
            handlerHash: "exec-hash",
            publicKey: "test-public-key",
            schema: z.string(),
          },
        ],
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(execManifest));

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      const loadedManifest = await loadManifest("./test-manifest.json");
      await expect(
        validateManifest(loadedManifest, execRegistry, policyManager)
      ).rejects.toThrow(/policy veto/);
    });

    it("should reject manifest with network violations", async () => {
      const networkManifest: McpManifest = {
        ...validManifest,
        tools: [
          {
            name: "network-tool",
            description: "This tool fetches from https://malicious-site.com",
            schema: z.string(),
            handlerHash: "network-hash",
            publicKey: "test-public-key",
          },
        ],
      };

      const networkRegistry: Registry = {
        tools: [
          {
            name: "network-tool",
            description: "This tool fetches from https://malicious-site.com",
            handlerHash: "network-hash",
            publicKey: "test-public-key",
            schema: z.string(),
          },
        ],
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(networkManifest));

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      const loadedManifest = await loadManifest("./test-manifest.json");
      await expect(
        validateManifest(loadedManifest, networkRegistry, policyManager)
      ).rejects.toThrow(/policy veto/);
    });

    it("should allow manifest with trusted network domains", async () => {
      const trustedNetworkManifest: McpManifest = {
        ...validManifest,
        tools: [
          {
            name: "trusted-network-tool",
            description: JSON.stringify({
              desc: "This tool fetches from https://example.com/api",
            }),
            schema: z.string(),
            handlerHash: "trusted-hash",
            publicKey: "test-public-key",
          },
        ],
      };

      const trustedNetworkRegistry: Registry = {
        tools: [
          {
            name: "trusted-network-tool",
            description: JSON.stringify({
              desc: "This tool fetches from https://example.com/api",
            }),
            handlerHash: "trusted-hash",
            publicKey: "test-public-key",
            schema: z.string(),
          },
        ],
      };

      mockedFs.readFile.mockResolvedValue(
        JSON.stringify(trustedNetworkManifest)
      );

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      const loadedManifest = await loadManifest("./test-manifest.json");
      await expect(
        validateManifest(loadedManifest, trustedNetworkRegistry, policyManager)
      ).resolves.not.toThrow();
    });
  });

  describe("Custom Policy Integration", () => {
    it("should work with custom policy rules", async () => {
      const customPolicy = (tool: any): boolean => {
        return !tool.description.includes("custom-forbidden");
      };

      const policyManager = new PolicyManager();
      policyManager.registerPolicies([customPolicy]);

      const manifest: McpManifest = {
        schemaVersion: "2024-01-01",
        nameForHuman: "Test Manifest",
        nameForModel: "test_manifest",
        description: "A test manifest",
        version: "1.0.0",
        signature: "test-signature",
        tools: [
          {
            name: "custom-tool",
            description: "This tool is custom-forbidden",
            schema: z.string(),
            handlerHash: "custom-hash",
            publicKey: "test-key",
          },
        ],
      };

      const registry: Registry = {
        tools: [
          {
            name: "custom-tool",
            description: "This tool is custom-forbidden",
            handlerHash: "custom-hash",
            publicKey: "test-key",
            schema: z.string(),
          },
        ],
      };
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      await expect(
        validateManifest(manifest, registry, policyManager)
      ).rejects.toThrow(/policy veto/);
    });

    it("should work with custom prompt shields", async () => {
      const customShield = async ({
        description,
      }: McpTool): Promise<boolean> => {
        return !description.includes("shielded-content");
      };

      const policyManager = new PolicyManager();
      policyManager.registerPolicies([...builtInPolicies, customShield]);

      const manifest: McpManifest = {
        schemaVersion: "2024-01-01",
        nameForHuman: "Test Manifest",
        nameForModel: "test_manifest",
        description: "A test manifest",
        version: "1.0.0",
        signature: "test-signature",
        tools: [
          {
            name: "shielded-tool",
            description: JSON.stringify({
              desc: "This tool contains shielded-content",
            }),
            schema: z.string(),
            handlerHash: "shielded-hash",
            publicKey: "test-key",
          },
        ],
      };

      const registry: Registry = {
        tools: [
          {
            name: "shielded-tool",
            handlerHash: "shielded-hash",
            publicKey: "test-key",
            schema: z.string(),
            description: "",
          },
        ],
      };

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(true);

      await expect(
        validateManifest(manifest, registry, policyManager)
      ).rejects.toThrow(/policy veto/);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle missing registry entries gracefully", async () => {
      const manifest: McpManifest = {
        schemaVersion: "2024-01-01",
        nameForHuman: "Test Manifest",
        nameForModel: "test_manifest",
        description: "A test manifest",
        version: "1.0.0",
        signature: "test-signature",
        tools: [
          {
            name: "missing-tool",
            description: "A tool not in registry",
            schema: z.string(),
            handlerHash: "missing-hash",
            publicKey: "test-key",
          },
        ],
      };

      const registry: Registry = {
        tools: [],
      };

      const policyManager = new PolicyManager();
      policyManager.registerPolicies(builtInPolicies);

      await expect(
        validateManifest(manifest, registry, policyManager)
      ).rejects.toThrow("No registry entry for tool: missing-tool");
    });

    it("should handle schema mismatches", async () => {
      const manifest: McpManifest = {
        schemaVersion: "2024-01-01",
        nameForHuman: "Test Manifest",
        nameForModel: "test_manifest",
        description: "A test manifest",
        version: "1.0.0",
        signature: "test-signature",
        tools: [
          {
            name: "schema-tool",
            description: JSON.stringify({ desc: "test" }),
            schema: z.string(),
            handlerHash: "schema-hash",
            publicKey: "test-key",
          },
        ],
      };

      const registry: Registry = {
        tools: [
          {
            name: "schema-tool",
            description: "A tool with a different schema",
            handlerHash: "schema-hash",
            publicKey: "test-key",
            schema: z.number(),
          },
        ],
      };

      const policyManager = new PolicyManager();
      policyManager.registerPolicies(builtInPolicies);

      // Mock the utility functions
      jest
        .spyOn(require("../src/utils"), "verifySignature")
        .mockReturnValue(true);
      jest
        .spyOn(require("../src/utils"), "verifyHash")
        .mockImplementation(() => {});
      jest
        .spyOn(require("../src/schema"), "compareSchemas")
        .mockReturnValue(false);

      await expect(
        validateManifest(manifest, registry, policyManager)
      ).rejects.toThrow("Schema mismatch for tool: schema-tool");
    });
  });
});
