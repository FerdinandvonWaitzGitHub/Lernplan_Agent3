import { Router } from 'express';
import { TemplateRegistry } from '../services/templateRegistry.js';
import { planRequestSchema } from '../validation/planRequestSchema.js';
import { renderPlanPrompt } from '../prompt/renderPlanPrompt.js';
export const createPlanRouter = ({ templateRegistry, planGenerator }) => {
    const router = Router();
    router.post('/', async (req, res) => {
        const parseResult = planRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                message: 'Ungültige Eingaben. Bitte prüfen Sie Ihre Angaben.',
                issues: parseResult.error.flatten()
            });
        }
        if (templateRegistry.isEmpty()) {
            return res.status(500).json({
                message: 'Es konnten keine Themen-Templates geladen werden. Bitte wenden Sie sich an den Support.'
            });
        }
        try {
            const payload = parseResult.data;
            const prompt = renderPlanPrompt(payload, templateRegistry.getSummaries());
            const modelResponse = await planGenerator.generatePlan(prompt);
            return res.json({
                prompt,
                raw: modelResponse
            });
        }
        catch (error) {
            console.error('[plan-router]', error);
            return res.status(502).json({
                message: 'Der Plan konnte nicht generiert werden. Bitte passen Sie Ihre Eingaben an und versuchen Sie es erneut.'
            });
        }
    });
    return router;
};
//# sourceMappingURL=planRouter.js.map