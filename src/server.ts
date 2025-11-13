import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import type { RequestHandler } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
    OPENAI_API_KEY,
    OPENAI_API_URL,
    OPENAI_MAX_TOKENS,
    OPENAI_MODEL,
    PORT,
    TEMPLATE_DIRECTORY
} from './config.js';
import { TemplateRegistry } from './services/templateRegistry.js';
import { OpenAiPlanClient, type OpenAiPlanClientOptions } from './services/openAiPlanClient.js';
import { createPlanRouter } from './routes/planRouter.js';
import { createTopicsRouter } from './routes/topicsRouter.js';

const app = express();
const FRONTEND_BUILD_DIR = path.resolve(process.cwd(), 'frontend', 'dist');
const FRONTEND_ENTRY = path.join(FRONTEND_BUILD_DIR, 'index.html');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

let planGenerator: OpenAiPlanClient | null = null;

const bootstrap = async () => {
    console.log(`[server] Lade Templates aus: ${TEMPLATE_DIRECTORY}`);
    const templateRegistry = new TemplateRegistry(TEMPLATE_DIRECTORY);
    await templateRegistry.hydrate();
    const templateCount = templateRegistry.getSummaries().length;
    console.log(`[server] ${templateCount} Template-Sammlungen erfolgreich geladen.`);

    const planClientOptions: OpenAiPlanClientOptions = {
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

    if (existsSync(FRONTEND_ENTRY)) {
        console.log(`[server] Statisches Frontend gefunden: ${FRONTEND_ENTRY}`);
        app.use(express.static(FRONTEND_BUILD_DIR));
        const serveFrontend: RequestHandler = (req, res, next) => {
            if (req.path.startsWith('/api') || req.path === '/health') {
                return next();
            }
            console.log(`[server] Liefere Frontend für ${req.path || '/'}`);
            res.sendFile(FRONTEND_ENTRY);
        };
        app.get(/.*/, serveFrontend);
    }
    else {
        console.warn(
            '[server] Kein Frontend-Build gefunden. / liefert nur einen JSON-Hinweis. Bitte npm --prefix frontend run build ausführen.'
        );
        app.get('/', (_, res) => {
            res.json({
                status: 'ok',
                message: 'Lernplan-Agent Backend ist erreichbar. Verwenden Sie /health für einen leichten Status-Check.'
            });
        });
    }

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
