import { useMemo, useState, type ChangeEvent } from 'react'
import './index.css'
import './App.css'

const resolveApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
    if (!isLocalhost) {
      return window.location.origin.replace(/\/+$/, '')
    }
  }

  return 'http://localhost:4000'
}

const API_BASE_URL = resolveApiBaseUrl()
const buildApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

if (typeof window !== 'undefined') {
  console.log('[FRONTEND] Verwende API Base URL:', API_BASE_URL)
}

const WEEKDAYS = [
  { key: 'Mon', label: 'Montag' },
  { key: 'Tue', label: 'Dienstag' },
  { key: 'Wed', label: 'Mittwoch' },
  { key: 'Thu', label: 'Donnerstag' },
  { key: 'Fri', label: 'Freitag' },
  { key: 'Sat', label: 'Samstag' },
  { key: 'Sun', label: 'Sonntag' },
] as const

type WeekdayKey = (typeof WEEKDAYS)[number]['key']

const WEEKDAY_LABEL_BY_KEY: Record<WeekdayKey, string> = WEEKDAYS.reduce((acc, weekday) => {
  acc[weekday.key] = weekday.label
  return acc
}, {} as Record<WeekdayKey, string>)

const STEP_LABELS = ['Rahmendaten', 'Verfügbarkeit & Präferenzen', 'Schwerpunkte']

const DEFAULT_WEIGHTS: Record<string, number> = {
  Zivilrecht: 0.6,
  'Öffentliches Recht': 0.25,
  Strafrecht: 0.15,
}

const LEARNING_STRATEGIES = [
  { value: 'blocks', label: 'Blocklernen', description: 'Themen eines Rechtsgebiets werden zusammenhängend gelernt (z.B. alle BGB AT Themen hintereinander). Ideal für tiefes Verständnis.' },
  { value: 'sprint', label: 'Sprint', description: 'Schwierige Themen werden früh priorisiert. Höhere Konzentration auf Ihre Schwächen. Kompaktere, intensive Lernphasen.' },
  { value: 'mixed', label: 'Durchmischt', description: 'Rechtsgebiete werden abwechselnd gelernt (z.B. Tag 1: Zivilrecht, Tag 2: Strafrecht, Tag 3: Öffentliches Recht). Fördert Wissenstransfer.' },
]

type PlanFormState = {
  planTitle: string
  dayCount: number
  startDate: string
  city: string
  selectedWeekdays: WeekdayKey[]
  strategy: string
  repetitionCount: number
  repetitionMode: 'sequential' | 'blocked' | 'intelligent'
  repEnabled: boolean
  repDays: WeekdayKey[]
  repStartDate: string
  repPlanProvided: boolean
  weights: Record<string, number>
  topicsPerWeekday: Record<WeekdayKey, number>
}

type PlanResponse = {
  prompt: string
  raw: string
}

type SelectedTopic = {
  id: string
  legal_area: string
  sub_area: string
  topic_description: string
  checked: boolean
}

type TopicsResponse = {
  topics: Omit<SelectedTopic, 'checked'>[]
  reasoning?: string
}

type ErrorState = {
  message: string
  details?: unknown
}

type WorkflowPhase = 'form' | 'review' | 'topics' | 'export'

const initialState: PlanFormState = {
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
}

function App() {
  const [formState, setFormState] = useState<PlanFormState>(initialState)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepError, setStepError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<ErrorState | null>(null)
  const [result, setResult] = useState<PlanResponse | null>(null)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectWeight, setNewSubjectWeight] = useState(0.1)

  // Neue States für den Workflow
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>('form')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<SelectedTopic[]>([])
  const [isLoadingTopics, setIsLoadingTopics] = useState(false)

  const weakSubjectEntries = useMemo(() => Object.entries(formState.weights), [formState.weights])

  const handleTextChange = (key: keyof PlanFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const handleWeekdayToggle = (weekday: WeekdayKey) => {
    setFormState((prev) => {
      const alreadySelected = prev.selectedWeekdays.includes(weekday)
      const nextWeekdays = alreadySelected
        ? prev.selectedWeekdays.filter((item) => item !== weekday)
        : [...prev.selectedWeekdays, weekday]
      const nextRepDays = prev.repDays.filter((day) => nextWeekdays.includes(day))
      return {
        ...prev,
        selectedWeekdays: nextWeekdays,
        repDays: prev.repEnabled ? nextRepDays : [],
      }
    })
  }

  const handleRepToggle = () => {
    setFormState((prev) => ({
      ...prev,
      repEnabled: !prev.repEnabled,
      repDays: prev.repEnabled ? [] : prev.repDays,
    }))
  }

  const handleRepDayToggle = (weekday: WeekdayKey) => {
    setFormState((prev) => {
      const alreadySelected = prev.repDays.includes(weekday)
      const nextRepDays = alreadySelected ? prev.repDays.filter((item) => item !== weekday) : [...prev.repDays, weekday]
      return { ...prev, repDays: nextRepDays }
    })
  }

  const handleWeakSubjectChange = (subject: string, weight: number) => {
    setFormState((prev) => ({
      ...prev,
      weights: { ...prev.weights, [subject]: weight },
    }))
  }

  const handleRemoveWeakSubject = (subject: string) => {
    setFormState((prev) => {
      const nextSubjects = { ...prev.weights }
      delete nextSubjects[subject]
      return { ...prev, weights: nextSubjects }
    })
  }

  const handleAddWeakSubject = () => {
    const trimmedName = newSubjectName.trim()
    if (!trimmedName) {
      return
    }

    if (trimmedName in formState.weights) {
      setStepError('Das Rechtsgebiet existiert bereits. Bitte Namen anpassen.')
      return
    }

    setFormState((prev) => ({
      ...prev,
      weights: { ...prev.weights, [trimmedName]: newSubjectWeight },
    }))
    setNewSubjectName('')
    setNewSubjectWeight(0.1)
    setStepError(null)
  }

  const handleTopicsPerWeekdayChange = (weekday: WeekdayKey, topics: number) => {
    setFormState((prev) => ({
      ...prev,
      topicsPerWeekday: { ...prev.topicsPerWeekday, [weekday]: topics },
    }))
  }

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 0: {
        if (!formState.planTitle.trim()) {
          return 'Bitte einen Plan Titel eintragen.'
        }
        if (!formState.dayCount || formState.dayCount < 1 || formState.dayCount > 365) {
          return 'Anzahl Lerntage muss zwischen 1 und 365 liegen.'
        }
        if (!formState.startDate) {
          return 'Bitte ein Startdatum festlegen.'
        }
        if (!formState.city.trim()) {
          return 'Bitte eine Stadt eintragen.'
        }
        return null
      }
      case 1: {
        if (formState.selectedWeekdays.length === 0) {
          return 'Mindestens ein Wochentag muss ausgewählt sein.'
        }
        if (formState.repEnabled && formState.repDays.length === 0) {
          return 'Bei aktiviertem Repetitorium müssen entsprechende Tage gewählt werden.'
        }
        return null
      }
      case 2: {
        if (Object.keys(formState.weights).length === 0) {
          return 'Bitte mindestens ein Rechtsgebiet angeben.'
        }
        const topicsValues = Object.values(formState.topicsPerWeekday)
        if (topicsValues.some((topics) => topics < 0 || topics > 10)) {
          return 'Themen pro Wochentag müssen zwischen 0 und 10 liegen.'
        }
        if (!formState.strategy) {
          return 'Bitte eine Lernstrategie auswählen.'
        }
        return null
      }
      default:
        return null
    }
  }

  const goToStep = (target: number) => {
    if (target < 0 || target >= STEP_LABELS.length) {
      return
    }
    setCurrentStep(target)
    setStepError(null)
    setSubmitError(null)
  }

  const handleNext = () => {
    const validationMessage = validateStep(currentStep)
    if (validationMessage) {
      setStepError(validationMessage)
      return
    }
    setStepError(null)
    goToStep(currentStep + 1)
  }

  const handleBack = () => {
    goToStep(currentStep - 1)
  }

  const buildWeekdayRecord = () => {
    return Object.entries(formState.topicsPerWeekday).reduce<Record<string, number>>((acc, [key, value]) => {
      const label = WEEKDAY_LABEL_BY_KEY[key as WeekdayKey]
      acc[label] = value
      return acc
    }, {})
  }

  // Neue Funktion: "Angaben überprüfen" - zeigt Modal
  const handleReviewRequest = () => {
    for (let index = 0; index < STEP_LABELS.length; index += 1) {
      const validationMessage = validateStep(index)
      if (validationMessage) {
        setStepError(validationMessage)
        setSubmitError(null)
        goToStep(index)
        return
      }
    }
    setShowReviewModal(true)
    setWorkflowPhase('review')
  }

  // Neue Funktion: Nach Bestätigung im Modal - Backend triggern
  const handleConfirmReview = async () => {
    setShowReviewModal(false)
    setIsLoadingTopics(true)
    setSubmitError(null)

    const weekdays = formState.selectedWeekdays.map((weekday) => WEEKDAY_LABEL_BY_KEY[weekday])
    const repDays = formState.repEnabled ? formState.repDays.map((weekday) => WEEKDAY_LABEL_BY_KEY[weekday]) : []
    const topicsPerWeekday = buildWeekdayRecord()
    const weights = Object.entries(formState.weights).map(([legalArea, weight]) => ({ legalArea, weight }))

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
    }

    const topicsUrl = buildApiUrl('/api/topics/select')
    console.log('[FRONTEND] Sending topics selection request to:', topicsUrl)
    console.log('[FRONTEND] Payload:', payload)

    try {
      const response = await fetch(topicsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('[FRONTEND] Response status:', response.status, response.statusText)

      if (!response.ok) {
        const problem = await response.json().catch(() => null)
        console.error('[FRONTEND] Error response:', problem)
        const message = problem?.message || 'Unbekannter Fehler beim Laden der Themen.'
        setSubmitError({
          message,
          details: problem?.issues,
        })
        return
      }

      const data: TopicsResponse = await response.json()
      console.log('[FRONTEND] Success! Received topics:', data.topics.length)

      // Themen mit checked=true initialisieren
      const topicsWithCheckState = data.topics.map((topic, index) => ({
        ...topic,
        id: `topic-${index}`,
        checked: true,
      }))

      setSelectedTopics(topicsWithCheckState)
      setWorkflowPhase('topics')
      setSubmitError(null)
    } catch (error) {
      console.error('[FRONTEND] Exception:', error)
      const errorMessage = (error as Error).message || 'Unbekannter Fehler beim Laden der Themen.'
      setSubmitError({
        message: errorMessage.includes('Failed to fetch')
          ? 'Verbindung zum Server fehlgeschlagen. Ist der Backend-Server erreichbar?'
          : errorMessage,
      })
    } finally {
      setIsLoadingTopics(false)
    }
  }

  // Neue Funktion: Topic abhaken/an
  const handleToggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.map((topic) => (topic.id === id ? { ...topic, checked: !topic.checked } : topic))
    )
  }

  // Neue Funktion: CSV Export
  const handleExportCSV = () => {
    const checkedTopics = selectedTopics.filter((topic) => topic.checked)

    if (checkedTopics.length === 0) {
      setSubmitError({ message: 'Bitte wählen Sie mindestens ein Thema aus.' })
      return
    }

    // CSV Header
    const csvHeader = 'Rechtsgebiet,Unterbereich,Themenbeschreibung\n'

    // CSV Rows
    const csvRows = checkedTopics
      .map((topic) => {
        const legal = topic.legal_area.replace(/"/g, '""')
        const sub = topic.sub_area.replace(/"/g, '""')
        const desc = topic.topic_description.replace(/"/g, '""')
        return `"${legal}","${sub}","${desc}"`
      })
      .join('\n')

    const csvContent = csvHeader + csvRows

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lernplan_themen_${formState.planTitle.trim() || 'export'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setWorkflowPhase('export')
    console.log('[FRONTEND] CSV export completed:', checkedTopics.length, 'topics')
  }

  const handleSubmit = async () => {
    for (let index = 0; index < STEP_LABELS.length; index += 1) {
      const validationMessage = validateStep(index)
      if (validationMessage) {
        setStepError(validationMessage)
        setSubmitError(null)
        goToStep(index)
        return
      }
    }

    const weekdays = formState.selectedWeekdays.map((weekday) => WEEKDAY_LABEL_BY_KEY[weekday])
    const repDays = formState.repEnabled ? formState.repDays.map((weekday) => WEEKDAY_LABEL_BY_KEY[weekday]) : []
    const topicsPerWeekday = buildWeekdayRecord()
    const weights = Object.entries(formState.weights).map(([legalArea, weight]) => ({ legalArea, weight }))

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
    }

    setSubmitError(null)
    const planUrl = buildApiUrl('/api/plan')
    console.log('[FRONTEND] Sending request to:', planUrl)
    console.log('[FRONTEND] Payload:', payload)

    try {
      const response = await fetch(planUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('[FRONTEND] Response status:', response.status, response.statusText)

      if (!response.ok) {
        const problem = await response.json().catch(() => null)
        console.error('[FRONTEND] Error response:', problem)
        const message = problem?.message || 'Unbekannter Fehler beim Generieren.'
        setSubmitError({
          message,
          details: problem?.issues,
        })
        setResult(null)
        return
      }

      const data: PlanResponse = await response.json()
      console.log('[FRONTEND] Success! Received prompt and LLM answer.')
      setResult(data)
      setSubmitError(null)
    } catch (error) {
      console.error('[FRONTEND] Exception:', error)
      const errorMessage = (error as Error).message || 'Unbekannter Fehler bei der Generierung.'
      setSubmitError({
        message: errorMessage.includes('Failed to fetch')
          ? 'Verbindung zum Server fehlgeschlagen. Ist der Backend-Server erreichbar?'
          : errorMessage,
      })
      setResult(null)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="form-grid">
            <label className="form-field">
              <span>Plan Titel</span>
              <input
                type="text"
                value={formState.planTitle}
                onChange={handleTextChange('planTitle')}
                placeholder="Mein individueller Lernplan"
              />
              <small className="field-hint">
                Gib deinem Lernplan einen Namen. Die passende Vorlage wird automatisch im Hintergrund geladen.
              </small>
            </label>

            <label className="form-field">
              <span>Anzahl Lerntage</span>
              <input
                type="number"
                min="1"
                max="365"
                value={formState.dayCount}
                onChange={(event) => setFormState((prev) => ({ ...prev, dayCount: Number(event.target.value) }))}
              />
              <small className="field-hint">
                Wie viele Tage soll Ihr Lernplan umfassen? (1-365). Die Anzahl der Themen pro Wochentag legen Sie später fest.
              </small>
            </label>

            <label className="form-field">
              <span>Startdatum</span>
              <input type="date" value={formState.startDate} onChange={handleTextChange('startDate')} />
            </label>

            <label className="form-field">
              <span>Stadt</span>
              <input
                type="text"
                value={formState.city}
                onChange={handleTextChange('city')}
                placeholder="Frankfurt am Main"
              />
            </label>
          </div>
        )
      case 1:
        return (
          <div className="form-grid">
            <fieldset className="form-field">
              <legend>Verfügbare Wochentage</legend>
              <div className="weekdays">
                {WEEKDAYS.map((weekday) => (
                  <label key={weekday.key} className="checkbox">
                    <input
                      type="checkbox"
                      checked={formState.selectedWeekdays.includes(weekday.key)}
                      onChange={() => handleWeekdayToggle(weekday.key)}
                    />
                    <span>{weekday.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-field">
              <span>Wiederholungen</span>
              <div className="number-row">
                <label>
                  <span>Anzahl Wiederholungen (1-4)</span>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={formState.repetitionCount}
                    onChange={(event) => setFormState((prev) => ({ ...prev, repetitionCount: Number(event.target.value) }))}
                  />
                </label>
                <label>
                  <span>Wiederholungsmodus</span>
                  <select
                    value={formState.repetitionMode}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, repetitionMode: event.target.value as PlanFormState['repetitionMode'] }))
                    }
                  >
                    <option value="sequential">Sequential (A,B,C → A,B,C)</option>
                    <option value="blocked">Blocked (A,A,A → B,B,B)</option>
                    <option value="intelligent">Intelligent (LLM optimiert)</option>
                  </select>
                </label>
              </div>
              <small className="field-hint">Wie oft soll jedes Thema wiederholt werden, und in welchem Muster?</small>
            </div>

            <fieldset className="form-field">
              <legend>Repetitorium</legend>
              <label className="checkbox">
                <input type="checkbox" checked={formState.repEnabled} onChange={handleRepToggle} />
                <span>Repetitorium aktivieren</span>
              </label>
              {formState.repEnabled && (
                <>
                  <label className="form-field">
                    <span>Rep-Startdatum (optional)</span>
                    <input type="date" value={formState.repStartDate} onChange={handleTextChange('repStartDate')} />
                  </label>

                  <div className="weekdays">
                    {WEEKDAYS.map((weekday) => (
                      <label key={weekday.key} className="checkbox">
                        <input
                          type="checkbox"
                          checked={formState.repDays.includes(weekday.key)}
                          onChange={() => handleRepDayToggle(weekday.key)}
                          disabled={!formState.selectedWeekdays.includes(weekday.key)}
                        />
                        <span>
                          {weekday.label}
                          {!formState.selectedWeekdays.includes(weekday.key) && ' (kein Lerntag)'}
                        </span>
                      </label>
                    ))}
                  </div>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={formState.repPlanProvided}
                      onChange={() =>
                        setFormState((prev) => ({ ...prev, repPlanProvided: !prev.repPlanProvided }))
                      }
                    />
                    <span>Eigener Repetitoriumsplan vorhanden</span>
                  </label>
                </>
              )}
            </fieldset>
          </div>
        )
      case 2:
        return (
          <div className="form-grid">
            <fieldset className="form-field">
              <legend>Rechtsgebiete & Gewichtung</legend>
              <div className="weak-subjects">
                {weakSubjectEntries.map(([subject, weight]) => (
                  <div key={subject} className="weak-subject-row">
                    <div className="weak-subject-label">
                      <span>{subject}</span>
                      <strong>{(weight * 100).toFixed(0)}%</strong>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weight}
                      onChange={(event) => handleWeakSubjectChange(subject, Number(event.target.value))}
                    />
                    <button type="button" className="ghost-button" onClick={() => handleRemoveWeakSubject(subject)}>
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>

              <div className="weak-subject-add">
                <input
                  type="text"
                  placeholder="Neues Rechtsgebiet"
                  value={newSubjectName}
                  onChange={(event) => setNewSubjectName(event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={newSubjectWeight}
                  onChange={(event) => setNewSubjectWeight(Number(event.target.value))}
                />
                <button type="button" onClick={handleAddWeakSubject}>
                  Hinzufügen
                </button>
              </div>
            </fieldset>

            <fieldset className="form-field">
              <legend>Themen pro Wochentag</legend>
              <div className="topics-grid">
                {WEEKDAYS.map((weekday) => (
                  <label key={weekday.key}>
                    <span>{weekday.label}</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formState.topicsPerWeekday[weekday.key]}
                      onChange={(event) => handleTopicsPerWeekdayChange(weekday.key, Number(event.target.value))}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="form-field">
              <span>Lernstrategie</span>
              <select
                value={formState.strategy}
                onChange={(event) => setFormState((prev) => ({ ...prev, strategy: event.target.value }))}
              >
                <option value="">-- Bitte wählen --</option>
                {LEARNING_STRATEGIES.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
              {formState.strategy && (
                <small className="info-hint">
                  {LEARNING_STRATEGIES.find((item) => item.value === formState.strategy)?.description}
                </small>
              )}
              <small className="field-hint">Wählen Sie, wie die Themen über den Zeitraum verteilt werden sollen.</small>
            </label>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="app-shell">
      <header className="header">
        <h1>Lernplan Generator</h1>
        <p>
          Dieses Frontend führt dich Schritt für Schritt durch die Eingaben für <code>POST /api/plan</code>. Die Planung bleibt dem LLM überlassen –
          hier sammelst du nur die benötigten Parameter.
        </p>
      </header>

      <section className="wizard">
        <ol className="step-indicator">
          {STEP_LABELS.map((label, index) => (
            <li key={label} className={index === currentStep ? 'active-step' : index < currentStep ? 'done-step' : ''}>
              <span className="step-index">{index + 1}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <form
          className="wizard-card"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit().catch(() => {
              /* Fehler werden bereits im State abgefangen */
            })
          }}
        >
          {renderStepContent()}

          {stepError && <p className="error-hint">{stepError}</p>}

          <div className="action-row">
            <button type="button" onClick={handleBack} disabled={currentStep === 0}>
              Zurück
            </button>
            {currentStep < STEP_LABELS.length - 1 ? (
              <button type="button" onClick={handleNext}>
                Weiter
              </button>
            ) : (
              <button type="button" onClick={handleReviewRequest} disabled={isLoadingTopics}>
                {isLoadingTopics ? 'Lade Themen …' : 'Angaben überprüfen'}
              </button>
            )}
          </div>
        </form>

        {submitError ? (
          <div className="error-box">
            <h4>❌ Fehler</h4>
            <p className="error-hint">{submitError.message}</p>
            {Boolean(submitError.details) && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Details anzeigen</summary>
                <pre style={{ fontSize: '12px', marginTop: '8px', overflow: 'auto' }}>
                  {JSON.stringify(submitError.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ) : null}
      </section>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Ihre Angaben im Überblick</h2>
            <div className="review-summary">
              <div className="review-item">
                <strong>Plan Titel:</strong>
                <span>{formState.planTitle}</span>
              </div>
              <div className="review-item">
                <strong>Zeitraum:</strong>
                <span>{formState.dayCount} Tage (Start: {formState.startDate})</span>
              </div>
              <div className="review-item">
                <strong>Stadt:</strong>
                <span>{formState.city}</span>
              </div>
              <div className="review-item">
                <strong>Lerntage:</strong>
                <span>{formState.selectedWeekdays.map((day) => WEEKDAY_LABEL_BY_KEY[day]).join(', ')}</span>
              </div>
              <div className="review-item">
                <strong>Lernstrategie:</strong>
                <span>{LEARNING_STRATEGIES.find((s) => s.value === formState.strategy)?.label || formState.strategy}</span>
              </div>
              <div className="review-item">
                <strong>Rechtsgebiete:</strong>
                <div className="review-subjects">
                  {Object.entries(formState.weights).map(([subject, weight]) => (
                    <div key={subject}>
                      {subject}: {(weight * 100).toFixed(0)}%
                    </div>
                  ))}
                </div>
              </div>
              {formState.repEnabled && (
                <div className="review-item">
                  <strong>Repetitorium:</strong>
                  <span>Aktiviert ({formState.repDays.map((day) => WEEKDAY_LABEL_BY_KEY[day]).join(', ')})</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setShowReviewModal(false)}>
                Zurück zur Bearbeitung
              </button>
              <button type="button" onClick={handleConfirmReview}>
                Bestätigen & Themen laden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topics Section */}
      {workflowPhase === 'topics' && selectedTopics.length > 0 && (
        <section className="result-section">
          <h2>Ausgewählte Themen ({selectedTopics.filter((t) => t.checked).length} von {selectedTopics.length})</h2>
          <p className="field-hint">
            Das LLM hat basierend auf Ihren Angaben folgende Themen ausgewählt. Sie können diese Liste noch anpassen.
          </p>
          <div className="topics-list">
            {selectedTopics.map((topic) => (
              <label key={topic.id} className="topic-item">
                <input
                  type="checkbox"
                  checked={topic.checked}
                  onChange={() => handleToggleTopic(topic.id)}
                />
                <div className="topic-content">
                  <div className="topic-header">
                    <strong>{topic.legal_area}</strong>
                    <span className="topic-subarea">{topic.sub_area}</span>
                  </div>
                  <div className="topic-description">{topic.topic_description}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="action-row">
            <button type="button" className="ghost-button" onClick={() => setWorkflowPhase('form')}>
              Zurück zum Formular
            </button>
            <button type="button" onClick={handleExportCSV}>
              CSV exportieren ({selectedTopics.filter((t) => t.checked).length} Themen)
            </button>
          </div>
        </section>
      )}

      {/* Success Message after Export */}
      {workflowPhase === 'export' && (
        <section className="result-section">
          <h2>✅ Export erfolgreich</h2>
          <p>Die CSV-Datei wurde erfolgreich heruntergeladen.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Neuen Plan erstellen
          </button>
        </section>
      )}

      {result ? (
        <section className="result-section">
          <h2>Ergebnis</h2>
          <div className="result-card">
            <div>
              <h3>Prompt</h3>
              <pre className="result-pre">{result.prompt}</pre>
            </div>
            <div>
              <h3>Antwort</h3>
              <pre className="result-pre">{result.raw}</pre>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default App
