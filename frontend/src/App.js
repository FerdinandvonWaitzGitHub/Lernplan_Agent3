import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import './index.css';
import './App.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const WEEKDAYS = [
    { key: 'Mon', label: 'Montag' },
    { key: 'Tue', label: 'Dienstag' },
    { key: 'Wed', label: 'Mittwoch' },
    { key: 'Thu', label: 'Donnerstag' },
    { key: 'Fri', label: 'Freitag' },
    { key: 'Sat', label: 'Samstag' },
    { key: 'Sun', label: 'Sonntag' },
];
const WEEKDAY_LABEL_BY_KEY = WEEKDAYS.reduce((acc, weekday) => {
    acc[weekday.key] = weekday.label;
    return acc;
}, {});
const STEP_LABELS = ['Rahmendaten', 'Verfügbarkeit & Präferenzen', 'Schwerpunkte'];
const DEFAULT_WEIGHTS = {
    Zivilrecht: 0.6,
    'Öffentliches Recht': 0.25,
    Strafrecht: 0.15,
};
const LEARNING_STRATEGIES = [
    { value: 'blocks', label: 'Blocklernen', description: 'Themen eines Rechtsgebiets werden zusammenhängend gelernt (z.B. alle BGB AT Themen hintereinander). Ideal für tiefes Verständnis.' },
    { value: 'sprint', label: 'Sprint', description: 'Schwierige Themen werden früh priorisiert. Höhere Konzentration auf Ihre Schwächen. Kompaktere, intensive Lernphasen.' },
    { value: 'mixed', label: 'Durchmischt', description: 'Rechtsgebiete werden abwechselnd gelernt (z.B. Tag 1: Zivilrecht, Tag 2: Strafrecht, Tag 3: Öffentliches Recht). Fördert Wissenstransfer.' },
];
const initialState = {
    planTitle: '',
    dayCount: 14,
    startDate: '',
    city: '',
    selectedWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    strategy: '',
    repetitionCount: 1,
    repetitionMode: 'sequential',
    repEnabled: true,
    repDays: ['Tue', 'Thu'],
    repStartDate: '',
    repPlanProvided: false,
    weights: { ...DEFAULT_WEIGHTS },
    topicsPerWeekday: { Mon: 3, Tue: 3, Wed: 3, Thu: 3, Fri: 3, Sat: 0, Sun: 0 },
};
function App() {
    const [formState, setFormState] = useState(initialState);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepError, setStepError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [result, setResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectWeight, setNewSubjectWeight] = useState(0.1);
    const weakSubjectEntries = useMemo(() => Object.entries(formState.weights), [formState.weights]);
    const handleTextChange = (key) => (event) => {
        const value = event.target.value;
        setFormState((prev) => ({ ...prev, [key]: value }));
    };
    const handleWeekdayToggle = (weekday) => {
        setFormState((prev) => {
            const alreadySelected = prev.selectedWeekdays.includes(weekday);
            const nextWeekdays = alreadySelected
                ? prev.selectedWeekdays.filter((item) => item !== weekday)
                : [...prev.selectedWeekdays, weekday];
            const nextRepDays = prev.repDays.filter((day) => nextWeekdays.includes(day));
            return {
                ...prev,
                selectedWeekdays: nextWeekdays,
                repDays: prev.repEnabled ? nextRepDays : [],
            };
        });
    };
    const handleRepToggle = () => {
        setFormState((prev) => ({
            ...prev,
            repEnabled: !prev.repEnabled,
            repDays: prev.repEnabled ? [] : prev.repDays,
        }));
    };
    const handleRepDayToggle = (weekday) => {
        setFormState((prev) => {
            const alreadySelected = prev.repDays.includes(weekday);
            const nextRepDays = alreadySelected ? prev.repDays.filter((item) => item !== weekday) : [...prev.repDays, weekday];
            return { ...prev, repDays: nextRepDays };
        });
    };
    const handleWeakSubjectChange = (subject, weight) => {
        setFormState((prev) => ({
            ...prev,
            weights: { ...prev.weights, [subject]: weight },
        }));
    };
    const handleRemoveWeakSubject = (subject) => {
        setFormState((prev) => {
            const nextSubjects = { ...prev.weights };
            delete nextSubjects[subject];
            return { ...prev, weights: nextSubjects };
        });
    };
    const handleAddWeakSubject = () => {
        const trimmedName = newSubjectName.trim();
        if (!trimmedName) {
            return;
        }
        if (trimmedName in formState.weights) {
            setStepError('Das Rechtsgebiet existiert bereits. Bitte Namen anpassen.');
            return;
        }
        setFormState((prev) => ({
            ...prev,
            weights: { ...prev.weights, [trimmedName]: newSubjectWeight },
        }));
        setNewSubjectName('');
        setNewSubjectWeight(0.1);
        setStepError(null);
    };
    const handleTopicsPerWeekdayChange = (weekday, topics) => {
        setFormState((prev) => ({
            ...prev,
            topicsPerWeekday: { ...prev.topicsPerWeekday, [weekday]: topics },
        }));
    };
    const validateStep = (step) => {
        switch (step) {
            case 0: {
                if (!formState.planTitle.trim()) {
                    return 'Bitte einen Plan Titel eintragen.';
                }
                if (!formState.dayCount || formState.dayCount < 1 || formState.dayCount > 365) {
                    return 'Anzahl Lerntage muss zwischen 1 und 365 liegen.';
                }
                if (!formState.startDate) {
                    return 'Bitte ein Startdatum festlegen.';
                }
                if (!formState.city.trim()) {
                    return 'Bitte eine Stadt eintragen.';
                }
                return null;
            }
            case 1: {
                if (formState.selectedWeekdays.length === 0) {
                    return 'Mindestens ein Wochentag muss ausgewählt sein.';
                }
                if (formState.repEnabled && formState.repDays.length === 0) {
                    return 'Bei aktiviertem Repetitorium müssen entsprechende Tage gewählt werden.';
                }
                return null;
            }
            case 2: {
                if (Object.keys(formState.weights).length === 0) {
                    return 'Bitte mindestens ein Rechtsgebiet angeben.';
                }
                const topicsValues = Object.values(formState.topicsPerWeekday);
                if (topicsValues.some((topics) => topics < 0 || topics > 10)) {
                    return 'Themen pro Wochentag müssen zwischen 0 und 10 liegen.';
                }
                if (!formState.strategy) {
                    return 'Bitte eine Lernstrategie auswählen.';
                }
                return null;
            }
            default:
                return null;
        }
    };
    const goToStep = (target) => {
        if (target < 0 || target >= STEP_LABELS.length) {
            return;
        }
        setCurrentStep(target);
        setStepError(null);
        setSubmitError(null);
    };
    const handleNext = () => {
        const validationMessage = validateStep(currentStep);
        if (validationMessage) {
            setStepError(validationMessage);
            return;
        }
        setStepError(null);
        goToStep(currentStep + 1);
    };
    const handleBack = () => {
        goToStep(currentStep - 1);
    };
    const buildWeekdayRecord = () => {
        return Object.entries(formState.topicsPerWeekday).reduce((acc, [key, value]) => {
            const label = WEEKDAY_LABEL_BY_KEY[key];
            acc[label] = value;
            return acc;
        }, {});
    };
    const handleSubmit = async () => {
        for (let index = 0; index < STEP_LABELS.length; index += 1) {
            const validationMessage = validateStep(index);
            if (validationMessage) {
                setStepError(validationMessage);
                setSubmitError(null);
                goToStep(index);
                return;
            }
        }
        const weekdays = formState.selectedWeekdays.map((weekday) => WEEKDAY_LABEL_BY_KEY[weekday]);
        const repDays = formState.repEnabled ? formState.repDays.map((weekday) => WEEKDAY_LABEL_BY_KEY[weekday]) : [];
        const topicsPerWeekday = buildWeekdayRecord();
        const weights = Object.entries(formState.weights).map(([legalArea, weight]) => ({ legalArea, weight }));
        const payload = {
            planTitle: formState.planTitle.trim(),
            dayCount: Number(formState.dayCount),
            startDate: formState.startDate,
            city: formState.city,
            weekdays,
            repetitionCount: Number(formState.repetitionCount),
            repetitionMode: formState.repetitionMode,
            repEnabled: formState.repEnabled,
            repStartDate: formState.repEnabled && formState.repStartDate ? formState.repStartDate : null,
            repDays,
            repPlanProvided: formState.repEnabled ? formState.repPlanProvided : false,
            weights,
            topicsPerWeekday,
            strategy: formState.strategy,
        };
        setIsSubmitting(true);
        setSubmitError(null);
        console.log('[FRONTEND] Sending request to:', `${API_BASE_URL}/api/plan`);
        console.log('[FRONTEND] Payload:', payload);
        try {
            const response = await fetch(`${API_BASE_URL}/api/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            console.log('[FRONTEND] Response status:', response.status, response.statusText);
            if (!response.ok) {
                const problem = await response.json().catch(() => null);
                console.error('[FRONTEND] Error response:', problem);
                const message = problem?.message || 'Unbekannter Fehler beim Generieren.';
                setSubmitError({
                    message,
                    details: problem?.issues,
                });
                setResult(null);
                return;
            }
            const data = await response.json();
            console.log('[FRONTEND] Success! Received prompt and LLM answer.');
            setResult(data);
            setSubmitError(null);
        }
        catch (error) {
            console.error('[FRONTEND] Exception:', error);
            const errorMessage = error.message || 'Unbekannter Fehler bei der Generierung.';
            setSubmitError({
                message: errorMessage.includes('Failed to fetch')
                    ? 'Verbindung zum Server fehlgeschlagen. Ist der Backend-Server erreichbar?'
                    : errorMessage,
            });
            setResult(null);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (_jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { children: "Plan Titel" }), _jsx("input", { type: "text", value: formState.planTitle, onChange: handleTextChange('planTitle'), placeholder: "Mein individueller Lernplan" }), _jsx("small", { className: "field-hint", children: "Gib deinem Lernplan einen Namen. Die passende Vorlage wird automatisch im Hintergrund geladen." })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "Anzahl Lerntage" }), _jsx("input", { type: "number", min: "1", max: "365", value: formState.dayCount, onChange: (event) => setFormState((prev) => ({ ...prev, dayCount: Number(event.target.value) })) }), _jsx("small", { className: "field-hint", children: "Wie viele Tage soll Ihr Lernplan umfassen? (1-365). Die Anzahl der Themen pro Wochentag legen Sie sp\u00E4ter fest." })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "Startdatum" }), _jsx("input", { type: "date", value: formState.startDate, onChange: handleTextChange('startDate') })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "Stadt" }), _jsx("input", { type: "text", value: formState.city, onChange: handleTextChange('city'), placeholder: "Frankfurt am Main" })] })] }));
            case 1:
                return (_jsxs("div", { className: "form-grid", children: [_jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { children: "Verf\u00FCgbare Wochentage" }), _jsx("div", { className: "weekdays", children: WEEKDAYS.map((weekday) => (_jsxs("label", { className: "checkbox", children: [_jsx("input", { type: "checkbox", checked: formState.selectedWeekdays.includes(weekday.key), onChange: () => handleWeekdayToggle(weekday.key) }), _jsx("span", { children: weekday.label })] }, weekday.key))) })] }), _jsxs("div", { className: "form-field", children: [_jsx("span", { children: "Wiederholungen" }), _jsxs("div", { className: "number-row", children: [_jsxs("label", { children: [_jsx("span", { children: "Anzahl Wiederholungen (1-4)" }), _jsx("input", { type: "number", min: "1", max: "4", value: formState.repetitionCount, onChange: (event) => setFormState((prev) => ({ ...prev, repetitionCount: Number(event.target.value) })) })] }), _jsxs("label", { children: [_jsx("span", { children: "Wiederholungsmodus" }), _jsxs("select", { value: formState.repetitionMode, onChange: (event) => setFormState((prev) => ({ ...prev, repetitionMode: event.target.value })), children: [_jsx("option", { value: "sequential", children: "Sequential (A,B,C \u2192 A,B,C)" }), _jsx("option", { value: "blocked", children: "Blocked (A,A,A \u2192 B,B,B)" }), _jsx("option", { value: "intelligent", children: "Intelligent (LLM optimiert)" })] })] })] }), _jsx("small", { className: "field-hint", children: "Wie oft soll jedes Thema wiederholt werden, und in welchem Muster?" })] }), _jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { children: "Repetitorium" }), _jsxs("label", { className: "checkbox", children: [_jsx("input", { type: "checkbox", checked: formState.repEnabled, onChange: handleRepToggle }), _jsx("span", { children: "Repetitorium aktivieren" })] }), formState.repEnabled && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { children: "Rep-Startdatum (optional)" }), _jsx("input", { type: "date", value: formState.repStartDate, onChange: handleTextChange('repStartDate') })] }), _jsx("div", { className: "weekdays", children: WEEKDAYS.map((weekday) => (_jsxs("label", { className: "checkbox", children: [_jsx("input", { type: "checkbox", checked: formState.repDays.includes(weekday.key), onChange: () => handleRepDayToggle(weekday.key), disabled: !formState.selectedWeekdays.includes(weekday.key) }), _jsxs("span", { children: [weekday.label, !formState.selectedWeekdays.includes(weekday.key) && ' (kein Lerntag)'] })] }, weekday.key))) }), _jsxs("label", { className: "checkbox", children: [_jsx("input", { type: "checkbox", checked: formState.repPlanProvided, onChange: () => setFormState((prev) => ({ ...prev, repPlanProvided: !prev.repPlanProvided })) }), _jsx("span", { children: "Eigener Repetitoriumsplan vorhanden" })] })] }))] })] }));
            case 2:
                return (_jsxs("div", { className: "form-grid", children: [_jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { children: "Rechtsgebiete & Gewichtung" }), _jsx("div", { className: "weak-subjects", children: weakSubjectEntries.map(([subject, weight]) => (_jsxs("div", { className: "weak-subject-row", children: [_jsxs("div", { className: "weak-subject-label", children: [_jsx("span", { children: subject }), _jsxs("strong", { children: [(weight * 100).toFixed(0), "%"] })] }), _jsx("input", { type: "number", min: "0", max: "1", step: "0.05", value: weight, onChange: (event) => handleWeakSubjectChange(subject, Number(event.target.value)) }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => handleRemoveWeakSubject(subject), children: "Entfernen" })] }, subject))) }), _jsxs("div", { className: "weak-subject-add", children: [_jsx("input", { type: "text", placeholder: "Neues Rechtsgebiet", value: newSubjectName, onChange: (event) => setNewSubjectName(event.target.value) }), _jsx("input", { type: "number", min: "0", max: "1", step: "0.05", value: newSubjectWeight, onChange: (event) => setNewSubjectWeight(Number(event.target.value)) }), _jsx("button", { type: "button", onClick: handleAddWeakSubject, children: "Hinzuf\u00FCgen" })] })] }), _jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { children: "Themen pro Wochentag" }), _jsx("div", { className: "topics-grid", children: WEEKDAYS.map((weekday) => (_jsxs("label", { children: [_jsx("span", { children: weekday.label }), _jsx("input", { type: "number", min: "0", max: "10", value: formState.topicsPerWeekday[weekday.key], onChange: (event) => handleTopicsPerWeekdayChange(weekday.key, Number(event.target.value)) })] }, weekday.key))) })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "Lernstrategie" }), _jsxs("select", { value: formState.strategy, onChange: (event) => setFormState((prev) => ({ ...prev, strategy: event.target.value })), children: [_jsx("option", { value: "", children: "-- Bitte w\u00E4hlen --" }), LEARNING_STRATEGIES.map((strategy) => (_jsx("option", { value: strategy.value, children: strategy.label }, strategy.value)))] }), formState.strategy && (_jsx("small", { className: "info-hint", children: LEARNING_STRATEGIES.find((item) => item.value === formState.strategy)?.description })), _jsx("small", { className: "field-hint", children: "W\u00E4hlen Sie, wie die Themen \u00FCber den Zeitraum verteilt werden sollen." })] })] }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "header", children: [_jsx("h1", { children: "Lernplan Generator" }), _jsxs("p", { children: ["Dieses Frontend f\u00FChrt dich Schritt f\u00FCr Schritt durch die Eingaben f\u00FCr ", _jsx("code", { children: "POST /api/plan" }), ". Die Planung bleibt dem LLM \u00FCberlassen \u2013 hier sammelst du nur die ben\u00F6tigten Parameter."] })] }), _jsxs("section", { className: "wizard", children: [_jsx("ol", { className: "step-indicator", children: STEP_LABELS.map((label, index) => (_jsxs("li", { className: index === currentStep ? 'active-step' : index < currentStep ? 'done-step' : '', children: [_jsx("span", { className: "step-index", children: index + 1 }), _jsx("span", { children: label })] }, label))) }), _jsxs("form", { className: "wizard-card", onSubmit: (event) => {
                            event.preventDefault();
                            handleSubmit().catch(() => {
                                /* Fehler werden bereits im State abgefangen */
                            });
                        }, children: [renderStepContent(), stepError && _jsx("p", { className: "error-hint", children: stepError }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", onClick: handleBack, disabled: currentStep === 0, children: "Zur\u00FCck" }), currentStep < STEP_LABELS.length - 1 ? (_jsx("button", { type: "button", onClick: handleNext, children: "Weiter" })) : (_jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Generiere …' : 'Plan generieren' }))] })] }), submitError ? (_jsxs("div", { className: "error-box", children: [_jsx("h4", { children: "\u274C Fehler" }), _jsx("p", { className: "error-hint", children: submitError.message }), Boolean(submitError.details) && (_jsxs("details", { style: { marginTop: '10px' }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 'bold' }, children: "Details anzeigen" }), _jsx("pre", { style: { fontSize: '12px', marginTop: '8px', overflow: 'auto' }, children: JSON.stringify(submitError.details, null, 2) })] }))] })) : null] }), result ? (_jsxs("section", { className: "result-section", children: [_jsx("h2", { children: "Ergebnis" }), _jsxs("div", { className: "result-card", children: [_jsxs("div", { children: [_jsx("h3", { children: "Prompt" }), _jsx("pre", { className: "result-pre", children: result.prompt })] }), _jsxs("div", { children: [_jsx("h3", { children: "Antwort" }), _jsx("pre", { className: "result-pre", children: result.raw })] })] })] })) : null] }));
}
export default App;
//# sourceMappingURL=App.js.map