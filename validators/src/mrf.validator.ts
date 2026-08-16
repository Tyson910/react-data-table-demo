import * as z from "zod";

export const mrfMetaFieldsSchema = z.object({
  reporting_entity_name: z.string().catch(""),
  plan_name: z.string().catch(""),
  plan_id: z.string().catch(""),
  last_updated_on: z.string().catch(""),
});
