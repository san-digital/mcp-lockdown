import { Command } from "commander";
import fs from "fs/promises";
import path from "path";

// Mock the modules
jest.mock("commander");
jest.mock("fs/promises");
jest.mock("../src/manifest");
jest.mock("../src/policy");
jest.mock("../src/types");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedCommand = Command as jest.MockedClass<typeof Command>;

describe.skip("CLI", () => {
    let mockCommand: jest.Mocked<Command>;
    let mockAction: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockAction = jest.fn();
        mockCommand = {
            command: jest.fn().mockReturnThis(),
            description: jest.fn().mockReturnThis(),
            option: jest.fn().mockReturnThis(),
            action: jest.fn().mockImplementation((fn) => {
                mockAction = fn;
                return mockCommand;
            }),
            parse: jest.fn().mockReturnThis()
        } as unknown as jest.Mocked<Command>;

        mockedCommand.mockImplementation(() => mockCommand);
    });

    describe("audit command", () => {
        it("should register audit command with correct options", () => {
            require("../src/cli");

            expect(mockCommand.command).toHaveBeenCalledWith("audit <manifestPath>");
            expect(mockCommand.description).toHaveBeenCalledWith("verify manifest signature, hashes, schemas, and policies");
            expect(mockCommand.option).toHaveBeenCalledWith("-r, --registry <path>", "path to tool registry JSON file", "./tool-registry.json");
        });

        it("should successfully validate a manifest", async () => {
            const mockManifest = {
                tools: [{ name: "test-tool", description: "test", schema: {}, handlerHash: "hash", publicKey: "key" }],
                signature: "sig"
            };
            const mockRegistry = { tools: [{ name: "test-tool", handlerHash: "hash", publicKey: "key", schema: {} }] };

            // Mock the imported functions
            const { loadManifest, validateManifest } = require("../src/manifest");
            const { PolicyManager, builtInPolicies } = require("../src/policy");

            loadManifest.mockResolvedValue(mockManifest);
            validateManifest.mockResolvedValue(undefined);
            mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));

            // Mock console methods
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            const processSpy = jest.spyOn(process, "exit").mockImplementation();

            require("../src/cli");

            // Simulate the audit command action
            await mockAction("test-manifest.json", { registry: "test-registry.json" });

            expect(loadManifest).toHaveBeenCalledWith(expect.stringContaining("test-manifest.json"));
            expect(validateManifest).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith("✅ manifest passed all checks");
            expect(processSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
            processSpy.mockRestore();
        });

        it("should handle validation errors", async () => {
            const mockRegistry = { tools: [] };
            const validationError = new Error("Validation failed");

            const { loadManifest, validateManifest } = require("../src/manifest");
            const { PolicyManager, builtInPolicies } = require("../src/policy");

            loadManifest.mockResolvedValue({});
            validateManifest.mockRejectedValue(validationError);
            mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));

            const consoleSpy = jest.spyOn(console, "error").mockImplementation();
            const processSpy = jest.spyOn(process, "exit").mockImplementation();

            require("../src/cli");

            await mockAction("test-manifest.json", { registry: "test-registry.json" });

            expect(consoleSpy).toHaveBeenCalledWith("❌ validation error: Validation failed");
            expect(processSpy).toHaveBeenCalledWith(1);

            consoleSpy.mockRestore();
            processSpy.mockRestore();
        });

        it("should handle file reading errors", async () => {
            const fileError = new Error("File not found");

            mockedFs.readFile.mockRejectedValue(fileError);

            const consoleSpy = jest.spyOn(console, "error").mockImplementation();
            const processSpy = jest.spyOn(process, "exit").mockImplementation();

            require("../src/cli");

            await mockAction("test-manifest.json", { registry: "nonexistent-registry.json" });

            expect(consoleSpy).toHaveBeenCalledWith("❌ validation error: File not found");
            expect(processSpy).toHaveBeenCalledWith(1);

            consoleSpy.mockRestore();
            processSpy.mockRestore();
        });

        it("should use default registry path when not specified", async () => {
            const mockManifest = { tools: [], signature: "" };
            const mockRegistry = { tools: [] };

            const { loadManifest, validateManifest } = require("../src/manifest");
            const { PolicyManager, builtInPolicies } = require("../src/policy");

            loadManifest.mockResolvedValue(mockManifest);
            validateManifest.mockResolvedValue(undefined);
            mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));

            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            require("../src/cli");

            await mockAction("test-manifest.json", {});

            expect(mockedFs.readFile).toHaveBeenCalledWith(expect.stringContaining("tool-registry.json"), "utf-8");
            expect(consoleSpy).toHaveBeenCalledWith("✅ manifest passed all checks");

            consoleSpy.mockRestore();
        });

        it("should resolve relative paths correctly", async () => {
            const mockManifest = { tools: [], signature: "" };
            const mockRegistry = { tools: [] };

            const { loadManifest, validateManifest } = require("../src/manifest");
            const { PolicyManager, builtInPolicies } = require("../src/policy");

            loadManifest.mockResolvedValue(mockManifest);
            validateManifest.mockResolvedValue(undefined);
            mockedFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));

            const pathSpy = jest.spyOn(path, "resolve").mockReturnValue("/absolute/path");

            require("../src/cli");

            await mockAction("relative-manifest.json", { registry: "relative-registry.json" });

            expect(pathSpy).toHaveBeenCalledWith(process.cwd(), "relative-manifest.json");
            expect(pathSpy).toHaveBeenCalledWith(process.cwd(), "relative-registry.json");

            pathSpy.mockRestore();
        });
    });

    describe("policies command", () => {
        it("should register policies command", () => {
            require("../src/cli");

            expect(mockCommand.command).toHaveBeenCalledWith("policies");
            expect(mockCommand.description).toHaveBeenCalledWith("list registered policies and shields");
        });

        it("should list registered policies", () => {
            const mockPolicyList = ["noFilesystem", "noExec", "noEval"];
            const { PolicyManager, builtInPolicies } = require("../src/policy");

            PolicyManager.mockImplementation(() => ({
                registerPolicies: jest.fn(),
                list: jest.fn().mockReturnValue(mockPolicyList)
            }));

            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            require("../src/cli");

            // Find the policies command action
            const policiesAction = mockCommand.action.mock.calls[1]?.[0];
            if (policiesAction) {
                policiesAction();
            }

            expect(consoleSpy).toHaveBeenCalledWith(mockPolicyList.join("\n"));

            consoleSpy.mockRestore();
        });
    });

    describe("command parsing", () => {
        it("should parse command line arguments", () => {
            require("../src/cli");

            expect(mockCommand.parse).toHaveBeenCalledWith(process.argv);
        });
    });
}); 