import { createContext } from "react";
import type { Route } from "../types";

export const RouterContext = createContext<{
  campaignId: string | null;
  navigate: (route: Route) => void;
}>({ campaignId: null, navigate: () => {} });
