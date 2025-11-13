import type { PlanRequestPayload } from '../validation/planRequestSchema.js';
import type { TemplateList, TemplateEntry } from '../services/templateRegistry.js';

export const renderTopicSelectionPrompt = (payload: PlanRequestPayload, templates: TemplateList[]): string => {
    // Alle verfügbaren Themen aus allen Templates sammeln
    const allTopics = templates.flatMap(template =>
        template.entries.map(entry => ({
            legal_area: entry.legal_area || 'Unbekannt',
            sub_area: entry.sub_area || 'Unbekannt',
            topic_description: entry.topic_description || 'Keine Beschreibung',
        }))
    );

    // Berechne die erwartete Anzahl der Themen
    const totalTopicsNeeded = Object.values(payload.topicsPerWeekday).reduce((sum, count) => sum + count, 0);
    const activeLearningDays = payload.weekdays.length || 1;
    const topicsPerDay = totalTopicsNeeded / activeLearningDays;
    const targetTotalTopics = Math.max(0, Math.round(topicsPerDay * payload.dayCount));

    const topicsJson = JSON.stringify(allTopics, null, 2);

    return [
        'Du bist ein Experte für juristische Lernplanung und Prüfungsvorbereitung.',
        '',
        '# AUFGABE',
        'Wähle aus der unten stehenden Liste von verfügbaren Themen die passenden Themen für den Nutzer aus.',
        'Berücksichtige dabei folgende Angaben des Nutzers:',
        '',
        '# NUTZER-ANGABEN',
        `Plan Titel: ${payload.planTitle}`,
        `Anzahl Lerntage: ${payload.dayCount}`,
        `Startdatum: ${payload.startDate}`,
        `Stadt: ${payload.city}`,
        `Lerntage: ${payload.weekdays.join(', ')}`,
        `Wiederholungen: ${payload.repetitionCount}x (Modus: ${payload.repetitionMode})`,
        `Lernstrategie: ${payload.strategy}`,
        '',
        '## Rechtsgebiete und Gewichtung',
        payload.weights.map(({ legalArea, weight }) => `- ${legalArea}: ${(weight * 100).toFixed(0)}%`).join('\n'),
        '',
        '## Themen pro Wochentag',
        Object.entries(payload.topicsPerWeekday)
            .filter(([_, count]) => count > 0)
            .map(([day, count]) => `- ${day}: ${count} Themen`)
            .join('\n'),
        '',
        '# VERFÜGBARE THEMEN',
        topicsJson,
        '',
        '# AUSWAHLKRITERIEN',
        `1. WICHTIG: Liefere GENAU ${targetTotalTopics} Themen (für ${payload.dayCount} Lerntage).`,
        '2. Wähle Themen basierend auf der Gewichtung der Rechtsgebiete aus:',
        payload.weights.map(({ legalArea, weight }) =>
            `   - ${legalArea}: ca. ${Math.round(targetTotalTopics * weight)} Themen (${(weight * 100).toFixed(0)}%)`
        ).join('\n'),
        '3. Bei der Strategie "blocks": Wähle thematisch zusammenhängende Themen aus JEDEM Rechtsgebiet',
        '4. Bei der Strategie "sprint": Priorisiere schwierigere/komplexere Themen',
        '5. Bei der Strategie "mixed": Wähle eine ausgewogene Mischung aus allen Rechtsgebieten',
        `6. Wenn ${payload.repetitionCount} Wiederholungen geplant sind, dürfen Themen mehrfach vorkommen, um die Zielanzahl zu erreichen.`,
        '7. Wenn zu wenige Themen vorhanden sind, wiederhole passende Themen so, dass die Gesamtanzahl exakt erfüllt ist.',
        '',
        '# ANTWORT-FORMAT',
        'Gib deine Antwort als valides JSON zurück. WICHTIG: Nur JSON, kein zusätzlicher Text!',
        '',
        '{',
        '  "topics": [',
        '    {',
        '      "legal_area": "Zivilrecht",',
        '      "sub_area": "BGB AT",',
        '      "topic_description": "Rechtsgeschäftslehre"',
        '    }',
        '  ],',
        '  "reasoning": "Kurze Erklärung der Auswahl (optional)"',
        '}',
    ].join('\n');
};
