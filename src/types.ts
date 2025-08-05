import { ZodSchema } from "zod";

// TODO - update these 'any's to match MCP server.json spec
export type ServerConnectionJson = {
    type: "stdio"
    command: string;
    args: string[];
} | {
    type: "http";
    url: string;
    requestInit?: RequestInit;
};

export type ServerConnection = {
    name: string;
    type: "stdio"
    command: string;
    args: string[];
} | {
    name: string;
    type: "http";
    url: string;
    requestInit?: RequestInit;
};

export interface LockdownMCPServerJSON {
    servers: Record<string, ServerConnectionJson>;
};

export interface McpTool {
    name: string;
    description?: string | undefined;
    inputSchema: any | ZodSchema<unknown>;
    handlerHash?: string;
    publicKey?: string;
}

export interface McpManifest {
    schemaVersion: string;
    nameForHuman: string;
    nameForModel: string;
    description: string;
    version: string;
    signature: string;
    tools: McpTool[];
    metadata?: {
        author?: string;
        license?: string;
        repository?: string;
        tags?: string[];
    };
}

export interface Registry {
    tools: Array<{ 
        name: string; 
        description: string;
        handlerHash: string; 
        publicKey: string; 
        inputSchema: unknown 
    }>;
    metadata?: {
        version?: string;
        lastUpdated?: string;
        registryHash?: string;
    };
}

export type PolicyRule = (tool: McpTool) => Promise<boolean> | boolean;
