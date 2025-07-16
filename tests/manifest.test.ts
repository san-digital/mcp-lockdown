import { loadManifest, validateManifest } from "../src/manifest";
import { PolicyManager, builtInPolicies } from "../src/policy";
import { McpManifest, Registry } from "../src/types";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock fs for testing
jest.mock("fs/promises");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Manifest Functions", () => {
    describe("loadManifest", () => {
        it("should load a valid manifest from file", async () => {
            const mockManifest: McpManifest = {
                schemaVersion: "2024-01-01",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                signature: "test-signature",
                tools: [
                    {
                        name: "test-tool",
                        description: "A test tool",
                        schema: z.string(),
                        handlerHash: "abc123",
                        publicKey: "test-key"
                    }
                ]
            };

            mockedFs.readFile.mockResolvedValue(JSON.stringify(mockManifest));

            const result = await loadManifest("./test-manifest.json");

            // Compare individual properties instead of full object due to Zod schema serialization
            expect(result.tools).toHaveLength(1);
            expect(result.tools[0].name).toBe("test-tool");
            expect(result.tools[0].description).toBe("A test tool");
            expect(result.tools[0].handlerHash).toBe("abc123");
            expect(result.tools[0].publicKey).toBe("test-key");
            expect(result.signature).toBe("test-signature");
            expect(mockedFs.readFile).toHaveBeenCalledWith("./test-manifest.json", "utf-8");
        });

        it("should throw error for invalid JSON", async () => {
            mockedFs.readFile.mockResolvedValue("invalid json");

            await expect(loadManifest("./test-manifest.json")).rejects.toThrow();
        });

        it("should throw error when file does not exist", async () => {
            mockedFs.readFile.mockRejectedValue(new Error("File not found"));

            await expect(loadManifest("./nonexistent.json")).rejects.toThrow("File not found");
        });

        it("should handle manifest with multiple tools", async () => {
            const mockManifest: McpManifest = {
                schemaVersion: "2024-01-01",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                signature: "test-signature",
                tools: [
                    {
                        name: "tool1",
                        description: "First tool",
                        schema: z.string(),
                        handlerHash: "hash1",
                        publicKey: "key1"
                    },
                    {
                        name: "tool2",
                        description: "Second tool",
                        schema: z.number(),
                        handlerHash: "hash2",
                        publicKey: "key2"
                    }
                ]
            };

            mockedFs.readFile.mockResolvedValue(JSON.stringify(mockManifest));

            const result = await loadManifest("./test-manifest.json");

            expect(result.tools).toHaveLength(2);
            expect(result.tools[0].name).toBe("tool1");
            expect(result.tools[1].name).toBe("tool2");
        });
    });

    describe("validateManifest", () => {
        let mockPolicyManager: PolicyManager;
        let mockManifest: McpManifest;
        let mockRegistry: Registry;

        beforeEach(() => {
            mockPolicyManager = new PolicyManager();
            mockPolicyManager.registerPolicies(builtInPolicies);

            mockManifest = {
                schemaVersion: "2024-01-01",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                signature: "test-signature",
                tools: [
                    {
                        name: "test-tool",
                        description: JSON.stringify({ desc: "valid" }),
                        schema: z.string(),
                        handlerHash: "expected-hash",
                        publicKey: "test-key"
                    }
                ]
            };

            mockRegistry = {
                tools: [
                    {
                        name: "test-tool",
                        description: "desc",
                        handlerHash: "expected-hash",
                        publicKey: "test-key",
                        schema: z.string()
                    }
                ]
            };
        });

        it("should validate a correct manifest", async () => {
            // Mock the utility functions
            jest.spyOn(require("../src/utils"), "verifySignature").mockReturnValue(true);
            jest.spyOn(require("../src/utils"), "verifyHash").mockImplementation(() => {});
            jest.spyOn(require("../src/schema"), "compareSchemas").mockReturnValue(true);

            await expect(validateManifest(mockManifest, mockRegistry, mockPolicyManager)).resolves.not.toThrow();
        });

        it("should throw error when tool not found in registry", async () => {
            const manifestWithUnknownTool: McpManifest = {
                ...mockManifest,
                tools: [
                    {
                        name: "unknown-tool",
                        description: JSON.stringify({ desc: "valid" }),
                        schema: z.string(),
                        handlerHash: "expected-hash",
                        publicKey: "test-key"
                    }
                ]
            };

            await expect(validateManifest(manifestWithUnknownTool, mockRegistry, mockPolicyManager))
                .rejects.toThrow("No registry entry for tool: unknown-tool");
        });

        it("should throw error for invalid signature", async () => {
            jest.spyOn(require("../src/utils"), "verifySignature").mockReturnValue(false);

            await expect(validateManifest(mockManifest, mockRegistry, mockPolicyManager))
                .rejects.toThrow("Invalid signature for manifest");
        });

        it("should throw error for hash mismatch", async () => {
            jest.spyOn(require("../src/utils"), "verifySignature").mockReturnValue(true);
            jest.spyOn(require("../src/utils"), "verifyHash").mockImplementation(() => {
                throw new Error("hash mismatch for test-tool");
            });

            await expect(validateManifest(mockManifest, mockRegistry, mockPolicyManager))
                .rejects.toThrow("hash mismatch for test-tool");
        });

        it("should throw error for schema mismatch", async () => {
            jest.spyOn(require("../src/utils"), "verifySignature").mockReturnValue(true);
            jest.spyOn(require("../src/utils"), "verifyHash").mockImplementation(() => {});
            jest.spyOn(require("../src/schema"), "compareSchemas").mockReturnValue(false);

            await expect(validateManifest(mockManifest, mockRegistry, mockPolicyManager))
                .rejects.toThrow("Schema mismatch for tool: test-tool");
        });

        it("should throw error when policy evaluation fails", async () => {
            const manifestWithBadTool: McpManifest = {
                ...mockManifest,
                tools: [
                    {
                        name: "bad-tool",
                        description: "uses fs.readFileSync",
                        schema: z.string(),
                        handlerHash: "expected-hash",
                        publicKey: "test-key"
                    }
                ]
            };

            const registryWithBadTool: Registry = {
                tools: [
                    {
                        name: "bad-tool",
                        description: "desc",
                        handlerHash: "expected-hash",
                        publicKey: "test-key",
                        schema: z.string()
                    }
                ]
            };

            jest.spyOn(require("../src/utils"), "verifySignature").mockReturnValue(true);
            jest.spyOn(require("../src/utils"), "verifyHash").mockImplementation(() => {});
            jest.spyOn(require("../src/schema"), "compareSchemas").mockReturnValue(true);

            await expect(validateManifest(manifestWithBadTool, registryWithBadTool, mockPolicyManager))
                .rejects.toThrow(/policy veto/);
        });

        it("should validate multiple tools in manifest", async () => {
            const multiToolManifest: McpManifest = {
                schemaVersion: "2024-01-01",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                signature: "test-signature",
                tools: [
                    {
                        name: "tool1",
                        description: JSON.stringify({ desc: "valid" }),
                        schema: z.string(),
                        handlerHash: "hash1",
                        publicKey: "key1"
                    },
                    {
                        name: "tool2",
                        description: JSON.stringify({ desc: "valid" }),
                        schema: z.number(),
                        handlerHash: "hash2",
                        publicKey: "key2"
                    }
                ]
            };

            const multiToolRegistry: Registry = {
                tools: [
                    {
                        name: "tool1",
                        description: "desc",
                        handlerHash: "hash1",
                        publicKey: "key1",
                        schema: z.string()
                    },
                    {
                        name: "tool2",
                        description: "desc",
                        handlerHash: "hash2",
                        publicKey: "key2",
                        schema: z.number()
                    }
                ]
            };

            jest.spyOn(require("../src/utils"), "verifySignature").mockReturnValue(true);
            jest.spyOn(require("../src/utils"), "verifyHash").mockImplementation(() => {});
            jest.spyOn(require("../src/schema"), "compareSchemas").mockReturnValue(true);

            await expect(validateManifest(multiToolManifest, multiToolRegistry, mockPolicyManager))
                .resolves.not.toThrow();
        });
    });
}); 