import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { OPENAI_API_KEY, OPENAI_API_URL, OPENAI_MAX_TOKENS, OPENAI_MODEL, PORT, TEMPLATE_DIRECTORY } from './config.js';
import { TemplateRegistry } from './services/templateRegistry.js';
import { OpenAiPlanClient } from './services/openAiPlanClient.js';
import { createPlanRouter } from './routes/planRouter.js';
import { createTopicsRouter } from './routes/topicsRouter.js';
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
let planGenerator = null;
const bootstrap = async () => {
    const templateRegistry = new TemplateRegistry(TEMPLATE_DIRECTORY);
    await templateRegistry.hydrate();
    const planClientOptions = {
        apiUrl: OPENAI_API_URL,
        model: OPENAI_MODEL,
        maxTokens: OPENAI_MAX_TOKENS,
        apiKey: OPENAI_API_KEY
    };
    planGenerator = new OpenAiPlanClient(planClientOptions);
    app.get('/health', (_, res) => {
        res.json({ status: 'ok' });
    });
    app.use('/api/plan', createPlanRouter({ templateRegistry, planGenerator }));
    app.use('/api/topics', createTopicsRouter({ templateRegistry, planGenerator }));
    app.listen(PORT, () => {
        console.log(`Lernplan backend läuft auf http://localhost:${PORT}`);
    });
};
bootstrap().catch(error => {
    console.error('Server konnte nicht gestartet werden:', error);
    process.exit(1);
});
process.on('SIGINT', () => {
    process.exit(0);
});
//# sourceMappingURL=server.js.map