export type ResponseFormat = {
    type: 'json_object';
} | {
    type: 'json_schema';
    json_schema: Record<string, unknown>;
};
export interface OpenAiPlanClientOptions {
    apiKey: string;
    apiUrl: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: ResponseFormat;
    systemPrompt?: string;
}
export interface GeneratePlanOverrides {
    responseFormat?: ResponseFormat;
    systemPrompt?: string;
}
export declare class OpenAiPlanClient {
    private readonly options;
    constructor(options: OpenAiPlanClientOptions);
    generatePlan(prompt: string, overrides?: GeneratePlanOverrides): Promise<string>;
}
//# sourceMappingURL=openAiPlanClient.d.ts.map