import lerninhalt1 from './lerninhalt1.json' with { type: 'json' };
import lerninhalte2 from './lerninhalte2.json' with { type: 'json' };
import lerninhalte3 from './lerninhalte3.json' with { type: 'json' };
import lerninhalte4 from './lerninhalte4.json' with { type: 'json' };
import lerninhalte5 from './lerninhalte5.json' with { type: 'json' };
import lerninhalte6 from './lerninhalte6.json' with { type: 'json' };
const makeEntry = (fileName, raw) => ({
    id: fileName.replace(/\.json$/i, ''),
    fileName,
    raw
});
/**
 * Built-in copies of the template files so the backend always has something to fall back to.
 */
export const EMBEDDED_TEMPLATE_FILES = [
    makeEntry('lerninhalt1.json', lerninhalt1),
    makeEntry('lerninhalte2.json', lerninhalte2),
    makeEntry('lerninhalte3.json', lerninhalte3),
    makeEntry('lerninhalte4.json', lerninhalte4),
    makeEntry('lerninhalte5.json', lerninhalte5),
    makeEntry('lerninhalte6.json', lerninhalte6)
];
//# sourceMappingURL=embeddedTemplates.js.map