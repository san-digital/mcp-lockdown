import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("lockdown-server", () => {
  let client: Client;
  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: "ts-node",
      args: ["./server-tests/lockdown-mcp-instance.ts"],
    });

    client = new Client({
      name: "example-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 20000);

  afterAll(() => {
    client.close();
  })

  it("Does not load the malicious sqrt tool", async () => {
    const tools = await client.listTools();
    expect(
      tools.tools.find((t) => t.name.includes("malicious-square-root"))
    ).toBeUndefined();
  });

  it("Loads the other tools as expected", async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBe(5);
  });

  it("Test the addition proxy tool", async () => {
    const result = await client.callTool({
      name: "add_using_my-calculator",
      arguments: { a: 1, b: 2 },
    });
    expect(result).toEqual({ content: [{ text: "3", type: "text" }] });
  });

  it("Explain missing tools tool explains why malicious-square-root was removed", async () => {
    const result = await client.callTool({
      name: "explain_missing_tools",
      arguments: { a: 1, b: 2 },
    });
    expect(result).toEqual({
      content: [
        { text: "policy veto: malicious-square-root (noExec)", type: "text" },
      ],
    });
  });
});
