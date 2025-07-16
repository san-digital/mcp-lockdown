import { PolicyManager, builtInPolicies } from "../src/policy";
import { z } from "zod";
import { McpTool } from "../src/types";

describe("PolicyManager with refined policies and shields", () => {
    const safeTool: McpTool = { name: "safe-tool", description: JSON.stringify({ desc: "valid" }), schema: z.any(), handlerHash: "", publicKey: "" };
    const fsTool: McpTool = { name: "fs-tool", description: "uses fs.readFileSync", schema: z.any(), handlerHash: "", publicKey: "" };
    const execTool: McpTool = { name: "exec-tool", description: "child_process.exec('rm -rf /')", schema: z.any(), handlerHash: "", publicKey: "" };
    const evalTool: McpTool = { name: "eval-tool", description: "eval('2+2')", schema: z.any(), handlerHash: "", publicKey: "" };
    const netTool: McpTool = { name: "net-tool", description: "fetch('https://malicious.com')", schema: z.any(), handlerHash: "", publicKey: "" };
    const longTool: McpTool = { name: "long-tool", description: "a".repeat(201), schema: z.any(), handlerHash: "", publicKey: "" };
    const hiddenTool: McpTool = { name: "hidden-tool", description: "---\nsecret", schema: z.any(), handlerHash: "", publicKey: "" };
    const nameTool: McpTool = { name: "BadName!", description: JSON.stringify({ desc: "ok" }), schema: z.any(), handlerHash: "", publicKey: "" };
    const zeroWidthTool: McpTool = { name: "zw-tool", description: "hello\u200Bworld", schema: z.any(), handlerHash: "", publicKey: "" };
    const badJsonTool: McpTool = { name: "json-tool", description: "not a json", schema: z.any(), handlerHash: "", publicKey: "" };

    let pm: PolicyManager;
    beforeEach(() => {
        pm = new PolicyManager();
        pm.registerPolicies(builtInPolicies);
    });

    test("allows safe tool with JSON metadata", async () => {
        await expect(pm.evaluate(safeTool)).resolves.not.toThrow();
    });

    test("vetoes filesystem tool", async () => {
        await expect(pm.evaluate(fsTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes exec tool", async () => {
        await expect(pm.evaluate(execTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes eval tool", async () => {
        await expect(pm.evaluate(evalTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes network tool", async () => {
        await expect(pm.evaluate(netTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes long description tool", async () => {
        await expect(pm.evaluate(longTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes hidden instructions tool", async () => {
        await expect(pm.evaluate(hiddenTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes bad name tool", async () => {
        await expect(pm.evaluate(nameTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes zero-width tool", async () => {
        await expect(pm.evaluate(zeroWidthTool)).rejects.toThrow(/policy veto/);
    });

    test("vetoes bad JSON metadata tool", async () => {
        await expect(pm.evaluate(badJsonTool)).rejects.toThrow(/policy veto/);
    });
});