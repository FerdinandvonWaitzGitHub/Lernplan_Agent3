import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeLegalArea, normalizeSubArea } from '../src/lib/legalTaxonomy.js';

type NormalizedEntry = {
    area: string;
    module: string;
    text: string;
};

type TemplateConverter = (raw: unknown) => NormalizedEntry[];

type SimpleTemplateEntry = {
    Rechtsgebiet: string;
    Unterrechtsgebiet: string;
    Beschreibung: string | string[];
};

interface ModuleMeta {
    code: string;
    order: number;
}

interface AreaMeta {
    code: string;
    order: number;
    nextModuleOrder: number;
    moduleMeta: Map<string, ModuleMeta>;
}

type TemplateArea = {
    code: string;
    title: string;
    children: TemplateModule[];
};

type TemplateModule = {
    code: string;
    title: string;
    units: number;
    items: string[];
};

const isTemplateModule = (value: unknown): value is TemplateModule => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    return (
        typeof record.code === 'string' &&
        typeof record.title === 'string' &&
        typeof record.units === 'number' &&
        Array.isArray(record.items) &&
        record.items.every(item => typeof item === 'string')
    );
};

const isTemplateArea = (value: unknown): value is TemplateArea => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    return (
        typeof record.code === 'string' &&
        typeof record.title === 'string' &&
        Array.isArray(record.children) &&
        record.children.every(isTemplateModule)
    );
};

const isTemplateAreaArray = (value: unknown): value is TemplateArea[] =>
    Array.isArray(value) && value.every(isTemplateArea);

const TEMPLATE_FILES: { fileName: string; convert: TemplateConverter }[] = [
    { fileName: 'lerninhalte2.json', convert: convertLerninhalte2 },
    { fileName: 'lerninhalte3.json', convert: convertLerninhalte3 },
    { fileName: 'lerninhalte4.json', convert: convertLerninhalte4 },
    { fileName: 'lerninhalte5.json', convert: convertLerninhalte5 },
    { fileName: 'lerninhalte6.json', convert: convertLerninhalte6 }
];

const TARGET_DIRS = ['data/templates', 'src/templates'];

const MODULE_AREAS = new Map<string, string>([
    ['BGB AT', 'Zivilrecht'],
    ['Schuldrecht AT', 'Zivilrecht'],
    ['Schuldrecht BT 1 Nichtvermögensdelikte', 'Zivilrecht'],
    ['Schuldrecht BT 2 Vermögensdelikte', 'Zivilrecht'],
    ['Sachenrecht 1 Bewegliche Sachen', 'Zivilrecht'],
    ['Sachenrecht 2 EBV', 'Zivilrecht'],
    ['Sachenrecht 3 Immobiliarsachenrecht', 'Zivilrecht'],
    ['Familienrecht', 'Zivilrechtliche Nebengebiete'],
    ['Familien- und Erbrecht', 'Zivilrechtliche Nebengebiete'],
    ['Erbrecht', 'Zivilrechtliche Nebengebiete'],
    ['Handels- und Gesellschaftsrecht', 'Zivilrechtliche Nebengebiete'],
    ['Arbeitsrecht', 'Zivilrechtliche Nebengebiete'],
    ['ZPO', 'Zivilrechtliche Nebengebiete'],
    ['IPR', 'Zivilrechtliche Nebengebiete'],
    ['Strafrecht AT', 'Strafrecht'],
    ['Strafrecht BT 1 Nichtvermögensdelikte', 'Strafrecht'],
    ['Strafrecht BT 2 Vermögensdelikte', 'Strafrecht'],
    ['StPO', 'Strafrecht'],
    ['Staatsorganisationsrecht', 'Öffentliches Recht'],
    ['Grundrechte', 'Öffentliches Recht'],
    ['Verwaltungsrecht AT', 'Öffentliches Recht'],
    ['Verwaltungsprozessrecht', 'Öffentliches Recht'],
    ['Polizeirecht', 'Öffentliches Recht'],
    ['Baurecht', 'Öffentliches Recht'],
    ['Kommunalrecht', 'Öffentliches Recht'],
    ['Staatshaftungsrecht', 'Öffentliches Recht'],
    ['Europarecht', 'Öffentliches Recht'],
    ['Organisation & Hinweise', 'Organisation & Hinweise'],
    ['Planung & Hinweise', 'Organisation & Hinweise'],
    ['Zeitplanung', 'Organisation & Hinweise']
]);

const moduleRules: { module: string; patterns: RegExp[] }[] = [
    { module: 'BGB AT', patterns: [/\bbgb\s*at\b/i] },
    {
        module: 'Schuldrecht AT',
        patterns: [/\bschuldrecht\s*at\b/i, /\bschr\s*at\b/i, /\bschuldr?\.\s*at\b/i]
    },
    {
        module: 'Schuldrecht BT 1 Nichtvermögensdelikte',
        patterns: [
            /\bschr\s*bt\b/i,
            /\bschuldrecht\s*bt\b/i,
            /vertragliche\s+schuldverh/i,
            /verbraucherschutzrecht/i,
            /mietvertrag/i,
            /leasing/i,
            /darlehen/i,
            /dienstvertrag/i,
            /werkvertrag/i,
            /verwahrung/i,
            /bürgschaft/i,
            /schuldversprechen/i
        ]
    },
    {
        module: 'Schuldrecht BT 2 Vermögensdelikte',
        patterns: [
            /bereicherungsrecht/i,
            /delikts/i,
            /gefährdungshaftung/i,
            /\bgoa\b/i,
            /geschäftsführung\s+ohne\s+auftrag/i
        ]
    },
    {
        module: 'Sachenrecht 2 EBV',
        patterns: [/ebv/i, /eig[eä]ntümer-besitzer/i, /eig[eä]ntümer\/besitzer/i]
    },
    {
        module: 'Sachenrecht 3 Immobiliarsachenrecht',
        patterns: [/immobiliarsachenrecht/i, /grundbuch/i, /hypothek/i]
    },
    {
        module: 'Sachenrecht 1 Bewegliche Sachen',
        patterns: [/sachr/i, /sachenrecht/i, /anwartschaft/i, /pfandrecht/i]
    },
    { module: 'Familien- und Erbrecht', patterns: [/familien- und erbrecht/i] },
    { module: 'Familienrecht', patterns: [/famr/i, /familienrecht/i] },
    { module: 'Erbrecht', patterns: [/erbr/i, /erbrecht/i] },
    {
        module: 'Handels- und Gesellschaftsrecht',
        patterns: [/handelsr/i, /gesr/i, /gesellschaftsrecht/i]
    },
    { module: 'Arbeitsrecht', patterns: [/arbr/i, /arbeitsrecht/i] },
    { module: 'ZPO', patterns: [/zpo/i, /zivilprozessrecht/i] },
    { module: 'IPR', patterns: [/ipr/i, /internationales privatrecht/i] },
    { module: 'Strafrecht AT', patterns: [/strr\s*at\b/i, /strafrecht\s*at\b/i] },
    {
        module: 'Strafrecht BT 2 Vermögensdelikte',
        patterns: [/verm[oö]gensdelikt/i, /betrug/i, /untreue/i]
    },
    {
        module: 'Strafrecht BT 1 Nichtvermögensdelikte',
        patterns: [/strr\s*bt\b/i, /strafrecht\s*bt\b/i, /tötungsdelikt/i, /k[öo]rperverletzung/i]
    },
    { module: 'StPO', patterns: [/stpo/i, /strafprozessrecht/i] },
    { module: 'Staatsorganisationsrecht', patterns: [/str\s*i\b/i, /staatsorganisationsrecht/i] },
    { module: 'Grundrechte', patterns: [/str\s*ii\b/i, /grundr/i, /grundrecht/i, /\bgg\)/i] },
    {
        module: 'Verwaltungsprozessrecht',
        patterns: [/vwproz/i, /verwaltungsprozess/i, /verwaltungsgericht/i]
    },
    {
        module: 'Verwaltungsrecht AT',
        patterns: [
            /allgemeines verwaltungsrecht/i,
            /verwaltungsrecht\s*at/i,
            /verwaltungsrecht\s*bt/i,
            /verwaltungsrecht/i,
            /verwaltungsverfahren/i,
            /verwaltungsvollstreckung/i,
            /verwaltungsakt/i,
            /verwaltungsrechtliche\s+klagen/i
        ]
    },
    { module: 'Polizeirecht', patterns: [/polr/i, /polizeirecht/i] },
    { module: 'Baurecht', patterns: [/baur/i, /baurecht/i] },
    { module: 'Kommunalrecht', patterns: [/komr/i, /kommunalrecht/i] },
    { module: 'Staatshaftungsrecht', patterns: [/sthaft/i, /staatshaftungsrecht/i] },
    {
        module: 'Europarecht',
        patterns: [
            /europarecht/i,
            /europ?r\s*(i|ii)/i,
            /ferienkurs.*europ/i,
            /vsl\.?\s*ferienkurs.*europ/i,
            /eugvvo/i,
            /rom\s*i/i,
            /rom\s*ii/i
        ]
    },
    { module: 'Organisation & Hinweise', patterns: [/mock_exam/i, /holiday/i, /vacation/i] }
];

const FALLBACK_MODULE = 'Planung & Hinweise';
const FALLBACK_AREA = 'Organisation & Hinweise';

const normalizeDescription = (value: string): string => {
    const lines = value.split(/\r?\n/);
    const consumeLeadingBlank = (): void => {
        while (lines.length > 0 && lines[0]!.trim().length === 0) {
            lines.shift();
        }
    };

    consumeLeadingBlank();

    let removedIdentifier = false;

    if (lines.length > 0 && /^\s*nr\.\s*\d+\s*·/i.test(lines[0]!)) {
        lines.shift();
        removedIdentifier = true;
        consumeLeadingBlank();
    }

    if (lines.length > 0 && /^\s*id\s+/i.test(lines[0]!)) {
        lines.shift();
        removedIdentifier = true;
        consumeLeadingBlank();
    }

    if (
        removedIdentifier &&
        lines.length > 0 &&
        /^[A-Za-zÄÖÜäöüß0-9 .,&/-]+\(\s*\d+\s*\/\s*\d+\s*\)\s*$/u.test(lines[0]!.trim())
    ) {
        lines.shift();
        consumeLeadingBlank();
    }

    const trimmed = lines.join('\n').trim();
    return trimmed.length > 0 ? trimmed : '- (kein Inhalt angegeben)';
};

const isSimpleTemplateEntry = (value: unknown): value is SimpleTemplateEntry => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Record<string, unknown>;
    const hasArea = typeof record.Rechtsgebiet === 'string' && record.Rechtsgebiet.trim().length > 0;
    const hasSubArea =
        typeof record.Unterrechtsgebiet === 'string' && record.Unterrechtsgebiet.trim().length > 0;
    const description = record.Beschreibung;
    const validDescription =
        typeof description === 'string' ||
        (Array.isArray(description) && description.every(item => typeof item === 'string'));
    return hasArea && hasSubArea && validDescription;
};

const isSimpleTemplateArray = (value: unknown): value is SimpleTemplateEntry[] =>
    Array.isArray(value) && value.every(isSimpleTemplateEntry);

const convertSimpleTemplateEntries = (entries: SimpleTemplateEntry[]): NormalizedEntry[] =>
    entries.map(item => {
        const description =
            typeof item.Beschreibung === 'string'
                ? item.Beschreibung
                : item.Beschreibung.join('\n\n');
        return {
            area: item.Rechtsgebiet,
            module: item.Unterrechtsgebiet,
            text: description
        };
    });

const toSimpleTemplateEntry = (entry: NormalizedEntry): SimpleTemplateEntry => {
    const legalArea = normalizeLegalArea(entry.area) ?? entry.area ?? FALLBACK_AREA;
    const subArea = normalizeSubArea(entry.module) ?? entry.module ?? FALLBACK_MODULE;
    return {
        Rechtsgebiet: legalArea,
        Unterrechtsgebiet: subArea,
        Beschreibung: normalizeDescription(entry.text)
    };
};

const asString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const categorize = (title: string, extra: string = ''): { area: string; module: string } => {
    const titleHaystack = title.toLowerCase();
    const fullHaystack = `${title}\n${extra}`.toLowerCase();

    const match = (haystack: string): { area: string; module: string } | null => {
        for (const rule of moduleRules) {
            if (rule.patterns.some(pattern => pattern.test(haystack))) {
                const module = rule.module;
                const area = MODULE_AREAS.get(module) ?? FALLBACK_AREA;
                return { area, module };
            }
        }
        return null;
    };

    return match(titleHaystack) ?? match(fullHaystack) ?? { area: FALLBACK_AREA, module: FALLBACK_MODULE };
};

const toRoman = (value: number): string => {
    if (value <= 0) {
        return 'I';
    }
    const numerals: [number, string][] = [
        [1000, 'M'],
        [900, 'CM'],
        [500, 'D'],
        [400, 'CD'],
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I']
    ];
    let remaining = value;
    let result = '';
    for (const [arabic, roman] of numerals) {
        while (remaining >= arabic) {
            result += roman;
            remaining -= arabic;
        }
    }
    return result;
};

const generateAreaCode = (() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const used = new Set<string>();
    let index = 0;

    return (prefilled: string[]): string => {
        prefilled.forEach(code => used.add(code));
        const computeCode = (idx: number): string => {
            if (idx < alphabet.length) {
                return alphabet[idx]!;
            }
            const offset = idx - alphabet.length;
            const first = alphabet[Math.floor(offset / alphabet.length)]!;
            const second = alphabet[offset % alphabet.length]!;
            return `${first}${second}`;
        };

        let code: string;
        do {
            code = computeCode(index++);
        } while (used.has(code));
        used.add(code);
        return code;
    };
})();

const buildAreaMetadata = (template1: TemplateArea[]): Map<string, AreaMeta> => {
    const metadata = new Map<string, AreaMeta>();
    template1.forEach((area, areaIndex) => {
        const moduleMeta = new Map<string, ModuleMeta>();
        area.children.forEach((child, childIndex) => {
            moduleMeta.set(child.title, { code: child.code, order: childIndex + 1 });
        });
        metadata.set(area.title, {
            code: area.code,
            order: areaIndex + 1,
            nextModuleOrder: area.children.length + 1,
            moduleMeta
        });
    });
    return metadata;
};

const ensureAreaMeta = (
    store: Map<string, AreaMeta>,
    areaTitle: string,
    nextAreaOrder: { value: number },
    allocateCode: () => string
): AreaMeta => {
    const existing = store.get(areaTitle);
    if (existing) {
        return existing;
    }
    const code = allocateCode();
    const created: AreaMeta = {
        code,
        order: nextAreaOrder.value++,
        nextModuleOrder: 1,
        moduleMeta: new Map()
    };
    store.set(areaTitle, created);
    return created;
};

const ensureModuleMeta = (area: AreaMeta, moduleTitle: string): ModuleMeta => {
    const existing = area.moduleMeta.get(moduleTitle);
    if (existing) {
        return existing;
    }
    const order = area.nextModuleOrder++;
    const code = toRoman(order);
    const created: ModuleMeta = { code, order };
    area.moduleMeta.set(moduleTitle, created);
    return created;
};

const buildTemplateStructure = (
    template1Blueprint: TemplateArea[],
    entries: NormalizedEntry[],
    metadataStore: Map<string, AreaMeta>,
    nextAreaOrder: { value: number },
    allocateCode: () => string
): TemplateArea[] => {
    const grouped = new Map<string, Map<string, string[]>>();

    for (const entry of entries) {
        const areaName = entry.area;
        const moduleName = entry.module;
        if (!grouped.has(areaName)) {
            grouped.set(areaName, new Map());
        }
        const moduleMap = grouped.get(areaName)!;
        if (!moduleMap.has(moduleName)) {
            moduleMap.set(moduleName, []);
        }
        moduleMap.get(moduleName)!.push(entry.text.trim());
    }

    const areas = Array.from(grouped.keys()).map(title => {
        const meta = ensureAreaMeta(metadataStore, title, nextAreaOrder, allocateCode);
        return { title, meta };
    });

    areas.sort((a, b) => a.meta.order - b.meta.order);

    return areas.map(({ title, meta }) => {
        const moduleMap = grouped.get(title)!;
        const modules = Array.from(moduleMap.entries()).map(([moduleTitle, items]) => {
            const moduleMeta = ensureModuleMeta(meta, moduleTitle);
            return {
                code: moduleMeta.code,
                title: moduleTitle,
                units: items.length,
                items
            };
        });

        modules.sort((a, b) => {
            const areaMeta = metadataStore.get(title)!;
            const metaA = areaMeta.moduleMeta.get(a.title)!;
            const metaB = areaMeta.moduleMeta.get(b.title)!;
            return metaA.order - metaB.order;
        });

        return {
            code: meta.code,
            title,
            children: modules
        };
    });
};

function convertLerninhalte2(raw: unknown): NormalizedEntry[] {
    if (!Array.isArray(raw)) {
        throw new Error('lerninhalte2.json sollte ein Array sein.');
    }

    const entries: NormalizedEntry[] = [];

    raw.forEach((session, index) => {
        if (!session || typeof session !== 'object') {
            return;
        }

        const typed = session as {
            session?: number;
            type?: string;
            subjects?: unknown[];
        };

        const label =
            typeof typed.session === 'number'
                ? `Session ${typed.session}`
                : `Eintrag ${index + 1}`;

        if (typed.type === 'pause') {
            entries.push({
                area: FALLBACK_AREA,
                module: 'Zeitplanung',
                text: `${label} · Pause`
            });
            return;
        }

        const subjects = Array.isArray(typed.subjects) ? typed.subjects : [];
        subjects.forEach(subject => {
            if (!subject || typeof subject !== 'object') {
                return;
            }
            const record = subject as { title?: unknown; topics?: unknown[] };
            const title = asString(record.title) ?? 'Unbenannter Block';
            const topics = Array.isArray(record.topics)
                ? record.topics.filter(isNonEmptyString)
                : [];
            const content: string[] = [`${label} · ${title}`];
            if (topics.length > 0) {
                content.push('', ...topics.map(topic => `- ${topic}`));
            }
            else {
                content.push('', '- (kein Inhalt angegeben)');
            }
            const joinedTopics = topics.join(' ');
            const placement = categorize(title, joinedTopics);
            entries.push({
                area: placement.area,
                module: placement.module,
                text: content.join('\n')
            });
        });
    });

    return entries;
}

function convertLerninhalte3(raw: unknown): NormalizedEntry[] {
    if (!Array.isArray(raw)) {
        throw new Error('lerninhalte3.json sollte ein Array sein.');
    }

    return raw
        .map((entry, index) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            const record = entry as {
                topic?: unknown;
                orientation?: unknown;
                sources?: unknown;
                area?: unknown;
                module?: unknown;
            };
            const topic = asString(record.topic) ?? `Eintrag ${index + 1}`;
            const orientation = asString(record.orientation);
            const sources = asString(record.sources);
            const context = `${asString(record.area) ?? ''} ${asString(record.module) ?? ''}`;
            const placement = categorize(`${topic} ${context}`, `${orientation ?? ''} ${sources ?? ''}`);
            const lines = [topic];
            if (orientation) {
                lines.push('', `Orientierung: ${orientation}`);
            }
            if (sources) {
                lines.push('', `Quellen: ${sources}`);
            }
            return {
                area: placement.area,
                module: placement.module,
                text: lines.join('\n')
            };
        })
        .filter((entry): entry is NormalizedEntry => entry !== null);
}

function convertLerninhalte4(raw: unknown): NormalizedEntry[] {
    if (!Array.isArray(raw)) {
        throw new Error('lerninhalte4.json sollte ein Array sein.');
    }

    const entries: NormalizedEntry[] = [];

    raw.forEach(item => {
        if (!item || typeof item !== 'object') {
            return;
        }
        const record = item as Record<string, unknown>;
        const type = asString(record.type) ?? 'lesson';

        if (type !== 'lesson') {
            const label = asString(record.label ?? record.title ?? record.type) ?? 'Hinweis';
            entries.push({
                area: FALLBACK_AREA,
                module: 'Zeitplanung',
                text: `[${type}] ${label}`
            });
            return;
        }

        const title = asString(record.title) ?? 'Unbenannte Lesson';
        const orientation = asString(record.orientation);
        const sources = asString(record.sources);
        const tag = asString(record.tag);
        const content = [title];
        if (orientation) {
            content.push('', `Orientierung: ${orientation}`);
        }
        if (sources) {
            content.push('', `Quellen: ${sources}`);
        }
        if (tag) {
            content.push('', `Slot: ${tag}`);
        }
        const placement = categorize(title, `${orientation ?? ''} ${sources ?? ''}`);
        entries.push({
            area: placement.area,
            module: placement.module,
            text: content.join('\n')
        });
    });

    return entries;
}

const asDescriptionArray = (value: unknown): string[] | undefined =>
    Array.isArray(value) ? value.filter(isNonEmptyString) : undefined;

function convertLegacyLerninhalte5(raw: unknown[]): NormalizedEntry[] {
    return raw
        .map(item => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const record = item as {
                Rechtsgebiet?: unknown;
                Unterrechtsgebiet?: unknown;
                Beschreibung?: unknown;
            };
            const area = asString(record.Rechtsgebiet) ?? FALLBACK_AREA;
            const module = asString(record.Unterrechtsgebiet) ?? FALLBACK_MODULE;
            const description = asDescriptionArray(record.Beschreibung);
            const text = description && description.length > 0 ? description.join('\n\n') : '- (kein Inhalt angegeben)';
            const headline = description?.[0] ?? module;
            const placement = categorize(headline, text);
            return {
                area: isNonEmptyString(record.Rechtsgebiet) ? area : placement.area,
                module: isNonEmptyString(record.Unterrechtsgebiet) ? module : placement.module,
                text
            };
        })
        .filter((entry): entry is NormalizedEntry => entry !== null);
}

function convertStructuredLerninhalte5Entries(list: unknown[]): NormalizedEntry[] {
    const entries: NormalizedEntry[] = [];

    list.forEach(item => {
        if (!item || typeof item !== 'object') {
            return;
        }
        const record = item as Record<string, unknown>;
        const type = asString(record.type) ?? 'lesson';

        if (type !== 'lesson') {
            const label = asString(record.label ?? record.topic ?? record.type) ?? 'Markierung';
            entries.push({
                area: FALLBACK_AREA,
                module: 'Zeitplanung',
                text: `[${type}] ${label}`
            });
            return;
        }

        const topic = asString(record.topic) ?? 'Unbenannte Lesson';
        const materials = asString(record.materials);
        const references = Array.isArray(record.references)
            ? (record.references as unknown[]).filter(isNonEmptyString)
            : [];
        const nr = typeof record.nr === 'number' ? record.nr : undefined;
        const header = nr ? `Nr. ${nr} · ${topic}` : topic;
        const content = [header];
        if (materials) {
            content.push('', `Materialien: ${materials}`);
        }
        if (references.length > 0) {
            content.push('', 'Referenzen:', ...references.map(ref => `- ${ref}`));
        }

        const placement = categorize(topic, `${materials ?? ''} ${references.join(' ')}`);
        entries.push({
            area: placement.area,
            module: placement.module,
            text: content.join('\n')
        });
    });

    return entries;
}

function convertLerninhalte5(raw: unknown): NormalizedEntry[] {
    if (Array.isArray(raw)) {
        return convertLegacyLerninhalte5(raw);
    }

    if (raw && typeof raw === 'object' && Array.isArray((raw as { entries?: unknown[] }).entries)) {
        return convertStructuredLerninhalte5Entries((raw as { entries: unknown[] }).entries);
    }

    throw new Error('lerninhalte5.json muss entweder ein Array oder ein Objekt mit dem Feld "entries" sein.');
}

function convertLerninhalte6(raw: unknown): NormalizedEntry[] {
    if (!Array.isArray(raw)) {
        throw new Error('lerninhalte6.json sollte ein Array sein.');
    }

    return raw
        .map(item => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const record = item as {
                id?: unknown;
                topic?: unknown;
                orientation?: unknown;
                readings?: unknown[];
                level?: unknown;
            };
            const title = asString(record.topic) ?? 'Unbenannte Lesson';
            const orientation = asString(record.orientation);
            const readings = Array.isArray(record.readings)
                ? record.readings.filter(isNonEmptyString)
                : [];
            const level = asString(record.level);
            const id =
                typeof record.id === 'number'
                    ? `ID ${record.id}`
                    : isNonEmptyString(record.id)
                      ? `ID ${record.id}`
                      : undefined;
            const content: string[] = [];
            if (id || level) {
                content.push(
                    [id, level ? `Level ${level}` : undefined].filter(Boolean).join(' · ')
                );
            }
            content.push(title);
            if (orientation) {
                content.push('', `Orientierung: ${orientation}`);
            }
            if (readings.length > 0) {
                content.push('', 'Literatur:', ...readings.map(reading => `- ${reading}`));
            }
            const placement = categorize(title, `${orientation ?? ''} ${readings.join(' ')}`);
            return {
                area: placement.area,
                module: placement.module,
                text: content.join('\n')
            };
        })
        .filter((entry): entry is NormalizedEntry => entry !== null);
}

const convertPayload = (raw: unknown, converter: TemplateConverter): NormalizedEntry[] => {
    if (isSimpleTemplateArray(raw)) {
        return convertSimpleTemplateEntries(raw);
    }
    return converter(raw);
};

const ensureSimpleEntries = (entries: NormalizedEntry[]): SimpleTemplateEntry[] =>
    entries.map(toSimpleTemplateEntry);

const main = async (): Promise<void> => {
    const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

    for (const dir of TARGET_DIRS) {
        const absoluteDir = path.resolve(projectRoot, dir);
        for (const entry of TEMPLATE_FILES) {
            const absolutePath = path.join(absoluteDir, entry.fileName);
            try {
                const content = await readFile(absolutePath, 'utf-8');
                const raw = JSON.parse(content);
                const normalized = convertPayload(raw, entry.convert);
                const simpleEntries = ensureSimpleEntries(normalized);
                await writeFile(absolutePath, `${JSON.stringify(simpleEntries, null, 2)}\n`, 'utf-8');
                console.log(
                    `Normalisiert: ${path.relative(projectRoot, absolutePath)} (${simpleEntries.length} Einträge)`
                );
            } catch (error) {
                const err = error as NodeJS.ErrnoException;
                if (err.code === 'ENOENT') {
                    console.warn(`[normalize-templates] Datei nicht gefunden: ${absolutePath}`);
                    continue;
                }
                console.error(`[normalize-templates] Fehler bei ${absolutePath}:`, error);
                throw error;
            }
        }
    }
};

main().catch(error => {
    console.error('Konvertierung fehlgeschlagen:', error);
    process.exitCode = 1;
});
