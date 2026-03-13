/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-non-null-assertion */
import { fromIni } from "@aws-sdk/credential-providers";
import type { Context, LambdaFunctionURLEventWithIAMAuthorizer } from "aws-lambda";
import { IncomingMessage, createServer } from "node:http";

const uiLocalHost = "http://localhost:3000";

const userId: string = process.env.USER!;

const getBody = async (request: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    const bodyParts: Buffer[] = [];
    request
      .on("data", (chunk: Buffer) => {
        bodyParts.push(chunk);
      })
      .on("end", () => {
        const body = Buffer.concat(bodyParts).toString();
        resolve(body);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

createServer(async (req, res) => {
  // Sets up for CORS between UI and API running locally
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Origin", uiLocalHost);

  // Sets up the process to mimic running in Lambda
  const { accessKeyId, secretAccessKey, sessionToken } = await fromIni({ profile: "MUBox-Beta" })();
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_ACCESS_KEY_ID = accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
  process.env.AWS_SESSION_TOKEN = sessionToken;
  // TODO: All devs replace with your RUM App Monitor ID from the AWS Console (CloudWatch > RUM)
  process.env.RUM_APP_MONITOR_ID = process.env.RUM_APP_MONITOR_ID ?? "MY_RUM_APP_MONITOR_ID";
  process.env.RUM_LOG_GROUP_NAME = "RumLogs";

  const body = await getBody(req);
  const fullPath = req.url ?? "/";
  const url = new URL(fullPath, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": uiLocalHost,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    });
    res.end();
  } else {
    // Note this is imported here to allow environment variables to be set before loading the handler.
    const { handler } = await import("../src");

    const handlerResponse = await handler(
      {
        body,
        // Pass through all the headers in case new headers are added as part of the application implementation
        headers: {
          ...req.headers,
          ["x-authenticated-user"]: userId,
        },
        requestContext: { http: { method: req.method!, path } },
        rawPath: path,
        rawQueryString: url.search.slice("?".length),
        routeKey: path,
        version: "2.0",
      } as unknown as LambdaFunctionURLEventWithIAMAuthorizer,
      undefined as unknown as Context,
    );

    res.writeHead(handlerResponse.statusCode!, { "Content-Type": "application/json" });
    res.write(handlerResponse.body);
    res.end();
  }
}).listen(8080);
