export declare class LlmJsonParseError extends Error {
    readonly sanitized: string;
    readonly raw: string;
    readonly originalError: unknown;
    constructor(message: string, sanitized: string, raw: string, originalError: unknown);
}
export declare const parseLlmJson: <T>(rawResponse: string) => T;
//# sourceMappingURL=llmResponseParser.d.ts.map