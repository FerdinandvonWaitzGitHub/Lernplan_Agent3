import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
const createMessageResultSchema = z.object({
    model: z.string(),
    stopReason: z.string().optional(),
    role: z.literal('assistant'),
    content: z.object({
        type: z.literal('text'),
        text: z.string()
    })
});
export class McpPlanClient {
    options;
    client;
    transport;
    constructor(options) {
        this.options = options;
    }
    async ensureClient() {
        if (this.client) {
            return this.client;
        }
        if (!this.options.serverUrl) {
            throw new Error('MCP server URL is not configured');
        }
        const requestInit = this.options.apiToken
            ? {
                headers: {
                    Authorization: `Bearer ${this.options.apiToken}`
                }
            }
            : undefined;
        const transportOptions = requestInit ? { requestInit } : undefined;
        this.client = new Client({ name: 'lernplan-backend', version: '1.0.0' }, {
            capabilities: {
                sampling: {}
            }
        });
        const transport = new StreamableHTTPClientTransport(new URL(this.options.serverUrl), transportOptions);
        await this.client.connect(transport);
        this.transport = transport;
        return this.client;
    }
    async generatePlan(prompt) {
        const client = await this.ensureClient();
        const message = {
            role: 'user',
            content: {
                type: 'text',
                text: prompt
            }
        };
        const result = await client.request({
            method: 'sampling/createMessage',
            params: {
                messages: [message],
                maxTokens: this.options.maxTokens ?? 2000,
                modelPreferences: {
                    hints: [
                        {
                            name: this.options.modelHint
                        }
                    ]
                }
            }
        }, createMessageResultSchema);
        return result.content.text;
    }
    async dispose() {
        await this.client?.close();
        await this.transport?.close?.();
    }
}
//# sourceMappingURL=mcpPlanClient.js.map