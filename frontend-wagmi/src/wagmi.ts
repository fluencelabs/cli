import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { dar, kras } from "./chains";

export const config = getDefaultConfig({
  appName: "cli frontend",
  projectId: "YOUR_PROJECT_ID",
  chains: [kras, dar],
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
