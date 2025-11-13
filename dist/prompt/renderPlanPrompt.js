export const renderPlanPrompt = (payload, templates) => {
    const summary = templates
        .map(template => {
        const preview = template.preview
            .map((entry) => [entry.legal_area, entry.sub_area, entry.topic_description].filter(Boolean).join(' - '))
            .filter(Boolean)
            .join('; ');
        return `• ${template.id} (${template.entryCount} Einträge)${preview ? ` → ${preview}` : ''}`;
    })
        .join('\n');
    return [
        'Erstelle einen Prüfungs-Lernplan auf Basis der folgenden Eingaben.',
        `Plan Titel: ${payload.planTitle}`,
        `Anzahl Lerntage: ${payload.dayCount}`,
        `Startdatum: ${payload.startDate}`,
        `Stadt: ${payload.city}`,
        `Lerntage: ${payload.weekdays.join(', ')}`,
        `Wiederholungen: ${payload.repetitionCount}`,
        `Modus: ${payload.repetitionMode}`,
        `Repetitorium aktiv: ${payload.repEnabled}`,
        payload.repStartDate ? `Repetitorium ab: ${payload.repStartDate}` : 'Repetitorium Start nicht gesetzt',
        `Repetitoriumstage: ${payload.repDays?.join(', ') || 'keine'}`,
        `Rechtsgebiete: ${payload.weights.map(({ legalArea, weight }) => `${legalArea} (${weight})`).join(', ')}`,
        `Themen pro Wochentag: ${Object.entries(payload.topicsPerWeekday)
            .map(([day, count]) => `${day}: ${count}`)
            .join(', ')}`,
        `Lernstrategie: ${payload.strategy}`,
        '',
        'Verfügbare Themenlisten:',
        summary || 'Keine Templates gefunden.'
    ].join('\n');
};
//# sourceMappingURL=renderPlanPrompt.js.map