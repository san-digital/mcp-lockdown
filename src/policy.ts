import { McpTool, PolicyRule, PromptShield } from "./types";

export class PolicyManager {
    private rules: PolicyRule[] = [];
    private shields: PromptShield[] = [];

    registerPolicies(rules: PolicyRule[]): void {
        this.rules.push(...rules);
    }

    registerShields(shields: PromptShield[]): void {
        this.shields.push(...shields);
    }

    async evaluate(tool: McpTool): Promise<void> {
        for (const rule of this.rules) {
            if (!rule(tool)) {
                throw new Error(`policy veto: ${tool.name} (${rule.name || "<anonymous>"})`);
            }
        }
        for (const shield of this.shields) {
            const allowed = await Promise.resolve(shield(tool.description));
            if (!allowed) {
                throw new Error(`prompt shield veto: ${tool.name}`);
            }
        }
    }

    list(): string[] {
        const policyNames = this.rules.map(r => r.name || "<anonymous>");
        const shieldNames = this.shields.map((s, i) => s.name || `shield#${i}`);
        return [...policyNames, ...shieldNames];
    }
}

export const builtInPolicies: PolicyRule[] = [
    function noFilesystem(tool: McpTool): boolean {
        return !/fs\./.test(tool.description) && !/readFileSync/.test(tool.description) && !/writeFileSync/.test(tool.description);
    },
    function noExec(tool: McpTool): boolean {
        return !/\bexec\(|spawn\(|child_process\b/.test(tool.description);
    },
    function noEval(tool: McpTool): boolean {
        return !/\beval\(/.test(tool.description);
    },
    function networkAllowlist(tool: McpTool): boolean {
        const allowlist = process.env.MCP_NETWORK_ALLOWLIST?.split(",") || ["example.com", "api.trusted.com"];
        const urlRegex = /https?:\/\/([\w.-]+)/g;
        let match: RegExpExecArray | null;
        while ((match = urlRegex.exec(tool.description)) !== null) {
            if (!allowlist.includes(match[1])) return false;
        }
        return true;
    },
    function maxDescriptionLength(tool: McpTool): boolean {
        const maxLength = parseInt(process.env.MCP_MAX_DESCRIPTION_LENGTH || "200");
        return tool.description.length <= maxLength;
    },
    function noHiddenInstructions(tool: McpTool): boolean {
        return !/(---\s*\n|```|\[\[|\{\{)/.test(tool.description);
    },
    function nameConventions(tool: McpTool): boolean {
        return /^[a-z0-9-]+$/.test(tool.name);
    },
    function noZeroWidth(tool: McpTool): boolean {
        return !/[\u200B-\u200D\uFEFF]/.test(tool.description);
    },
    function requireJsonMetadata(tool: McpTool): boolean {
        try {
            const j = JSON.parse(tool.description);
            return typeof j === "object" && j !== null;
        } catch {
            return false;
        }
    }
]; 