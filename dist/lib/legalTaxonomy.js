const umlautMap = {
    ä: 'ae',
    ö: 'oe',
    ü: 'ue',
    Ä: 'Ae',
    Ö: 'Oe',
    Ü: 'Ue',
    ß: 'ss'
};
const slugify = (value) => {
    let normalized = value;
    for (const [needle, replacement] of Object.entries(umlautMap)) {
        normalized = normalized.replace(new RegExp(needle, 'g'), replacement);
    }
    const folded = normalized
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/&/g, ' und ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    return folded.replace(/\s+/g, ' ');
};
const titleCase = (value) => value
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
const AREA_ALIAS_MAP = new Map([
    ['zivilrecht', 'Zivilrecht'],
    ['zivilr', 'Zivilrecht'],
    ['zivil', 'Zivilrecht'],
    ['zivilrechtliche nebeng', 'Zivilrechtliche Nebengebiete'],
    ['zivilrechtliche neb', 'Zivilrechtliche Nebengebiete'],
    ['oeffentliches recht', 'Öffentliches Recht'],
    ['offentliches recht', 'Öffentliches Recht'],
    ['oeffr', 'Öffentliches Recht'],
    ['offr', 'Öffentliches Recht'],
    ['strafrecht', 'Strafrecht'],
    ['strr', 'Strafrecht'],
    ['organisation und hinweise', 'Organisation & Hinweise'],
    ['planung und hinweise', 'Organisation & Hinweise'],
    ['zeitplanung', 'Organisation & Hinweise']
]);
const SUB_AREA_ALIAS_MAP = new Map([
    ['bgb at', 'BGB AT'],
    ['bgb at 1', 'BGB AT'],
    ['bgb at 2', 'BGB AT'],
    ['bgb at 3', 'BGB AT'],
    ['bgb at 4', 'BGB AT'],
    ['schuldr at', 'Schuldrecht AT'],
    ['schuldr at 1', 'Schuldrecht AT'],
    ['schuldr at 2', 'Schuldrecht AT'],
    ['schuldr at 3', 'Schuldrecht AT'],
    ['schuldr at 4', 'Schuldrecht AT'],
    ['schuldr bt', 'Schuldrecht BT'],
    ['schuldr bt 1', 'Schuldrecht BT'],
    ['schuldr bt 2', 'Schuldrecht BT'],
    ['schuldr bt 3', 'Schuldrecht BT'],
    ['schuldr bt 4', 'Schuldrecht BT'],
    ['schuldr bt 5', 'Schuldrecht BT'],
    ['schuldr bt 6', 'Schuldrecht BT'],
    ['schuldr bt 7', 'Schuldrecht BT'],
    ['schuldr bt 8', 'Schuldrecht BT'],
    ['schuldr bt 9', 'Schuldrecht BT'],
    ['schuldr bt 10', 'Schuldrecht BT'],
    ['schuldr bt 11', 'Schuldrecht BT'],
    ['schuldr bt 12', 'Schuldrecht BT'],
    ['schuldrecht bt', 'Schuldrecht BT'],
    ['schuldrecht at', 'Schuldrecht AT'],
    ['schr bt', 'Schuldrecht BT'],
    ['schr at', 'Schuldrecht AT'],
    ['kaufrecht', 'Schuldrecht BT'],
    ['dienstvertrag', 'Schuldrecht BT'],
    ['werkvertrag', 'Schuldrecht BT'],
    ['darlehen', 'Schuldrecht BT'],
    ['leasing', 'Schuldrecht BT'],
    ['mietvertrag', 'Schuldrecht BT'],
    ['sachenr', 'Sachenrecht 1 Bewegliche Sachen'],
    ['sachenr 1', 'Sachenrecht 1 Bewegliche Sachen'],
    ['sachenr 2', 'Sachenrecht 2 EBV'],
    ['sachenr 3', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 4', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 5', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 6', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 7', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 8', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 9', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['sachenr 10', 'Sachenrecht 3 Immobiliarsachenrecht'],
    ['ebv', 'Sachenrecht 2 EBV'],
    ['familienr', 'Familienrecht'],
    ['familien und erbrecht', 'Familien- und Erbrecht'],
    ['erbr', 'Erbrecht'],
    ['handelsr', 'Handels- und Gesellschaftsrecht'],
    ['gesr', 'Handels- und Gesellschaftsrecht'],
    ['gesellschaftsr', 'Handels- und Gesellschaftsrecht'],
    ['arbeitsr', 'Arbeitsrecht'],
    ['zpo', 'ZPO'],
    ['ipr', 'IPR'],
    ['strr at', 'Strafrecht AT'],
    ['strr bt', 'Strafrecht BT'],
    ['strafrecht at', 'Strafrecht AT'],
    ['strafrecht bt', 'Strafrecht BT'],
    ['strafrecht bt 1', 'Strafrecht BT'],
    ['strafrecht bt 2', 'Strafrecht BT'],
    ['strafrecht bt 3', 'Strafrecht BT'],
    ['strafrecht bt 4', 'Strafrecht BT'],
    ['strafrecht bt 5', 'Strafrecht BT'],
    ['strr ii', 'Grundrechte'],
    ['str ii', 'Grundrechte'],
    ['strr i', 'Staatsorganisationsrecht'],
    ['str i', 'Staatsorganisationsrecht'],
    ['str ii', 'Grundrechte'],
    ['grundr', 'Grundrechte'],
    ['grundr 1', 'Grundrechte'],
    ['grundr 2', 'Grundrechte'],
    ['grundr 3', 'Grundrechte'],
    ['grundr 4', 'Grundrechte'],
    ['grundrechte', 'Grundrechte'],
    ['staatsorga', 'Staatsorganisationsrecht'],
    ['staatsorga 1', 'Staatsorganisationsrecht'],
    ['staatsorga 2', 'Staatsorganisationsrecht'],
    ['staatsorga 3', 'Staatsorganisationsrecht'],
    ['staatsorga 4', 'Staatsorganisationsrecht'],
    ['verwaltungsrecht', 'Verwaltungsrecht AT'],
    ['verwr at', 'Verwaltungsrecht AT'],
    ['vwr at', 'Verwaltungsrecht AT'],
    ['verwaltungsrecht at', 'Verwaltungsrecht AT'],
    ['vwvfg', 'Verwaltungsrecht AT'],
    ['vwgo', 'Verwaltungsprozessrecht'],
    ['vwproz', 'Verwaltungsprozessrecht'],
    ['vwprozr', 'Verwaltungsprozessrecht'],
    ['verwaltungsprozessrecht', 'Verwaltungsprozessrecht'],
    ['verwaltungsgericht', 'Verwaltungsprozessrecht'],
    ['polr', 'Polizeirecht'],
    ['polizeirecht', 'Polizeirecht'],
    ['baur', 'Baurecht'],
    ['baurecht', 'Baurecht'],
    ['komr', 'Kommunalrecht'],
    ['komrr', 'Kommunalrecht'],
    ['komr 1', 'Kommunalrecht'],
    ['komr 2', 'Kommunalrecht'],
    ['komr 3', 'Kommunalrecht'],
    ['kommunalrecht', 'Kommunalrecht'],
    ['staatshaftungsr', 'Staatshaftungsrecht'],
    ['europarecht', 'Europarecht'],
    ['europarecht 1', 'Europarecht'],
    ['europarecht 2', 'Europarecht'],
    ['stpo', 'StPO'],
    ['stpo 1', 'StPO'],
    ['stpo 2', 'StPO'],
    ['organisation und hinweise', 'Organisation & Hinweise'],
    ['planung und hinweise', 'Planung & Hinweise'],
    ['zeitplanung', 'Zeitplanung'],
    ['mock exam', 'Organisation & Hinweise']
]);
export const normalizeLegalArea = (value) => {
    if (!value) {
        return undefined;
    }
    const slug = slugify(value);
    const candidates = [slug, slug.replace(/\b\d+\b/g, '').trim()];
    for (const candidate of candidates) {
        if (candidate && AREA_ALIAS_MAP.has(candidate)) {
            return AREA_ALIAS_MAP.get(candidate);
        }
    }
    return titleCase(value);
};
export const normalizeSubArea = (value) => {
    if (!value) {
        return undefined;
    }
    const slug = slugify(value);
    const candidates = [slug, slug.replace(/\b\d+\b/g, '').trim()];
    for (const candidate of candidates) {
        if (candidate && SUB_AREA_ALIAS_MAP.has(candidate)) {
            return SUB_AREA_ALIAS_MAP.get(candidate);
        }
    }
    return titleCase(value);
};
export { slugify };
//# sourceMappingURL=legalTaxonomy.js.map