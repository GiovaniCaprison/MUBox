import type { IDistribution } from "aws-cdk-lib/aws-cloudfront";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { Bucket, BucketEncryption, ObjectOwnership, StorageClass, type BucketProps } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, type ISource } from "aws-cdk-lib/aws-s3-deployment";
import { Duration, RemovalPolicy } from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * Properties for the {@link StaticAssetsBucket} construct.
 */
export interface StaticAssetsBucketProps {
  /**
   * The static assets to deploy.
   */
  readonly staticAssets: ISource[];
}

// How long we retain our assets in S3 for.
const FILE_EXPIRATION = Duration.days(720);

/**
 * The S3 bucket that the static assets will be deployed to.
 */
export class StaticAssetsBucket extends Bucket {
  /**
   * The IAM role used for performing this deployment.
   */
  private readonly deploymentRole: Role;

  /**
   * The static assets to deploy.
   */
  private staticAssets: ISource[];

  public constructor(scope: Construct, id: string, { staticAssets }: StaticAssetsBucketProps) {
    const encryptionKey = new Key(scope, `${id}EncryptionKey`, {
      alias: `${id}EncryptionKey`,
      description: `The key used to encrypt content for the ${id} S3 bucket`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    const baseBucketProps: BucketProps = {
      bucketKeyEnabled: true,
      encryption: BucketEncryption.KMS,
      encryptionKey,
      enforceSSL: true,
      lifecycleRules: [
        {
          /**
           * We generally do not reference older versions unless in the process of a manual rollback so its safe to lower access speed needs after not
           * being accessed recently.
           *
           * This sets up a tiered performance access pattern to minimize storage costs but maintain high data availability in case we want or need
           * to access older data.
           *
           * Note that we do not use the `intelligentTieringConfigurations` option due to not using Glacier (normal) or Deep Archive for current versions
           *
           * @see https://github.com/aws/aws-cdk/issues/20937
           */
          transitions: [{ storageClass: StorageClass.INTELLIGENT_TIERING, transitionAfter: Duration.seconds(0) }],
          noncurrentVersionTransitions: [
            { storageClass: StorageClass.INTELLIGENT_TIERING, transitionAfter: Duration.seconds(0) },
            { storageClass: StorageClass.GLACIER, transitionAfter: Duration.days(180) },
            { storageClass: StorageClass.DEEP_ARCHIVE, transitionAfter: Duration.days(365) },
          ],

          // Ensure our old files and versions eventually expire.
          noncurrentVersionExpiration: FILE_EXPIRATION,
          expiration: FILE_EXPIRATION,
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
      versioned: true,
    };

    const accessLogs = new Bucket(scope, `${id}AccessLogs`, {
      ...baseBucketProps,
      objectOwnership: ObjectOwnership.OBJECT_WRITER, // Required for access logging
    });

    super(scope, id, {
      ...baseBucketProps,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: accessLogs,
      transferAcceleration: true, // Reduces the latency hit when loading from the bucket given this is a time sensitive, user facing store for our static assets.
    });

    // Ensures the assets can be referenced
    this.staticAssets = staticAssets;

    /**
     * The role that the BucketDeployment's custom resource's Lambda will use while triggering the deployment.
     *
     * The BucketDeployment construct automatically grants this role the permissions it needs to
     * write to the destination S3 bucket. Additional inline policies can be added here if the
     * deployment sources require reading from other buckets or KMS keys.
     */
    this.deploymentRole = new Role(scope, "DeploymentRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      description: "The role used for triggering deployments to our UI asset S3 bucket and then a CloudFront cache invalidation.",
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });
  }

  /**
   * Deploys the static assets to this S3 bucket and performs a CloudFront cache invalidation after to ensure that CloudFront is serving the latest assets.
   *
   * @param distribution The CloudFront distribution whose cache should be invalidated upon deployment.
   */
  public deployAssetsAndInvalidateCloudFrontCache(distribution: IDistribution) {
    new BucketDeployment(this, "Deployment", {
      destinationBucket: this,
      distribution,
      distributionPaths: ["/favicon.ico", "/index.html", "/robots.txt"], // Only invalidate root files that are not hashed. Files in /assets are versioned using a hash and therefore can stay cached.
      memoryLimit: 1792, // This is set to support larger UI deployments. 1792 also gets us 1 vCPU which increases deployment speed.
      prune: false, // Keep previous artifacts so that any dynamic loading of any assets in older applications already loaded in user's browsers continue to work until they have performed a full page refresh.
      role: this.deploymentRole,
      sources: this.staticAssets,
    });
  }
}
