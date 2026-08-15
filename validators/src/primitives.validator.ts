import * as z from "zod";

export const nonEmptyString = z.string().trim().min(1, { error: "This field cannot be empty" });

export const nonNegativeNumber = z.number().nonnegative({ error: "Value must be 0 or greater" });
