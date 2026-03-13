/**
 * Domain configuration options.
 */
export interface DomainConfiguration {
  /**
   * The domain name.
   *
   * @example 'mu-box.com'
   */
  readonly domainName: string;

  /**
   * Whether or not the Route53 hosted zone that is hosting this domain has been delegated to or not.
   *
   * For new zones (e.g. beta subdomains) this controls whether cross-account delegation has
   * already been performed. For imported zones this is always considered true.
   */
  readonly hasRoute53HostedZoneBeenDelegatedTo: boolean;

  /**
   * The ID of an existing Route 53 hosted zone to import rather than create.
   *
   * We use this when the domain/hosted zone was created outside of CDK
   * (i.e., the mu-box.com domain registered directly in the prod account).
   * When set, CDK will import the zone instead of creating a new one.
   */
  readonly existingHostedZoneId?: string;
}
