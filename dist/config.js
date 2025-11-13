import path from 'path';
import { existsSync } from 'fs';
const DEFAULT_WINDOWS_TEMPLATE_DIR = 'C:\\\\Users\\\\fvwai\\\\lernplan_agent\\\\data\\\\templates';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const normalizeTemplateDir = (input) => {
    const resolved = path.resolve(input);
    if (existsSync(resolved) || process.platform === 'win32') {
        return resolved;
    }
    if (/^[A-Za-z]:\\/.test(input)) {
        const drive = input[0].toLowerCase();
        const rest = input.slice(2).replace(/\\/g, '/');
        return path.posix.normalize(`/mnt/${drive}${rest.startsWith('/') ? rest : `/${rest}`}`);
    }
    return resolved;
};
export const TEMPLATE_DIRECTORY = normalizeTemplateDir(process.env.TEMPLATE_DIR ?? DEFAULT_WINDOWS_TEMPLATE_DIR);
export const PORT = parseInt(process.env.PORT ?? '4000', 10);
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? process.env.MCP_API_TOKEN ?? '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? process.env.MCP_MODEL ?? DEFAULT_OPENAI_MODEL;
export const OPENAI_API_URL = process.env.OPENAI_API_URL ?? process.env.MCP_SERVER_URL ?? DEFAULT_OPENAI_API_URL;
export const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS ?? process.env.MCP_MAX_TOKENS ?? '1800', 10);
//# sourceMappingURL=config.js.map