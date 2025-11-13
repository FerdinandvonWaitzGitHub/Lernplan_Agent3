import http from 'node:http';
import https from 'node:https';
const COMPLETION_TOKEN_LIMIT = 16000;
const sendHttpRequest = (url, body, headers) => {
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const options = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port ? Number(url.port) : isHttps ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        headers: {
            ...headers,
            'Content-Length': Buffer.byteLength(body).toString()
        }
    };
    return new Promise((resolve, reject) => {
        const request = client.request(options, response => {
            const chunks = [];
            response.on('data', chunk => {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            });
            response.on('end', () => {
                const payload = Buffer.concat(chunks).toString('utf-8');
                const statusCode = response.statusCode ?? 500;
                if (statusCode >= 200 && statusCode < 300) {
                    resolve(payload);
                }
                else {
                    reject(new Error(`OpenAI API Fehler (${statusCode}): ${payload}`));
                }
            });
        });
        request.on('error', reject);
        request.write(body);
        request.end();
    });
};
export class OpenAiPlanClient {
    options;
    constructor(options) {
        this.options = options;
        if (!options.apiKey) {
            throw new Error('OPENAI_API_KEY ist nicht gesetzt.');
        }
        if (!options.apiUrl) {
            throw new Error('OPENAI_API_URL ist nicht gesetzt.');
        }
        if (!options.model) {
            throw new Error('OPENAI_MODEL ist nicht gesetzt.');
        }
    }
    async generatePlan(prompt, overrides) {
        const systemPrompt = overrides?.systemPrompt ?? this.options.systemPrompt;
        const messages = [];
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        messages.push({
            role: 'user',
            content: prompt
        });
        const maxTokens = this.options.maxTokens && this.options.maxTokens > 0
            ? Math.min(this.options.maxTokens, COMPLETION_TOKEN_LIMIT)
            : Math.min(1800, COMPLETION_TOKEN_LIMIT);
        const payload = JSON.stringify({
            model: this.options.model,
            messages,
            max_tokens: maxTokens,
            temperature: this.options.temperature ?? 0.2,
            response_format: overrides?.responseFormat ?? this.options.responseFormat
        });
        const url = new URL(this.options.apiUrl);
        const responseText = await sendHttpRequest(url, payload, {
            Authorization: `Bearer ${this.options.apiKey}`,
            'Content-Type': 'application/json'
        });
        const parsed = JSON.parse(responseText);
        const content = parsed.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error('OpenAI API lieferte keine Antwort.');
        }
        return content;
    }
}
//# sourceMappingURL=openAiPlanClient.js.map