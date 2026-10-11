import {
  createCorrectnessEvaluator,
  createFaithfulnessEvaluator,
} from "@arizeai/phoenix-evals";
import { judge, telemetry } from "./judge.js";

// Built-in evals: no rubric to write.
export const correctness = createCorrectnessEvaluator({ model: judge, telemetry });
export const faithfulness = createFaithfulnessEvaluator({ model: judge, telemetry });
