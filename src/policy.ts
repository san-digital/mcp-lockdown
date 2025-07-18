import type { McpTool, PolicyRule } from "./types";

export class PolicyManager {
  private rules: PolicyRule[] = [];
  private rejections: string[] = [];

  registerPolicies(rules: PolicyRule[]): void {
    this.rules.push(...rules);
  }

  async evaluate(tool: McpTool): Promise<boolean> {
    for (const rule of this.rules) {
      const passedValidation = await rule(tool);
      if (!passedValidation) {
        console.error(
          `policy veto: ${tool.name} (${rule.name || "<anonymous>"})`
        );
        this.rejections.push(
          `policy veto: ${tool.name} (${rule.name || "<anonymous>"})`
        );
        return false;
      }
    }

    return true;
  }

  listRejections(): string[] {
    return this.rejections;
  }

  lastRejection(): string {
    if (!this.rejections.length) return "";

    return this.rejections[this.rejections.length - 1];
  }

  list(): string[] {
    return this.rules.map((r) => r.name || "<anonymous>");
  }
}

export const builtInPolicies: PolicyRule[] = [
  function hasDescription({ description }: McpTool): boolean {
    return !!description;
  },
  function noFilesystem(tool: McpTool): boolean {
    return (
      !/fs\./.test(tool.description ?? "") &&
      !/readFileSync/.test(tool.description ?? "") &&
      !/writeFileSync/.test(tool.description ?? "")
    );
  },
  function noExec(tool: McpTool): boolean {
    return !/\bexec\(|spawn\(|child_process\b/.test(tool.description ?? "");
  },
  function noEval(tool: McpTool): boolean {
    return !/\beval\(/.test(tool.description ?? "");
  },
  function networkAllowlist(tool: McpTool): boolean {
    const allowlist = process.env.MCP_NETWORK_ALLOWLIST?.split(",") || [
      "example.com",
      "api.trusted.com",
    ];
    const urlRegex = /https?:\/\/([\w.-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(tool.description ?? "")) !== null) {
      if (!allowlist.includes(match[1])) return false;
    }
    return true;
  },
  function maxDescriptionLength(tool: McpTool): boolean {
    const maxLength = parseInt(process.env.MCP_MAX_DESCRIPTION_LENGTH || "200");
    return !tool.description || tool.description.length <= maxLength;
  },
  function noHiddenInstructions(tool: McpTool): boolean {
    return !/(---\s*\n|```|\[\[|\{\{)/.test(tool.description ?? "");
  },
  function nameConventions(tool: McpTool): boolean {
    return /^[a-z0-9-]+$/.test(tool.name);
  },
  function noZeroWidth(tool: McpTool): boolean {
    return !/[\u200B-\u200D\uFEFF]/.test(tool.description ?? "");
  },
];
