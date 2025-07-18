import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  LockdownMCPServerJSON,
  McpTool,
  PolicyManager,
  ServerConnection,
} from "./";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import { readFileSync } from "node:fs";
import { ZodRawShape } from "zod";

const readDownstreamMcpServersJson = (filepath: string) => {
  const file = readFileSync(filepath, "utf8");
  const mcpServersJson = JSON.parse(file) as LockdownMCPServerJSON;

  const servers = Object.keys(mcpServersJson.servers).map((key) => ({
    name: key,
    ...mcpServersJson.servers[key],
  }));

  console.log("Connecting Lockdown to the following MCP servers...");
  console.log(
    servers.map((server) => `- ${server.name} (${server.type})`).join("\n")
  );
  return servers;
};

// Call a given tool on a server
const callTool = async (server: ServerConnection, tool: McpTool, args: any) => {
  const client = new Client({
    name: "MCP Lockdown Client",
    version: "1.0.0",
  });

  console.log(`Using: ${server.name} - ${tool.name}`);
  if (server.type === "stdio") {
    const transport = new StdioClientTransport(server);
    await client.connect(transport);
  } else {
    // TODO - not handling remote MCP yet
    return {
      content: [
        { type: "text", text: "Sorry that MCP server is not yet supported" },
      ],
    };
  }

  return client.callTool({ name: tool.name, arguments: args });
};

const toolIsValid = async (pm: PolicyManager, tool: McpTool) => {
  const result = await pm.evaluate(tool);
  if (result) {
    console.log(`\t✅ Tool validation passed for ${tool.name}`);
  } else {
    console.error(
      `\t❌ Tool validation failed, ${tool.name} will not be registered\n`
    );
  }

  return result;
};

// given server connection details
// return a list of tools for that server that lockdown allows
const fetchValidToolsManifest = async (
  pm: PolicyManager,
  server: ServerConnection
) => {
  const client = new Client({
    name: "MCP Lockdown Client",
    version: "1.0.0",
  });

  console.log(`Registering MCP Server: ${server.name}`);
  if (server.type === "stdio") {
    const transport = new StdioClientTransport(server);
    await client.connect(transport);
  } else {
    // TODO - not handling remote MCP yet
    return {
      ...server,
      tools: [],
    };
  }

  const tools = await client.listTools();
  return {
    ...server,
    tools: (
      await Promise.all(
        tools.tools.map(async (t) => ({
          ...t,
          // TODO fix any
          isValid: await toolIsValid(pm, t),
        }))
      )
    ).filter((tool) => tool.isValid),
  };
};

export const LockdownServer = async ({
  policyManager,
  lockdownServerJson,
}: {
  policyManager: PolicyManager;
  lockdownServerJson: string;
}) => {
  // Loop through all servers requested from lockdown
  // remove tools that don't pass policies
  const validatedServers = await Promise.all(
    readDownstreamMcpServersJson(lockdownServerJson).map((server) =>
      fetchValidToolsManifest(policyManager, server)
    )
  );

  // Create an MCP server to return with the proxy tools registered
  const lockdownServer = new McpServer({
    name: "Lockdown MCP Server",
    version: "1.0.0",
  });

  // Create a tool for each for tool in the MCP servers
  validatedServers.forEach(async (server) => {
    server.tools.forEach((tool: any) => {
      // convert JSON schema back to Zod schema
      const zodSchema = convertJsonSchemaToZod(tool.inputSchema) as any;
      const keys = zodSchema.keyof().options;
      let inputSchema: ZodRawShape = {};
      for (const key of keys) {
        inputSchema[key] = zodSchema.shape[key];
      }

      lockdownServer.registerTool(
        `${tool.name}_using_${server.name}`,
        {
          ...tool,
          inputSchema: inputSchema,
        },
        (args) => {
          // TODO - can do more prompt validation here
          // e.g. check the response, check the args
          return callTool(server, tool, args) as any;
        }
      );
    });
  });

  // Register Lockdown internal tools
  lockdownServer.registerTool(
    "explain_missing_tools",
    {
      title: "Lockdown Explain Missing Tools",
      description:
        "Returns a list of reasons that tools were removed from the lockdown MCP server",
      annotations: {
        title: "Lockdown Explain Missing Tools",
        description:
          "Returns a list of reasons that tools were removed from the lockdown MCP server",
      },
    },
    async () => {
      return {
        content: [
          { type: "text", text: policyManager.listRejections().join(", ") },
        ],
      };
    }
  );

  return lockdownServer;
};
