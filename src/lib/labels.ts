// Read annotations (eval results or human labels) back out of Phoenix.
import { getSpanAnnotations } from "@arizeai/phoenix-client/spans";

export type Label = { label?: string | null; score?: number | null; explanation?: string | null };

export async function getLabels(
  projectName: string,
  spanIds: string[],
  name: string,
): Promise<Map<string, Label>> {
  const labels = new Map<string, Label>();
  if (spanIds.length === 0) return labels;
  const { annotations } = await getSpanAnnotations({
    project: { projectName },
    spanIds,
    includeAnnotationNames: [name],
    limit: 1000,
  });
  for (const a of annotations) {
    labels.set(a.span_id, {
      label: a.result?.label,
      score: a.result?.score,
      explanation: a.result?.explanation,
    });
  }
  return labels;
}
