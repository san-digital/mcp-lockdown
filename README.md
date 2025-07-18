# mcp-lockdown

A strict TypeScript library to validate MCP (Model Context Protocol) tool manifests against trusted registries, enforcing cryptographic provenance, schema integrity, and custom policy vetos.

## Features

- **Manifest Validation**: Validate MCP manifest JSON files against a trusted registry with cryptographic signatures and handler hashes.
- **Schema Enforcement**: Compare Zod schemas to detect unauthorized schema changes and ensure input contracts.
- **Policy Engine**: Define, register, and evaluate policy rules and external prompt shields to veto unsafe or undesired tools.
- **CLI Utility**: `mcp-lockdown audit`, `mcp-lockdown policies`, and `mcp-lockdown sign` commands with verbose output support.
- **Environment Configuration**: Configurable policy rules via environment variables.

## Built-in Policy Rules

- `noFilesystem` – blocks hints of filesystem access (e.g. `fs.readFileSync`).
- `noExec` – blocks child-process execution (`exec(`, `spawn(`).
- `noEval` – blocks use of `eval(`.
- `networkAllowlist` – only allows HTTP/HTTPS URLs from trusted domains (configurable via `MCP_NETWORK_ALLOWLIST`).
- `maxDescriptionLength` – enforces a configurable character cap on tool descriptions (default: 200, configurable via `MCP_MAX_DESCRIPTION_LENGTH`).
- `noHiddenInstructions` – disallows hidden-instruction patterns (YAML frontmatter, code fences, placeholders).
- `nameConventions` – enforces lowercase alphanumeric and hyphens in tool names.
- `noZeroWidth` – blocks zero-width and invisible Unicode characters.
- `requireJsonMetadata` – ensures tool description parses as JSON metadata.

## Installation

```bash
npm install mcp-lockdown
```

## Usage

### Library

```ts
import { loadManifest, validateManifest, PolicyManager, builtInPolicies } from "mcp-lockdown";
import fs from "fs/promises";

(async () => {
    // Load and validate a manifest file against a trusted registry
    const manifest = await loadManifest("./mcp-manifest.json");
    const registryRaw = await fs.readFile("./tool-registry.json", "utf-8");
    const registry = JSON.parse(registryRaw);
    
    const pm = new PolicyManager();
    pm.registerPolicies(builtInPolicies);
    // example external shield
    pm.registerShields([async desc => externalShieldService.check(desc)]);
    
    await validateManifest(manifest, registry, pm);
    console.log("Manifest is valid and secure.");
})();
```

### CLI

```bash
# Validate manifest against default registry
mcp-lockdown audit ./mcp-manifest.json

# Validate manifest against custom registry
mcp-lockdown audit ./mcp-manifest.json --registry ./custom-registry.json

# Verbose output for debugging
mcp-lockdown audit ./mcp-manifest.json --verbose

# List available policies
mcp-lockdown policies

# Sign a manifest with a private key
mcp-lockdown sign ./mcp-manifest.json ./private-key.pem
```

### Environment Configuration

You can configure policy rules using environment variables:

```bash
# Configure network allowlist
export MCP_NETWORK_ALLOWLIST="api.example.com,trusted-service.com"

# Configure maximum description length
export MCP_MAX_DESCRIPTION_LENGTH="300"

# Run audit with custom configuration
mcp-lockdown audit ./mcp-manifest.json
```

## Use Cases

This library is designed for scenarios where you need to validate MCP tool manifests before using them:

- **Enterprise environments** requiring approval of MCP tools before deployment
- **Security-conscious deployments** needing cryptographic verification of tool provenance
- **Compliance scenarios** where tool usage must be audited and validated
- **Development workflows** where you want to ensure tool schemas haven't changed unexpectedly

## How It Works

1. **Trusted Registry**: Maintain a registry of approved tools with their cryptographic hashes, public keys, and schemas
2. **Manifest Validation**: When an MCP server provides its tool manifest, validate it against the trusted registry
3. **Policy Enforcement**: Apply security policies to ensure tools meet organisational requirements
4. **Cryptographic Verification**: Verify signatures and hashes to ensure tool integrity

The library validates static manifest files and provides the building blocks for implementing secure MCP tool validation in your applications.
