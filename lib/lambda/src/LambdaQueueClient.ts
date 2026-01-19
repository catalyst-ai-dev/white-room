import type { LambdaConfigRecordType, SQSRecordType } from './lambda.enums';
import type { Lambda } from './lambda.enums';
import type { LambdaPayloadMap } from './lambda.schemas';

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { createLogger } from '@namespace/logger';
import { Environment } from './lambda.enums';
import { lambdaSettings } from './lambda.settings';
import { LambdaClient } from './LambdaClient';

const logger = createLogger('LambdaQueueClient');

type LambdaSQSEnabledConfig = LambdaConfigRecordType & { sqs: SQSRecordType };
type LambdaSQSEnabledEntry = [keyof LambdaPayloadMap, LambdaSQSEnabledConfig];

const { AWS_ACCOUNT_ID, AWS_REGION, ENVIRONMENT = 'local' } = process.env;

function makeLambdaQueueClientUrl({
  lambda,
  awsRegion,
  awsAccountId,
  environment,
  sqsConfig,
}: {
  lambda: Lambda;
  awsRegion: string;
  awsAccountId: string;
  environment: Environment;
  sqsConfig: SQSRecordType;
}): string {
  return (
    `https://sqs.${awsRegion}.amazonaws.com/${awsAccountId}/` +
    `${environment}-${lambda}LambdaEventQueue${sqsConfig.fifo ? '.fifo' : ''}`
  );
}

/**
 * Manages interactions with an Amazon SQS queue for an individual lambda function.
 *
 * Usage:
 * const processImageQueue = new LambdaFunctionQueue({
 *   lambda: 'ProcessImage',
 *   environment: Environment.Prod
 *   sqsConfig: <SqsRecordType>
 * });
 *
 * await processImageQueue.push({ imageUrl: 'https://example.com/image.jpg' });
 */
class LambdaFunctionQueue<
  K extends keyof LambdaPayloadMap,
  T extends LambdaPayloadMap[K]['request'],
> {
  private client: SQSClient;
  private queueUrl: string;
  private lambda: K;
  private environment: Environment;
  private sqsConfig: SQSRecordType;
  private lambdaApiClient!: LambdaClient;
  public enabled: boolean;

  constructor({
    lambda,
    environment = Environment.Local,
    sqsConfig,
  }: {
    lambda: K;
    environment?: Environment;
    sqsConfig: SQSRecordType;
  }) {
    this.lambda = lambda;
    this.environment = environment;
    this.sqsConfig = sqsConfig;

    const awsRegion = AWS_REGION || 'us-east-1';
    this.enabled = !!AWS_ACCOUNT_ID;

    if (!this.enabled) {
      logger.warn('[LambdaQueueClient] AWS_ACCOUNT_ID is required for SQS client initialization');
    }

    this.client = new SQSClient({ region: awsRegion });
    this.queueUrl = makeLambdaQueueClientUrl({
      lambda: this.lambda,
      awsRegion,
      awsAccountId: AWS_ACCOUNT_ID || '',
      environment: this.environment,
      sqsConfig: this.sqsConfig,
    });

    if (this.environment === Environment.Local) {
      this.lambdaApiClient = new LambdaClient();
    }
  }

  async push(payload: T): Promise<void> {
    if (this.environment === Environment.Local) {
      logger.info({ payload }, `[Local] Pushing message to queue ${this.lambda}`);
      await this.lambdaApiClient.request(this.lambda, payload);
      return;
    }

    if (!this.enabled) {
      throw new Error(`[${this.environment}] Lambda ${this.lambda} is not enabled`);
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(payload),
      });
      await this.client.send(command);
    } catch (error) {
      logger.error(error, `Failed to push message to queue ${this.lambda}:`);
      throw error;
    }
  }

  getQueueUrl(): string {
    return this.queueUrl;
  }

  getEnvironment(): Environment {
    return this.environment;
  }
}

export class LambdaQueueClient {
  private queueMapping: Map<
    Lambda,
    LambdaFunctionQueue<keyof LambdaPayloadMap, LambdaPayloadMap[keyof LambdaPayloadMap]['request']>
  >;

  constructor(environment: Environment = ENVIRONMENT as Environment) {
    const validQueueEntries = Object.entries(lambdaSettings)
      .filter((entry): entry is LambdaSQSEnabledEntry => {
        const [, config] = entry;
        return config.sqs !== null && config.sqs !== undefined;
      })
      .map(
        ([lambda, config]): [
          Lambda,
          LambdaFunctionQueue<
            keyof LambdaPayloadMap,
            LambdaPayloadMap[keyof LambdaPayloadMap]['request']
          >,
        ] => [
          lambda,
          new LambdaFunctionQueue({
            lambda,
            environment,
            sqsConfig: config.sqs,
          }),
        ],
      );

    this.queueMapping = new Map(validQueueEntries);
  }

  async push<K extends keyof LambdaPayloadMap>(
    lambda: K,
    payload: LambdaPayloadMap[K]['request'],
  ): Promise<void> {
    const queue = this.queueMapping.get(lambda);
    if (!queue) {
      throw new Error(`No queue found for job type: ${lambda}`);
    }
    await queue.push(payload);
  }
}

export const lambdaQueueClient = new LambdaQueueClient();
