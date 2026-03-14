import type { DomainConfiguration, StageConfiguration } from "../types";

const ROOT_DOMAIN_NAME = `mu-box.com`;

/**
 * The ID of the Route 53 hosted zone that was automatically created when the mu-box.com domain
 * was registered in the prod account.
 *
 * Committing a hosted zone ID publicly is generally not considered sensitive.
 * Since Terraform modules became popular we actually see it a lot in public IAC.
 */
const PROD_HOSTED_ZONE_ID = "Z00113732G58CLYO4QZQX";

export const DOMAINS: StageConfiguration<DomainConfiguration> = {
  BETA: { domainName: `beta.${ROOT_DOMAIN_NAME}`, hasRoute53HostedZoneBeenDelegatedTo: true },
  PROD: { domainName: ROOT_DOMAIN_NAME, hasRoute53HostedZoneBeenDelegatedTo: true, existingHostedZoneId: PROD_HOSTED_ZONE_ID },
};
