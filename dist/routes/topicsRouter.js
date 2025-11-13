import { Router } from 'express';
import { jsonrepair } from 'jsonrepair';
import { TemplateRegistry } from '../services/templateRegistry.js';
import { planRequestSchema } from '../validation/planRequestSchema.js';
import { renderTopicSelectionPrompt } from '../prompt/renderTopicSelectionPrompt.js';
import { LlmJsonParseError, parseLlmJson } from '../utils/llmResponseParser.js';
const JSON_RESPONSE_SYSTEM_PROMPT = 'You are a careful assistant. Respond with a valid JSON object that contains two properties: ' +
    '"topics" (array of topic objects) and "reasoning" (string or null). Do not include prose, markdown or explanations. ' +
    'If you cannot comply, return {"topics": [], "reasoning": "error"} exactly.';
const asNonEmptyString = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
const sanitizeTopicSelection = (topic) => {
    if (!topic || typeof topic !== 'object') {
        return null;
    }
    const topicDescription = asNonEmptyString(topic.topic_description) ??
        asNonEmptyString(topic.topic) ??
        asNonEmptyString(topic.description);
    if (!topicDescription) {
        return null;
    }
    const legalArea = asNonEmptyString(topic.legal_area) ??
        asNonEmptyString(topic.area) ??
        'Unbekannt';
    const subArea = asNonEmptyString(topic.sub_area ?? topic.category);
    const selection = {
        legal_area: legalArea,
        topic_description: topicDescription
    };
    if (subArea) {
        selection.sub_area = subArea;
    }
    return selection;
};
const mapTemplateEntryToTopic = (entry) => {
    const topicDescription = asNonEmptyString(entry.topic_description);
    if (!topicDescription) {
        return null;
    }
    const selection = {
        legal_area: asNonEmptyString(entry.legal_area) ?? 'Unbekannt',
        topic_description: topicDescription
    };
    const subArea = asNonEmptyString(entry.sub_area);
    if (subArea) {
        selection.sub_area = subArea;
    }
    return selection;
};
const buildTemplateTopicPool = (registry) => registry
    .getAll()
    .flatMap(template => template.entries)
    .map(mapTemplateEntryToTopic)
    .filter((entry) => entry !== null);
const calculateTargetTopicCount = (payload) => {
    if (payload.dayCount <= 0) {
        return 0;
    }
    const totalTopicsNeeded = Object.values(payload.topicsPerWeekday).reduce((sum, count) => sum + count, 0);
    if (totalTopicsNeeded === 0) {
        return 0;
    }
    const activeDays = payload.weekdays.length || 1;
    const topicsPerDay = totalTopicsNeeded / activeDays;
    return Math.max(0, Math.round(topicsPerDay * payload.dayCount));
};
const normalizeTopics = (topics) => topics
    .map(topic => sanitizeTopicSelection(topic))
    .filter((topic) => topic !== null);
const enforceExactTopicCount = (topics, targetCount, registry) => {
    if (targetCount <= 0) {
        return { topics: [], adjustments: topics.length > 0 ? ['Die Zielanzahl beträgt 0 Themen.'] : [] };
    }
    const result = topics.slice(0, targetCount);
    const adjustments = [];
    if (topics.length > targetCount) {
        adjustments.push('Die LLM-Antwort enthielt zu viele Themen und wurde auf die Zielanzahl gekürzt.');
    }
    if (result.length < targetCount) {
        const pool = buildTemplateTopicPool(registry);
        if (pool.length === 0) {
            adjustments.push('Es standen keine zusätzlichen Themen zur Verfügung, um die Zielanzahl zu erreichen.');
            return { topics: result, adjustments };
        }
        let poolIndex = 0;
        while (result.length < targetCount) {
            const candidate = pool[poolIndex % pool.length];
            result.push(candidate);
            poolIndex++;
        }
        adjustments.push('Fehlende Themen wurden automatisch aus den Templates ergänzt.');
    }
    return { topics: result, adjustments };
};
export const createTopicsRouter = ({ templateRegistry, planGenerator }) => {
    const router = Router();
    const recoverTopicsArray = (payload) => {
        const keyIndex = payload.indexOf('"topics"');
        if (keyIndex === -1) {
            return null;
        }
        const startBracket = payload.indexOf('[', keyIndex);
        if (startBracket === -1) {
            return null;
        }
        let inString = false;
        let escaped = false;
        let depth = 0;
        for (let i = startBracket; i < payload.length; i++) {
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
            if (char === '[') {
                depth++;
            }
            else if (char === ']') {
                depth--;
                if (depth === 0) {
                    const snippet = payload.slice(startBracket, i + 1);
                    try {
                        const repaired = jsonrepair(snippet);
                        const parsed = JSON.parse(repaired);
                        return Array.isArray(parsed) ? parsed : null;
                    }
                    catch {
                        return null;
                    }
                }
            }
        }
        return null;
    };
    router.post('/select', async (req, res) => {
        console.log('[topics-router] Received topics selection request');
        const startTime = Date.now();
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
            console.log('[topics-router] Generating prompt for LLM...');
            const prompt = renderTopicSelectionPrompt(payload, templateRegistry.getAll());
            console.log('[topics-router] Calling OpenAI API...');
            const modelResponse = await planGenerator.generatePlan(prompt, {
                responseFormat: { type: 'json_object' },
                systemPrompt: JSON_RESPONSE_SYSTEM_PROMPT
            });
            const llmDuration = Date.now() - startTime;
            console.log(`[topics-router] LLM responded in ${llmDuration}ms`);
            let parsedTopicsPayload = [];
            let reasoning;
            const warnings = [];
            let rawSnippet;
            try {
                const parsed = parseLlmJson(modelResponse);
                parsedTopicsPayload = parsed.topics ?? [];
                reasoning = parsed.reasoning;
            }
            catch (error) {
                if (error instanceof LlmJsonParseError) {
                    console.error('[topics-router] JSON parsing failed!');
                    console.error('[topics-router] Sanitized response (first 500 chars):', error.sanitized.substring(0, 500));
                    console.error('[topics-router] Raw model response (first 500 chars):', error.raw.substring(0, 500));
                    const recoveredTopics = recoverTopicsArray(error.sanitized);
                    if (recoveredTopics) {
                        console.warn('[topics-router] Falling back to recovered topics array due to malformed JSON.');
                        warnings.push('Die Themenliste enthielt kein valides JSON. Es wurde ein repariertes Topics-Array zurückgegeben.');
                        parsedTopicsPayload = recoveredTopics;
                    }
                    else {
                        console.warn('[topics-router] Unable to recover topics array; continuing with empty payload.');
                        warnings.push('Das LLM hat kein valides JSON geliefert. Es wurden automatische Themen aus den Templates ergänzt.');
                        parsedTopicsPayload = [];
                        rawSnippet = error.sanitized.substring(0, 500);
                    }
                }
                else {
                    throw error;
                }
            }
            const normalizedTopics = normalizeTopics(parsedTopicsPayload);
            const targetTopicCount = calculateTargetTopicCount(payload);
            const { topics: enforcedTopics, adjustments } = enforceExactTopicCount(normalizedTopics, targetTopicCount, templateRegistry);
            warnings.push(...adjustments);
            console.log(`[topics-router] Prepared ${enforcedTopics.length} topics (target ${targetTopicCount}, original ${normalizedTopics.length})`);
            return res.json({
                topics: enforcedTopics,
                reasoning,
                targetTopicCount,
                warnings,
                warning: warnings[0],
                rawSnippet
            });
        }
        catch (error) {
            console.error('[topics-router] Error:', error);
            return res.status(502).json({
                message: 'Die Themen konnten nicht ausgewählt werden. Bitte passen Sie Ihre Eingaben an und versuchen Sie es erneut.'
            });
        }
    });
    return router;
};
//# sourceMappingURL=topicsRouter.js.map