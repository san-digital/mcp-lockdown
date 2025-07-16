import crypto from "crypto";
import { McpManifest, McpTool } from "./types";

export function verifySignature(
    manifest: McpManifest,
    pubkey: string,
    signature: string
): boolean {
    const data = JSON.stringify(manifest.tools);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(data);
    // Convert escaped newlines to actual newlines for PEM format
    const formattedPubkey = pubkey.replace(/\\n/g, "\n");
    console.log("Debug - Data being verified:", data.substring(0, 100) + "...");
    console.log("Debug - Public key format:", formattedPubkey.substring(0, 50) + "...");
    console.log("Debug - Signature:", signature.substring(0, 50) + "...");
    const result = verifier.verify(formattedPubkey, signature, "base64");
    console.log("Debug - Verification result:", result);
    return result;
}

export function verifyHash(tool: McpTool, expected: string): void {
    if (tool.handlerHash !== expected) {
        throw new Error(`hash mismatch for ${tool.name}`);
    }
}