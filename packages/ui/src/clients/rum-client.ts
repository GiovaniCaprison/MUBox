import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types";
import type { HttpHandler } from "@smithy/protocol-http";
import type { AwsRum } from "aws-rum-web";

import { fetch } from "./fetch-client";

const getRequestHandler = (endpoint: URL): HttpHandler => ({
  handle: async (httpRequest) => {
    const response = await fetch(endpoint, httpRequest);

    return { response: { statusCode: response.status, body: response.body, headers: {} } };
  },
  updateHttpClientConfig: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
  httpHandlerConfigs: () => ({}),
});

// eslint-disable-next-line import/no-mutable-exports -- We need to set this up in our client
export let rum: AwsRum;

export const setupRum = async (): Promise<void> => {
  const rumEndpoint = `${window.location.origin}/rum`;

  /**
   * Exclude our RUM endpoint from profiling given profiling the profiling endpoint will lead to a loop in requests.
   */
  const urlsToExclude = [new RegExp(rumEndpoint)];

  // Dynamic import to reduce bundle size
  const awsRumModule = await import("aws-rum-web");
  const dataPlaneClientModule = await import("aws-rum-web/dist/cjs/dispatch/DataPlaneClient");

  /**
   * We set our application id in the backend when proxying requests to RUM so no need to also set them here.
   */
  rum = new awsRumModule.AwsRum("MockAwsRumAppMonitorId", "1.0.0", "us-east-1", {
    allowCookies: true,
    // The default of 100 can periodically hit Lambda@Edge max payload size limits. This lowers the default to minimize the odds of this occurring.
    batchLimit: 10,
    clientBuilder: (endpoint: URL, region: string, credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider | undefined) =>
      new dataPlaneClientModule.DataPlaneClient({
        fetchRequestHandler: getRequestHandler(endpoint),
        beaconRequestHandler: getRequestHandler(endpoint),
        endpoint,
        region,
        credentials,
      }),
    enableXRay: true,
    endpoint: rumEndpoint,
    sessionSampleRate: 1,
    signing: false,
    telemetries: ["errors", ["http", { addXRayTraceIdHeader: true, recordAllRequests: true, urlsToExclude }], "performance"],
  });
};
