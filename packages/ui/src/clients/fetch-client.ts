/**
 * Adds the provided header to the existing headers.
 */
const addHeader = (name: string, value: string, existingHeaders: HeadersInit | undefined): HeadersInit => {
  if (!existingHeaders) {
    return { [name]: value };
  }

  if (existingHeaders instanceof Headers) {
    existingHeaders.append(name, value);
  } else if (Array.isArray(existingHeaders)) {
    existingHeaders.push([name, value]);
  } else {
    existingHeaders[name] = value;
  }

  return existingHeaders;
};

/**
 * Generates a hex encoded SHA-256 hash of the provided string.
 */
const getSha256Hash = async (str: string): Promise<string> => {
  const encodedString = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedString);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * Gets the appropriate headers for the given options which includes automatically adding the appropriate `x-amz-content-sha256` header which is
 * required for CloudFront OAC for Lambda Function URL's.
 */
const getHeaders = async (options?: RequestInit): Promise<HeadersInit | undefined> => {
  if (!options) {
    return undefined;
  }

  if (options.body) {
    if (typeof options.body !== "string") {
      throw new Error("The fetch helper for this website does not support body types other than strings");
    }

    // Lambda Function URLs with CloudFront OAC require a hash of the body https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html
    const bodyHash = await getSha256Hash(options.body);
    return addHeader("x-amz-content-sha256", bodyHash, options.headers);
  } else {
    return options.headers;
  }
};

/**
 * A fetch client which includes the Addition of the `x-amz-content-sha256` header
 * which is required for CloudFront OAC for Lambda Function URL's.
 */
export const fetch = async (request: RequestInfo | URL, options?: RequestInit): Promise<Response> =>
  window.fetch(request, {
    ...options,
    credentials: "same-origin",
    headers: await getHeaders(options),
  });
