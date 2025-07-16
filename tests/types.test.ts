import { McpTool, McpManifest, Registry, PolicyRule, PromptShield } from "../src/types";
import { z } from "zod";

describe("Type Definitions", () => {
    describe("McpTool", () => {
        it("should create a valid McpTool instance", () => {
            const tool: McpTool = {
                name: "test-tool",
                description: "A test tool",
                schema: z.string(),
                handlerHash: "abc123",
                publicKey: "public-key-123"
            };

            expect(tool.name).toBe("test-tool");
            expect(tool.description).toBe("A test tool");
            expect(tool.handlerHash).toBe("abc123");
            expect(tool.publicKey).toBe("public-key-123");
        });

        it("should validate schema is a ZodSchema", () => {
            const tool: McpTool = {
                name: "test-tool",
                description: "A test tool",
                schema: z.object({ test: z.string() }),
                handlerHash: "abc123",
                publicKey: "public-key-123"
            };

            expect(tool.schema).toBeInstanceOf(z.ZodObject);
        });
    });

    describe("McpManifest", () => {
        it("should create a valid McpManifest instance", () => {
            const manifest: McpManifest = {
                schemaVersion: "2024-01-01",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                signature: "signature123",
                tools: [
                    {
                        name: "tool1",
                        description: "First tool",
                        schema: z.string(),
                        handlerHash: "hash1",
                        publicKey: "key1"
                    }
                ]
            };

            expect(manifest.tools).toHaveLength(1);
            expect(manifest.signature).toBe("signature123");
        });

        it("should handle multiple tools", () => {
            const manifest: McpManifest = {
                schemaVersion: "2024-01-01",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                signature: "signature123",
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

            expect(manifest.tools).toHaveLength(2);
            expect(manifest.tools[0].name).toBe("tool1");
            expect(manifest.tools[1].name).toBe("tool2");
        });
    });

    describe("Registry", () => {
        it("should create a valid Registry instance", () => {
            const registry: Registry = {
                tools: [
                    {
                        name: "tool1",
                        description: "desc",
                        handlerHash: "hash1",
                        publicKey: "key1",
                        schema: { type: "string" }
                    }
                ]
            };

            expect(registry.tools).toHaveLength(1);
            expect(registry.tools[0].name).toBe("tool1");
        });
    });

    describe("PolicyRule", () => {
        it("should create a valid PolicyRule function", () => {
            const policyRule: PolicyRule = (tool: McpTool): boolean => {
                return tool.name.length > 0;
            };

            const tool: McpTool = {
                name: "test-tool",
                description: "A test tool",
                schema: z.string(),
                handlerHash: "abc123",
                publicKey: "public-key-123"
            };

            expect(policyRule(tool)).toBe(true);
        });
    });

    describe("PromptShield", () => {
        it("should create a valid synchronous PromptShield function", () => {
            const promptShield: PromptShield = (description: string): boolean => {
                return !description.includes("malicious");
            };

            expect(promptShield("safe description")).toBe(true);
            expect(promptShield("malicious description")).toBe(false);
        });

        it("should create a valid asynchronous PromptShield function", async () => {
            const promptShield: PromptShield = async (description: string): Promise<boolean> => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(!description.includes("malicious"));
                    }, 10);
                });
            };

            await expect(promptShield("safe description")).resolves.toBe(true);
            await expect(promptShield("malicious description")).resolves.toBe(false);
        });
    });
}); 