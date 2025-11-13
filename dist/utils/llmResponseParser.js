import { jsonrepair } from 'jsonrepair';
export class LlmJsonParseError extends Error {
    sanitized;
    raw;
    originalError;
    constructor(message, sanitized, raw, originalError) {
        super(message);
        this.name = 'LlmJsonParseError';
        this.sanitized = sanitized;
        this.raw = raw;
        this.originalError = originalError;
    }
}
const stripCodeFences = (response) => {
    const trimmed = response.trim();
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch?.[1]) {
        return fenceMatch[1].trim();
    }
    return trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
};
const extractJsonBlock = (response) => {
    const trimmed = response.trim();
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1).trim();
    }
    return trimmed;
};
const extractBalancedSection = (payload, startIndex) => {
    if (payload[startIndex] !== '{') {
        return null;
    }
    let inString = false;
    let escaped = false;
    let depth = 0;
    for (let i = startIndex; i < payload.length; i++) {
        const char = payload[i];
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
const tryParseObjectContainingKey = (payload, key, onError) => {
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
                    return JSON.parse(snippet);
                }
                catch (error) {
                    onError(error);
                }
                try {
                    const repaired = jsonrepair(snippet);
                    return JSON.parse(repaired);
                }
                catch (error) {
                    onError(error);
                }
                break;
            }
        }
        fromIndex = keyIndex + searchKey.length;
    }
    return null;
};
export const parseLlmJson = (rawResponse) => {
    const stripped = stripCodeFences(rawResponse);
    const candidate = extractJsonBlock(stripped);
    let lastError = null;
    try {
        return JSON.parse(candidate);
    }
    catch (error) {
        lastError = error;
    }
    try {
        const repaired = jsonrepair(candidate);
        return JSON.parse(repaired);
    }
    catch (error) {
        lastError = error;
    }
    const extracted = tryParseObjectContainingKey(candidate, 'topics', error => {
        lastError = error;
    });
    if (extracted) {
        return extracted;
    }
    throw new LlmJsonParseError('Failed to parse LLM JSON response', candidate, rawResponse, lastError);
};
//# sourceMappingURL=llmResponseParser.js.map