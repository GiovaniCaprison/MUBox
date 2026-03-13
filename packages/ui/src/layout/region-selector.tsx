import Select, { type SelectProps } from "@cloudscape-design/components/select";
import { REGIONS, type Region, type RegionId } from "@mubox/local-shared";
import { useContext, type FunctionComponent } from "react";

import { RegionContext } from "@/providers/region-provider";

export const RegionSelector: FunctionComponent = () => {
  const { region, setRegion } = useContext(RegionContext);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This will always produce a match.
  const fullRegion = REGIONS.find(({ id }) => region === id)!;

  const regionToOptions = ({ id, name }: Region): SelectProps.Option => ({ description: id, label: name, value: id });

  return (
    <Select
      selectedOption={regionToOptions(fullRegion)}
      onChange={({ detail }) => setRegion(detail.selectedOption.value as RegionId)}
      options={REGIONS.toReversed().map(regionToOptions)}
      triggerVariant="option"
    />
  );
};
