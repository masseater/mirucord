import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { ChannelScene } from "#/pages/home/ui/common/channel-scene";

import { ClientFrame } from "./client/client-frame";
import { Hero } from "./hero/hero";
import { SCENES } from "./scenes";

export const HomePage = (): ReactNode => (
  <ClientFrame>
    <Hero />
    {pipe(
      SCENES,
      Array.map((scene) => <ChannelScene key={scene.channel.id} scene={scene} />),
    )}
  </ClientFrame>
);
