export interface McpPlanClientOptions {
    serverUrl: string;
    modelHint: string;
    apiToken?: string;
    maxTokens?: number;
}
export declare class McpPlanClient {
    private readonly options;
    private client?;
    private transport?;
    constructor(options: McpPlanClientOptions);
    private ensureClient;
    generatePlan(prompt: string): Promise<string>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=mcpPlanClient.d.ts.map