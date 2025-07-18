import { ZodSchema } from "zod";

export interface McpTool {
    name: string;
    description: string;
    schema: ZodSchema<unknown>;
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
        schema: unknown 
    }>;
    metadata?: {
        version?: string;
        lastUpdated?: string;
        registryHash?: string;
    };
}

export type PolicyRule = (tool: McpTool) => Promise<boolean> | boolean;
