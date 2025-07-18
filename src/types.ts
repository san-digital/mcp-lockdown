import { ZodSchema } from "zod";

// TODO - update these 'any's to match MCP server.json spec
export type ServerConnection = {} & any;
export type ServerConnectionInputs = {} & any;

export interface LockdownMCPServerJSON {
    servers: Record<string, ServerConnection>;
    inputs: ServerConnectionInputs[];
};

export interface McpTool {
    name: string;
    description?: string | undefined;
    // TODO - fix any
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
