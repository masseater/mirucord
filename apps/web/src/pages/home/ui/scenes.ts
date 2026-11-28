import type { Scene } from "#/pages/home/ui/common/scene";

import { FAQ_SCENE } from "./faq/faq-scene.tsx";
import { FEATURES_SCENE } from "./features/features-scene.tsx";
import { FLOW_SCENE } from "./flow/flow-scene.tsx";
import { FORUM_SCENE } from "./forum/forum-scene.tsx";
import { PROBLEM_SCENE } from "./problem/problem-scene.tsx";
import { SAFETY_SCENE } from "./safety/safety-scene.tsx";
import { STEPS_SCENE } from "./steps/steps-scene.tsx";

export const SCENES: readonly Scene[] = [
  PROBLEM_SCENE,
  FORUM_SCENE,
  FLOW_SCENE,
  FEATURES_SCENE,
  STEPS_SCENE,
  SAFETY_SCENE,
  FAQ_SCENE,
];
