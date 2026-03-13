import { REGIONS } from "@mubox/local-shared";
import { type FunctionComponent, type ReactNode, createContext, useState } from "react";

import { queryClient } from "@/clients/query-client";

const REGION_KEY_IN_LOCAL_STORAGE = "Region";

const VALID_REGIONS = REGIONS.map(({ id }) => id);
type ValidRegion = (typeof VALID_REGIONS)[number];

const isValidRegion = (region: string): region is ValidRegion => VALID_REGIONS.includes(region as ValidRegion);

/**
 * Default to the last known deployed region which is intended as the most used.
 */
const DEFAULT_REGION = REGIONS[REGIONS.length - 1].id;

const initialState = {
  region: DEFAULT_REGION,
  setRegion: (newRegion: ValidRegion): void => {}, // eslint-disable-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
};

export const RegionContext = createContext(initialState);

interface Props {
  readonly children: ReactNode;
}

export const RegionProvider: FunctionComponent<Props> = ({ children }) => {
  const regionFromLocalStorage: string | null = localStorage.getItem(REGION_KEY_IN_LOCAL_STORAGE);

  const [region, setRegionInState] = useState(
    regionFromLocalStorage && isValidRegion(regionFromLocalStorage) ? regionFromLocalStorage : DEFAULT_REGION,
  );

  // Sets the region both in local storage and in the state
  const setRegion = (newRegion: ValidRegion): void => {
    localStorage.setItem(REGION_KEY_IN_LOCAL_STORAGE, newRegion);
    setRegionInState(newRegion);

    // Clear all cached queries to ensure that all requests are re-dispatched in the new region
    queryClient.clear();
  };

  return <RegionContext.Provider value={{ region, setRegion }}>{children}</RegionContext.Provider>;
};
