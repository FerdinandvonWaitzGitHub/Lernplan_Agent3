import { z } from 'zod';

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;

export const legalAreaSchema = z.object({
    legalArea: z.string().min(1, 'Rechtsgebiet darf nicht leer sein.'),
    weight: z.number().min(0).max(1)
});

export const planRequestSchema = z.object({
    planTitle: z.string().min(3),
    dayCount: z.number().int().min(1).max(365),
    startDate: z.string().min(4),
    city: z.string().min(2),
    weekdays: z.array(z.enum(WEEKDAYS)).min(1),
    repetitionCount: z.number().int().min(1).max(4),
    repetitionMode: z.string().min(1),
    repEnabled: z.boolean(),
    repStartDate: z.string().nullable().optional(),
    repDays: z.array(z.enum(WEEKDAYS)).optional().default([]),
    repPlanProvided: z.boolean().optional().default(false),
    weights: z.array(legalAreaSchema).min(1),
    topicsPerWeekday: z.record(z.enum(WEEKDAYS), z.number().int().min(0).max(10)),
    strategy: z.string().min(1)
});

export type PlanRequestPayload = z.infer<typeof planRequestSchema>;
