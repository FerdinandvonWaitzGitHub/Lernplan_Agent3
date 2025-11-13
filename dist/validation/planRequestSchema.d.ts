import { z } from 'zod';
export declare const legalAreaSchema: z.ZodObject<{
    legalArea: z.ZodString;
    weight: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    legalArea: string;
    weight: number;
}, {
    legalArea: string;
    weight: number;
}>;
export declare const planRequestSchema: z.ZodObject<{
    planTitle: z.ZodString;
    dayCount: z.ZodNumber;
    startDate: z.ZodString;
    city: z.ZodString;
    weekdays: z.ZodArray<z.ZodEnum<["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]>, "many">;
    repetitionCount: z.ZodNumber;
    repetitionMode: z.ZodString;
    repEnabled: z.ZodBoolean;
    repStartDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    repDays: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]>, "many">>>;
    repPlanProvided: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    weights: z.ZodArray<z.ZodObject<{
        legalArea: z.ZodString;
        weight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        legalArea: string;
        weight: number;
    }, {
        legalArea: string;
        weight: number;
    }>, "many">;
    topicsPerWeekday: z.ZodRecord<z.ZodEnum<["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]>, z.ZodNumber>;
    strategy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    planTitle: string;
    dayCount: number;
    startDate: string;
    city: string;
    weekdays: ("Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag" | "Samstag" | "Sonntag")[];
    repetitionCount: number;
    repetitionMode: string;
    repEnabled: boolean;
    repDays: ("Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag" | "Samstag" | "Sonntag")[];
    repPlanProvided: boolean;
    weights: {
        legalArea: string;
        weight: number;
    }[];
    topicsPerWeekday: Partial<Record<"Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag" | "Samstag" | "Sonntag", number>>;
    strategy: string;
    repStartDate?: string | null | undefined;
}, {
    planTitle: string;
    dayCount: number;
    startDate: string;
    city: string;
    weekdays: ("Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag" | "Samstag" | "Sonntag")[];
    repetitionCount: number;
    repetitionMode: string;
    repEnabled: boolean;
    weights: {
        legalArea: string;
        weight: number;
    }[];
    topicsPerWeekday: Partial<Record<"Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag" | "Samstag" | "Sonntag", number>>;
    strategy: string;
    repStartDate?: string | null | undefined;
    repDays?: ("Montag" | "Dienstag" | "Mittwoch" | "Donnerstag" | "Freitag" | "Samstag" | "Sonntag")[] | undefined;
    repPlanProvided?: boolean | undefined;
}>;
export type PlanRequestPayload = z.infer<typeof planRequestSchema>;
//# sourceMappingURL=planRequestSchema.d.ts.map