import { AccountRootPrincipal, PolicyDocument, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { CfnLogAnomalyDetector } from "aws-cdk-lib/aws-logs";
import { RemovalPolicy, Stack } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import { LogGroup } from "./log-group";

/**
 * Properties for the {@link LogGroupAnomalyDetector}.
 */
export interface LogGroupAnomalyDetectorProps {
  /**
   * The log group to add anomaly detection for.
   */
  readonly logGroup: LogGroup;
}

/**
 * Sets up anomaly detection for a log group including encryption of all the findings it produces.
 */
export class LogGroupAnomalyDetector extends CfnLogAnomalyDetector {
  /**
   * The key used to encrypt this log group.
   */
  public readonly encryptionKey: Key;

  public constructor(scope: Construct, id: string, { logGroup }: LogGroupAnomalyDetectorProps) {
    const name = `${logGroup.logGroupName}AnomalyDetector`;

    const { account, region } = Stack.of(scope);

    // The * should be the id of the anomaly detector, but its only available post creation of the detector causing a chicken and egg problem.
    const arn = `arn:aws:logs:${region}:${account}:anomaly-detector:*`;

    const logsServicePrincipal = new ServicePrincipal(`logs.${region}.amazonaws.com`);

    /**
     * The KMS encryption key to use for encryption of the findings of this anomaly detection.
     */
    const encryptionKey = new Key(scope, `${id}EncryptionKey`, {
      alias: `${id}EncryptionKey`,
      enableKeyRotation: true,
      description: `The encryption key for ${logGroup.logGroupName} anomaly detection findings.`,

      /**
       * Documentation on this policy https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/LogsAnomalyDetection-KMS.html
       */
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "EnableIAMUserPermissions",
            actions: ["kms:*"],
            principals: [new AccountRootPrincipal()], // Without this, we would never be able to update the key in the future
            resources: ["*"],
          }),
          new PolicyStatement({
            sid: "AllowCloudWatchLogsEncryption",
            actions: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*"],
            conditions: {
              StringEquals: { "aws:SourceAccount": account },
              StringLike: { "kms:EncryptionContext:aws:logs:arn": arn },
              ArnLike: { "aws:SourceArn": arn },
            },
            principals: [logsServicePrincipal],
            resources: ["*"],
          }),
          new PolicyStatement({
            sid: "AllowCloudWatchLogsDescribeKey",
            actions: ["kms:DescribeKey"],
            conditions: {
              StringEquals: { "aws:SourceAccount": account },
            },
            principals: [logsServicePrincipal],
            resources: ["*"],
          }),
          new PolicyStatement({
            sid: "AllowCloudWatchLogsReEncryption",
            actions: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*"],
            conditions: {
              StringEquals: { "aws:SourceAccount": account },
              StringLike: { "kms:EncryptionContext:aws-crypto-ec:aws:logs:arn": arn },
              ArnLike: { "aws:SourceArn": arn },
            },
            principals: [logsServicePrincipal],
            resources: ["*"],
          }),
        ],
      }),
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    super(scope, id, {
      anomalyVisibilityTime: 21, // Enables 3 weeks for the anomaly to be addressed before being considered normal.
      detectorName: name,
      evaluationFrequency: "THIRTY_MIN", // MUBox does not have high traffic so this allows for extended evaluation.
      kmsKeyId: encryptionKey.keyArn,
      logGroupArnList: [logGroup.logGroupArn],
    });

    this.encryptionKey = encryptionKey;
  }
}
