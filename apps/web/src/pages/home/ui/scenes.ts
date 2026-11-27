import type { Scene } from "#/pages/home/ui/common/scene";

import { FAQ_SCENE } from "./faq/faq-scene";
import { FEATURES_SCENE } from "./features/features-scene";
import { FLOW_SCENE } from "./flow/flow-scene";
import { FORUM_SCENE } from "./forum/forum-scene";
import { PROBLEM_SCENE } from "./problem/problem-scene";
import { SAFETY_SCENE } from "./safety/safety-scene";
import { STEPS_SCENE } from "./steps/steps-scene";

export const SCENES: readonly Scene[] = [
  PROBLEM_SCENE,
  FORUM_SCENE,
  FLOW_SCENE,
  FEATURES_SCENE,
  STEPS_SCENE,
  SAFETY_SCENE,
  FAQ_SCENE,
];
