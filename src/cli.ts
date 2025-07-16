#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs/promises";
import { loadManifest, validateManifest } from "./manifest";
import { PolicyManager, builtInPolicies } from "./policy";
import { Registry } from "./types";

const program = new Command();

program
    .command("audit <manifestPath>")
    .description("verify manifest signature, hashes, schemas, and policies")
    .option("-r, --registry <path>", "path to tool registry JSON file", "./tool-registry.json")
    .option("-v, --verbose", "enable verbose output")
    .action(async (manifestPath: string, options: { registry: string; verbose: boolean }) => {
        try {
            const pm = new PolicyManager();
            pm.registerPolicies(builtInPolicies);
            
            if (options.verbose) {
                console.log("🔍 Starting manifest audit...");
            }
            
            const full = path.resolve(process.cwd(), manifestPath);
            const registryPath = path.resolve(process.cwd(), options.registry);
            
            if (options.verbose) {
                console.log(`📁 Manifest path: ${full}`);
                console.log(`📁 Registry path: ${registryPath}`);
            }
            
            let registryData: string;
            try {
                registryData = await fs.readFile(registryPath, "utf-8");
            } catch (error) {
                console.error(`❌ Failed to read registry file: ${registryPath}`);
                console.error(`   Error: ${(error as Error).message}`);
                process.exit(1);
            }
            
            let registry: Registry;
            try {
                registry = JSON.parse(registryData) as Registry;
            } catch (error) {
                console.error(`❌ Invalid JSON in registry file: ${registryPath}`);
                console.error(`   Error: ${(error as Error).message}`);
                process.exit(1);
            }
            
            if (options.verbose) {
                console.log(`📋 Registry contains ${registry.tools?.length || 0} tools`);
            }
            
            const manifest = await loadManifest(full);
            
            if (options.verbose) {
                console.log(`📋 Manifest contains ${manifest.tools?.length || 0} tools`);
            }
            
            await validateManifest(manifest, registry, pm);
            console.log("✅ manifest passed all checks");
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`❌ validation error: ${error.message}`);
            if (options.verbose && error.stack) {
                console.error(`   Stack trace: ${error.stack}`);
            }
            process.exit(1);
        }
    });

program
    .command("policies")
    .description("list registered policies and shields")
    .action(() => {
        const pm = new PolicyManager();
        pm.registerPolicies(builtInPolicies);
        console.log(pm.list().join("\n"));
    });

program
    .command("sign <manifestPath> <privateKeyPath>")
    .description("sign the manifest's tools array with the given private key")
    .action(async (manifestPath: string, privateKeyPath: string) => {
        try {
            const manifestRaw = await fs.readFile(manifestPath, "utf-8");
            const manifest = JSON.parse(manifestRaw);
            const privateKey = await fs.readFile(privateKeyPath, "utf-8");
            const data = JSON.stringify(manifest.tools);
            const sign = require("crypto").createSign("SHA256");
            sign.update(data);
            const signature = sign.sign(privateKey, "base64");
            manifest.signature = signature;
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
            console.log("✅ Manifest signed. Signature:", signature);
        } catch (err) {
            console.error("❌ Error signing manifest:", (err as Error).message);
            process.exit(1);
        }
    });

program.parse(process.argv);