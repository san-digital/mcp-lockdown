import { verifySignature, verifyHash } from "../src/utils";
import { McpManifest, McpTool } from "../src/types";
import { z } from "zod";
import crypto from "crypto";

describe("Utility Functions", () => {
    describe("verifySignature", () => {
        it("should verify a valid signature", () => {
            const manifest: McpManifest = {
                schemaVersion: "1.0.0",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest for signature verification",
                version: "1.0.0",
                tools: [
                    {
                        name: "test-tool",
                        description: "A test tool",
                        schema: z.string(),
                        handlerHash: "abc123",
                        publicKey: "test-key"
                    }
                ],
                signature: ""
            };

            const data = JSON.stringify(manifest.tools);
            const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }
            });

            const sign = crypto.createSign("SHA256");
            sign.update(data);
            const signature = sign.sign(privateKey, "base64");

            manifest.signature = signature;

            expect(verifySignature(manifest, publicKey, signature)).toBe(true);
        });

        it("should reject an invalid signature", () => {
            const manifest: McpManifest = {
                schemaVersion: "1.0.0",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest for signature verification",
                version: "1.0.0",
                tools: [
                    {
                        name: "test-tool",
                        description: "A test tool",
                        schema: z.string(),
                        handlerHash: "abc123",
                        publicKey: "test-key"
                    }
                ],
                signature: ""
            };

            const { publicKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }
            });

            const invalidSignature = "invalid-signature";

            expect(verifySignature(manifest, publicKey, invalidSignature)).toBe(false);
        });

        it("should reject signature with wrong public key", () => {
            const manifest: McpManifest = {
                schemaVersion: "1",
                nameForHuman: "Test Manifest",
                nameForModel: "test_manifest",
                description: "A test manifest",
                version: "1.0.0",
                tools: [
                    {
                        name: "test-tool",
                        description: "A test tool",
                        schema: z.string(),
                        handlerHash: "abc123",
                        publicKey: "test-key"
                    }
                ],
                signature: ""
            };

            const { privateKey, publicKey: correctPublicKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }
            });

            const { publicKey: wrongPublicKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }
            });

            const data = JSON.stringify(manifest.tools);
            const sign = crypto.createSign("SHA256");
            sign.update(data);
            const signature = sign.sign(privateKey, "base64");

            expect(verifySignature(manifest, wrongPublicKey, signature)).toBe(false);
        });
    });

    describe("verifyHash", () => {
        it("should pass when hashes match", () => {
            const tool: McpTool = {
                name: "test-tool",
                description: "A test tool",
                schema: z.string(),
                handlerHash: "expected-hash",
                publicKey: "test-key"
            };

            expect(() => verifyHash(tool, "expected-hash")).not.toThrow();
        });

        it("should throw error when hashes don't match", () => {
            const tool: McpTool = {
                name: "test-tool",
                description: "A test tool",
                schema: z.string(),
                handlerHash: "expected-hash",
                publicKey: "test-key"
            };

            expect(() => verifyHash(tool, "different-hash")).toThrow("hash mismatch for test-tool");
        });

        it("should include tool name in error message", () => {
            const tool: McpTool = {
                name: "my-special-tool",
                description: "A test tool",
                schema: z.string(),
                handlerHash: "expected-hash",
                publicKey: "test-key"
            };

            expect(() => verifyHash(tool, "different-hash")).toThrow("hash mismatch for my-special-tool");
        });
    });
}); 