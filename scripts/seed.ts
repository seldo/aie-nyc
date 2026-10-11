// npm run seed: load pre-captured traces and human labels into their own
// Phoenix project, so you can follow along even if your own runs fail.
import "dotenv/config";
import { getSpans, logSpans, logSpanAnnotations } from "@arizeai/phoenix-client/spans";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

export const SEED_PROJECT = "phoenix-101-golden";

async function seed() {
  const endpoint = process.env.PHOENIX_ENDPOINT ?? "http://localhost:6006";
  const spans = JSON.parse(await readFile("data/seed/spans.json", "utf8"));
  const labels = JSON.parse(await readFile("data/seed/human-labels.json", "utf8"));

  // The annotation config lets you add human_actionable labels in the UI.
  const configRes = await fetch(`${endpoint}/v1/annotation_configs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "human_actionable",
      type: "CATEGORICAL",
      description: "A human's verdict: is this report actionable?",
      optimization_direction: "MAXIMIZE",
      values: [
        { label: "actionable", score: 1 },
        { label: "not actionable", score: 0 },
      ],
    }),
  });
  if (!configRes.ok && configRes.status !== 409 && configRes.status !== 400) {
    console.warn(`Couldn't create the human_actionable annotation config: HTTP ${configRes.status}`);
  }

  try {
    await logSpans({ project: { projectName: SEED_PROJECT }, spans });
    console.log(`Loaded ${spans.length} spans into ${SEED_PROJECT}.`);
  } catch (err) {
    if (!String(err).includes("duplicate")) throw err;
    console.log(`The seed traces are already in ${SEED_PROJECT}.`);
  }

  // Spans are ingested in the background: wait for them before labeling them.
  const rootCount = spans.filter((s: { parent_id: string | null }) => !s.parent_id).length;
  for (let tries = 0; ; tries++) {
    const found = await getSpans({ project: { projectName: SEED_PROJECT }, parentId: null, limit: 1000 })
      .then((r) => r.spans.length)
      .catch(() => 0);
    if (found >= rootCount) break;
    if (tries > 30) throw new Error("Timed out waiting for Phoenix to ingest the seed traces.");
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Attach the config to the seed project and to your own project, so the
  // human_actionable label shows up in the UI's "Annotate" panel for both.
  for (const project of [SEED_PROJECT, process.env.PHOENIX_PROJECT ?? "phoenix-101"]) {
    const res = await fetch(`${endpoint}/v1/projects/${project}/annotation_configs/human_actionable`, { method: "PUT" });
    if (!res.ok) console.warn(`Couldn't attach human_actionable to ${project} (HTTP ${res.status}). Run \`npm run check\` first.`);
  }

  await logSpanAnnotations({ spanAnnotations: labels, sync: true });
  console.log(`Loaded ${labels.length} human labels.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await seed();
