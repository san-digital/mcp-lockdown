const fs = require("fs");

// Read the new public key
const newPublicKey = fs.readFileSync("test.pub", "utf8").replace(/\n/g, "\\n");

// Update manifest
const manifest = JSON.parse(fs.readFileSync("mcp-manifest.json", "utf8"));
manifest.tools.forEach(tool => {
    tool.publicKey = newPublicKey;
});
fs.writeFileSync("mcp-manifest.json", JSON.stringify(manifest, null, 4));

// Update registry
const registry = JSON.parse(fs.readFileSync("tool-registry.json", "utf8"));
registry.tools.forEach(tool => {
    tool.publicKey = newPublicKey;
});
fs.writeFileSync("tool-registry.json", JSON.stringify(registry, null, 4));

console.log("✅ Updated public keys in both manifest and registry"); 