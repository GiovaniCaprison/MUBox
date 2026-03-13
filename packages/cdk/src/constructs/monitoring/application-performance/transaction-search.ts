import { PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { ResourcePolicy } from "aws-cdk-lib/aws-logs";
import { CfnTransactionSearchConfig } from "aws-cdk-lib/aws-xray";
import { Stack } from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * Enables Transaction Search for this AWS account.
 */
export class TransactionSearch extends CfnTransactionSearchConfig {
  constructor(scope: Construct) {
    const { account, region } = Stack.of(scope);

    /**
     * Grants transaction search permissions to the appropriate CloudWatch logs.
     *
     * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Transaction-Search-Cloudformation.html
     */
    const transactionSearchResourcePolicy = new ResourcePolicy(scope, "TransactionSearchResourcePolicy", {
      resourcePolicyName: "TransactionSearchAccess",
      policyStatements: [
        new PolicyStatement({
          sid: "TransactionSearchXRayAccess",
          principals: [new ServicePrincipal("xray.amazonaws.com")],
          actions: ["logs:PutLogEvents"],
          resources: [
            `arn:aws:logs:${region}:${account}:log-group:aws/spans:*`,
            `arn:aws:logs:${region}:${account}:log-group:/aws/application-signals/data:*`,
          ],
          conditions: {
            ArnLike: {
              "aws:SourceArn": `arn:aws:xray:${region}:${account}:*`,
            },
            StringEquals: {
              "aws:SourceAccount": account,
            },
          },
        }),
      ],
    });

    super(scope, "TransactionSearch", {
      indexingPercentage: 100, // Indexes all spans
    });

    // Ensures we only attempt to setup the transaction search after granting permissions.
    this.node.addDependency(transactionSearchResourcePolicy);
  }
}
