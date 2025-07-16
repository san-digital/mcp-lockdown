const fs = require("fs");
const { execSync } = require("child_process");
const crypto = require("crypto");

// 1. Update public keys
const newPublicKey = fs.readFileSync("test.pub", "utf8").replace(/\n/g, "\\n");

const manifest = JSON.parse(fs.readFileSync("mcp-manifest.json", "utf8"));
manifest.tools.forEach(tool => {
    tool.publicKey = newPublicKey;
});
fs.writeFileSync("mcp-manifest.json", JSON.stringify(manifest));

const registry = JSON.parse(fs.readFileSync("tool-registry.json", "utf8"));
registry.tools.forEach(tool => {
    tool.publicKey = newPublicKey;
});
fs.writeFileSync("tool-registry.json", JSON.stringify(registry));

// 2. Sign the manifest
const privateKey = fs.readFileSync("test.key", "utf8");
const data = JSON.stringify(manifest.tools);
const sign = crypto.createSign("SHA256");
sign.update(data);
const signature = sign.sign(privateKey, "base64");
manifest.signature = signature;
fs.writeFileSync("mcp-manifest.json", JSON.stringify(manifest));
console.log("✅ Manifest signed. Signature:", signature);

// 3. Audit
console.log("\n--- Audit Output ---\n");
try {
    execSync("node dist/cli.js audit mcp-manifest.json --registry tool-registry.json --verbose", { stdio: "inherit" });
} catch (e) {
    // The audit command will print its own errors
} 