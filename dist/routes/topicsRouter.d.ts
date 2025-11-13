import { Router } from 'express';
import { TemplateRegistry } from '../services/templateRegistry.js';
import type { OpenAiPlanClient } from '../services/openAiPlanClient.js';
interface TopicsRouterDependencies {
    templateRegistry: TemplateRegistry;
    planGenerator: Pick<OpenAiPlanClient, 'generatePlan'>;
}
export declare const createTopicsRouter: ({ templateRegistry, planGenerator }: TopicsRouterDependencies) => Router;
export {};
//# sourceMappingURL=topicsRouter.d.ts.map