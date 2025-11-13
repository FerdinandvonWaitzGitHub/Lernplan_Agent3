import { jsonrepair } from 'jsonrepair';

export class LlmJsonParseError extends Error {
    public readonly sanitized: string;
    public readonly raw: string;
    public readonly originalError: unknown;

    constructor(message: string, sanitized: string, raw: string, originalError: unknown) {
        super(message);
        this.name = 'LlmJsonParseError';
        this.sanitized = sanitized;
        this.raw = raw;
        this.originalError = originalError;
    }
}

const stripCodeFences = (response: string): string => {
    const trimmed = response.trim();
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

    if (fenceMatch?.[1]) {
        return fenceMatch[1].trim();
    }

    return trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
};

const extractJsonBlock = (response: string): string => {
    const trimmed = response.trim();
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1).trim();
    }

    return trimmed;
};

const extractBalancedSection = (payload: string, startIndex: number): string | null => {
    if (payload[startIndex] !== '{') {
        return null;
    }

    let inString = false;
    let escaped = false;
    let depth = 0;

    for (let i = startIndex; i < payload.length; i++) {
        const char = payload[i]!;

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{') {
            depth++;
        }
        else if (char === '}') {
            depth--;

            if (depth === 0) {
                return payload.slice(startIndex, i + 1);
            }
        }
    }

    return null;
};

const tryParseObjectContainingKey = <T>(
    payload: string,
    key: string,
    onError: (error: unknown) => void
): T | null => {
    const searchKey = `"${key}"`;
    let fromIndex = 0;

    while (fromIndex < payload.length) {
        const keyIndex = payload.indexOf(searchKey, fromIndex);
        if (keyIndex === -1) {
            break;
        }

        for (let i = keyIndex; i >= 0; i--) {
            if (payload[i] === '{') {
                const snippet = extractBalancedSection(payload, i);
                if (!snippet) {
                    break;
                }

                try {
                    return JSON.parse(snippet) as T;
                } catch (error) {
                    onError(error);
                }

                try {
                    const repaired = jsonrepair(snippet);
                    return JSON.parse(repaired) as T;
                } catch (error) {
                    onError(error);
                }

                break;
            }
        }

        fromIndex = keyIndex + searchKey.length;
    }

    return null;
};

export const parseLlmJson = <T>(rawResponse: string): T => {
    const stripped = stripCodeFences(rawResponse);
    const candidate = extractJsonBlock(stripped);
    let lastError: unknown = null;

    try {
        return JSON.parse(candidate) as T;
    } catch (error) {
        lastError = error;
    }

    try {
        const repaired = jsonrepair(candidate);
        return JSON.parse(repaired) as T;
    } catch (error) {
        lastError = error;
    }

    const extracted = tryParseObjectContainingKey<T>(candidate, 'topics', error => {
        lastError = error;
    });
    if (extracted) {
        return extracted;
    }

    throw new LlmJsonParseError('Failed to parse LLM JSON response', candidate, rawResponse, lastError);
};
