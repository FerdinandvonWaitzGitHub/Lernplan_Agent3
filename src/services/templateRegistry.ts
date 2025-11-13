import { promises as fs } from 'fs';
import path from 'path';
import { EMBEDDED_TEMPLATE_FILES } from '../templates/embeddedTemplates.js';
import { normalizeLegalArea, normalizeSubArea } from '../lib/legalTaxonomy.js';

export interface TemplateEntry {
    legal_area?: string;
    sub_area?: string;
    topic_description?: string;
    path?: string[];
    [key: string]: unknown;
}

export interface TemplateList {
    id: string;
    fileName: string;
    absolutePath: string;
    description?: string;
    entries: TemplateEntry[];
    raw: unknown;
}

export interface TemplateSummary {
    id: string;
    fileName: string;
    description?: string;
    entryCount: number;
    preview: TemplateEntry[];
}

const stringKeysByPriority = ['title', 'name', 'label', 'heading', 'code'] as const;
const topicDescriptionKeys = [
    'topic_description',
    'topic',
    'title',
    'name',
    'label',
    'heading',
    'description',
    'Beschreibung'
] as const;
const legalAreaKeys = [
    'legal_area',
    'legalArea',
    'area',
    'subject',
    'domain',
    'code',
    'tag',
    'section',
    'Rechtsgebiet'
] as const;
const subAreaKeys = ['sub_area', 'subArea', 'category', 'unit', 'chapter', 'module', 'Unterrechtsgebiet'] as const;

const isTemplateStructureNode = (record: Record<string, unknown>): boolean => {
    const children = (record as { children?: unknown }).children;
    if (Array.isArray(children)) {
        return true;
    }

    const items = (record as { items?: unknown }).items;
    if (
        Array.isArray(items) &&
        items.every(item => typeof item === 'string') &&
        typeof (record as { title?: unknown }).title === 'string' &&
        typeof (record as { code?: unknown }).code === 'string'
    ) {
        return true;
    }

    return false;
};

const asNonEmptyString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const buildEntryFromPath = (path: string[], description: string): TemplateEntry => {
    const entry: TemplateEntry = {
        topic_description: description
    };

    if (path[0]) {
        entry.legal_area = path[0];
    }

    const remaining = path.slice(1).filter(Boolean);
    if (remaining.length > 0) {
        entry.sub_area = remaining.join(' > ');
    }

    if (path.length > 0) {
        entry.path = [...path];
    }

    const normalizedLegalArea = normalizeLegalArea(entry.legal_area);
    if (normalizedLegalArea) {
        entry.legal_area = normalizedLegalArea;
    }
    const normalizedSubArea = normalizeSubArea(entry.sub_area);
    if (normalizedSubArea) {
        entry.sub_area = normalizedSubArea;
    }

    return entry;
};

const splitTitle = (title: string): { legalArea?: string; topicDescription: string; subArea?: string } => {
    const parts = title
        .split(/\r?\n+/)
        .map(chunk => chunk.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return { topicDescription: title.trim() };
    }

    const [first, ...rest] = parts as [string, ...string[]];
    if (rest.length === 0) {
        return { topicDescription: first };
    }

    const restJoined = rest.join(' / ');
    return {
        legalArea: first,
        topicDescription: restJoined,
        subArea: rest[0]!
    };
};

const toTemplateEntry = (value: unknown, path: string[] = []): TemplateEntry | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const record = value as Record<string, unknown>;

    if (isTemplateStructureNode(record)) {
        return null;
    }
    let topic: string | undefined;
    let derivedLegalArea: string | undefined;
    let derivedSubArea: string | undefined;

    for (const key of topicDescriptionKeys) {
        const candidate = asNonEmptyString(record[key]);
        if (candidate) {
            if (key === 'title') {
                const fromTitle = splitTitle(candidate);
                topic = fromTitle.topicDescription;
                derivedLegalArea = fromTitle.legalArea;
                derivedSubArea = fromTitle.subArea;
            }
            else {
                topic = candidate;
            }
            break;
        }
    }

    if (!topic) {
        return null;
    }

    const entry: TemplateEntry = {
        topic_description: topic
    };

    const pickFromKeys = (keys: readonly string[]): string | undefined => {
        for (const key of keys) {
            const candidate = asNonEmptyString(record[key]);
            if (candidate) {
                return candidate;
            }
        }
        return undefined;
    };

    const legalArea = pickFromKeys(legalAreaKeys) ?? derivedLegalArea;
    if (legalArea) {
        entry.legal_area = legalArea;
    }

    const subArea = pickFromKeys(subAreaKeys) ?? derivedSubArea;
    if (subArea) {
        entry.sub_area = subArea;
    }

    if (Array.isArray(record.path)) {
        const pathArray = record.path as unknown[];
        entry.path = pathArray.filter(item => typeof item === 'string') as string[];
    }

    if (!entry.legal_area && path[0]) {
        entry.legal_area = path[0];
    }

    if (!entry.sub_area && path.length > 1) {
        entry.sub_area = path.slice(1).join(' > ');
    }

    if (!entry.path && path.length > 0) {
        entry.path = [...path];
    }

    const normalizedLegalArea = normalizeLegalArea(entry.legal_area);
    if (normalizedLegalArea) {
        entry.legal_area = normalizedLegalArea;
    }
    const normalizedSubArea = normalizeSubArea(entry.sub_area);
    if (normalizedSubArea) {
        entry.sub_area = normalizedSubArea;
    }

    return entry;
};

const tryParseDirectEntries = (payload: unknown, path: string[] = []): TemplateEntry[] | null => {
    if (!Array.isArray(payload)) {
        return null;
    }

    const converted = payload
        .map(value => toTemplateEntry(value, path))
        .filter((entry): entry is TemplateEntry => entry !== null);
    if (converted.length === payload.length && converted.length > 0) {
        return converted;
    }

    return null;
};

const extractLabel = (value: Record<string, unknown>): string | undefined => {
    for (const key of stringKeysByPriority) {
        const candidate = asNonEmptyString(value[key]);
        if (candidate) {
            return candidate;
        }
    }
    return undefined;
};

const flattenStructuredEntries = (payload: unknown): TemplateEntry[] => {
    const results: TemplateEntry[] = [];
    const visited = new Set<unknown>();

    const visit = (node: unknown, path: string[]): void => {
        if (node === null || node === undefined) {
            return;
        }

        if (typeof node === 'string') {
            const description = node.trim();
            if (description) {
                results.push(buildEntryFromPath(path, description));
            }
            return;
        }

        if (visited.has(node)) {
            return;
        }

        if (Array.isArray(node)) {
            visited.add(node);

            const directEntries = tryParseDirectEntries(node, path);
            if (directEntries) {
                results.push(...directEntries);
                return;
            }

            node.forEach(child => visit(child, path));
            return;
        }

        if (typeof node !== 'object') {
            return;
        }

        visited.add(node);

        const directEntry = toTemplateEntry(node, path);
        if (directEntry) {
            results.push(directEntry);
            return;
        }

        const record = node as Record<string, unknown>;
        const nextPathLabel = extractLabel(record);
        const nextPath = nextPathLabel ? [...path, nextPathLabel] : path;

        const itemKeys = ['items', 'topics', 'points', 'content', 'lessons', 'materials'] as const;
        for (const key of itemKeys) {
            const list = record[key];
            if (Array.isArray(list)) {
                list.forEach(item => visit(item, nextPath));
            }
        }

        const containerKeys = [
            'children',
            'subjects',
            'entries',
            'sections',
            'parts',
            'sessions',
            'nodes',
            'chapters',
            'units',
            'lessons',
            'schedule'
        ] as const;
        for (const key of containerKeys) {
            const child = record[key];
            if (child !== undefined) {
                visit(child, nextPath);
            }
        }
    };

    visit(payload, []);
    return results;
};

const parseEntries = (payload: unknown): TemplateEntry[] => {
    if (!payload) {
        return [];
    }

    const directArrayEntries = tryParseDirectEntries(payload);
    if (directArrayEntries) {
        return directArrayEntries;
    }

    if (typeof payload === 'object' && payload !== null && 'entries' in payload) {
        const nestedEntries = tryParseDirectEntries((payload as { entries?: unknown }).entries);
        if (nestedEntries) {
            return nestedEntries;
        }
    }

    return flattenStructuredEntries(payload);
};

export class TemplateRegistry {
    private readonly templates = new Map<string, TemplateList>();

    constructor(private readonly templateDir: string) {}

    async hydrate(): Promise<void> {
        this.templates.clear();
        const loadedFromDisk = await this.tryHydrateFromDisk();

        if (!loadedFromDisk) {
            console.warn('[template-registry] Using embedded templates because the template directory was not readable.');
            this.useEmbeddedTemplates();
        }

        if (this.isEmpty()) {
            throw new Error('Keine Templates konnten geladen werden (weder eingebettet noch vom Dateisystem).');
        }
    }

    private async tryHydrateFromDisk(): Promise<boolean> {
        try {
            const files = await fs.readdir(this.templateDir, { withFileTypes: true });

            await Promise.all(
                files
                    .filter(file => file.isFile() && file.name.endsWith('.json'))
                    .map(async file => {
                        try {
                            const absolutePath = path.resolve(this.templateDir, file.name);
                            const content = await fs.readFile(absolutePath, 'utf-8');
                            const parsed = JSON.parse(content) as Record<string, unknown>;
                            const id = path.basename(file.name, '.json');

                            this.templates.set(
                                id,
                                this.buildTemplateList({
                                    id,
                                    fileName: file.name,
                                    absolutePath,
                                    raw: parsed
                                })
                            );
                        } catch (error) {
                            console.warn(`[template-registry] Failed to load template file ${file.name}:`, error);
                        }
                    })
            );

            return !this.isEmpty();
        } catch (error) {
            console.warn(`[template-registry] Failed to read template directory "${this.templateDir}":`, error);
            return false;
        }
    }

    private useEmbeddedTemplates(): void {
        for (const file of EMBEDDED_TEMPLATE_FILES) {
            const template = this.buildTemplateList({
                id: file.id,
                fileName: file.fileName,
                absolutePath: `embedded://${file.fileName}`,
                raw: file.raw
            });
            this.templates.set(template.id, template);
        }
    }

    private buildTemplateList({
        id,
        fileName,
        absolutePath,
        raw
    }: {
        id: string;
        fileName: string;
        absolutePath: string;
        raw: unknown;
    }): TemplateList {
        const entries = parseEntries(raw);

        const template: TemplateList = {
            id,
            fileName,
            absolutePath,
            entries,
            raw
        };

        if (typeof (raw as { description?: unknown })?.description === 'string') {
            template.description = (raw as { description: string }).description;
        }

        return template;
    }

    isEmpty(): boolean {
        return this.templates.size === 0;
    }

    getAll(): TemplateList[] {
        return Array.from(this.templates.values());
    }

    getById(id: string): TemplateList | undefined {
        return this.templates.get(id);
    }

    getSummaries(previewSize = 3): TemplateSummary[] {
        return this.getAll().map(template => {
            const summary: TemplateSummary = {
                id: template.id,
                fileName: template.fileName,
                entryCount: template.entries.length,
                preview: template.entries.slice(0, previewSize)
            };

            if (template.description) {
                summary.description = template.description;
            }

            return summary;
        });
    }
}
