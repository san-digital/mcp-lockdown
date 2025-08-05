// This should be a variation of lockdown-server.ts that injects the lockdown policies
// a more reaslistic example of a lockdown server

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { builtInPolicies, PolicyManager, LockdownServer, LockdownMCPServerJSON } from "../src";
import { readFileSync } from "fs";

const run = async () => {
  // custom client lockdown requirements
  const lockdownServerJsonPath = "./lockdown-mcp.json";
  const pm = new PolicyManager();
  pm.registerPolicies(builtInPolicies);


  const file = readFileSync(lockdownServerJsonPath, "utf8");
  const lockdownServerJson = JSON.parse(file) as LockdownMCPServerJSON;

  // create the proxy server
  const lockdownServer = await LockdownServer({
    policyManager: pm,
    lockdownServerJson,
  });

  // connect a transport - up to the user to use HTTP or stdio
  const transport = new StdioServerTransport();
  lockdownServer.connect(transport).catch(console.error);

  console.log("Lockdown MCP Server started");
};

run();
