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
                    const error = new Error(`OpenAI API Fehler (${statusCode})`);
                    error.statusCode = statusCode;
                    error.responseBody = payload;
                    reject(error);
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
        console.log(`[openai-client] API-Key erkannt (Länge: ${this.options.apiKey.length}).`);
        try {
            const apiHost = new URL(this.options.apiUrl).host;
            console.log(`[openai-client] Verwende Modell "${this.options.model}" gegen Endpoint ${apiHost}.`);
        }
        catch {
            console.warn('[openai-client] OPENAI_API_URL konnte nicht geparst werden.');
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
        let responseText;
        try {
            responseText = await sendHttpRequest(url, payload, {
                Authorization: `Bearer ${this.options.apiKey}`,
                'Content-Type': 'application/json'
            });
        }
        catch (error) {
            const statusCode = error.statusCode;
            const responseBody = error.responseBody;
            if (statusCode) {
                console.error(`[openai-client] Request fehlgeschlagen (Status ${statusCode}).`, responseBody ? `Antwort: ${responseBody.slice(0, 200)}...` : '');
                if (statusCode === 401) {
                    console.error('[openai-client] Upstream meldet 401 Unauthorized. Bitte überprüfen Sie OPENAI_API_KEY im Deployment.');
                }
            }
            else {
                console.error('[openai-client] Request konnte nicht abgesetzt werden:', error);
            }
            throw error;
        }
        const parsed = JSON.parse(responseText);
        const content = parsed.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error('OpenAI API lieferte keine Antwort.');
        }
        return content;
    }
}
//# sourceMappingURL=openAiPlanClient.js.map