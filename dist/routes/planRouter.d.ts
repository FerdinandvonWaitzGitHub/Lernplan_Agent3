import { Router } from 'express';
import { TemplateRegistry } from '../services/templateRegistry.js';
import type { OpenAiPlanClient } from '../services/openAiPlanClient.js';
interface PlanRouterDependencies {
    templateRegistry: TemplateRegistry;
    planGenerator: Pick<OpenAiPlanClient, 'generatePlan'>;
}
export declare const createPlanRouter: ({ templateRegistry, planGenerator }: PlanRouterDependencies) => Router;
export {};
//# sourceMappingURL=planRouter.d.ts.map