import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  Cors,
  LambdaIntegration,
  LambdaRestApi,
  MethodLoggingLevel,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import {
  CfnApi,
  CfnDeployment,
  CfnIntegration,
  CfnRoute,
  CfnStage,
} from "aws-cdk-lib/aws-apigatewayv2";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class PlanningPokerAppBackStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const APP_NAME = "PlannigPokerApp";

    const db = new Table(this, `${APP_NAME}Db`, {
      partitionKey: {
        name: "connectionId",
        type: AttributeType.STRING,
      },
      tableName: `${APP_NAME}Db`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const socket = new CfnApi(this, `${APP_NAME}WebSocketApi`, {
      name: `${APP_NAME}WebSocketApi`,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    const connectFunction = new NodejsFunction(
      this,
      `${APP_NAME}ConnectHandlerFunction`,
      {
        entry: "src/handler/socket/connect.ts",
        runtime: Runtime.NODEJS_14_X,
        handler: "handler",
        environment: {
          TABLE_NAME: db.tableName,
          TABLE_KEY: "connectionId",
        },
      }
    );
    db.grantReadWriteData(connectFunction);

    const disconnectFunction = new NodejsFunction(
      this,
      `${APP_NAME}DisconnectHandlerFunction`,
      {
        entry: "src/handler/socket/disconnect.ts",
        runtime: Runtime.NODEJS_14_X,
        handler: "handler",
        environment: {
          TABLE_NAME: db.tableName,
          TABLE_KEY: "connectionId",
        },
      }
    );
    db.grantReadWriteData(disconnectFunction);

    const defaultFunction = new NodejsFunction(
      this,
      `${APP_NAME}DefaultHandlerFunction`,
      {
        entry: "src/handler/socket/default.ts",
        runtime: Runtime.NODEJS_14_X,
        handler: "handler",
        environment: {
          TABLE_NAME: db.tableName,
          TABLE_KEY: "connectionId",
        },
      }
    );
    db.grantReadWriteData(defaultFunction);

    const updateFunction = new NodejsFunction(
      this,
      `${APP_NAME}UpdateHandlerFunction`,
      {
        entry: "src/handler/socket/update.ts",
        runtime: Runtime.NODEJS_14_X,
        handler: "handler",
        environment: {
          TABLE_NAME: db.tableName,
          TABLE_KEY: "connectionId",
        },
      }
    );
    db.grantReadWriteData(updateFunction);

    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        connectFunction.functionArn,
        disconnectFunction.functionArn,
        defaultFunction.functionArn,
        updateFunction.functionArn,
      ],
      actions: ["lambda:InvokeFunction"],
    });

    const role = new Role(this, `${APP_NAME}Role`, {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });
    role.addToPolicy(policy);

    const connectIntegration = new CfnIntegration(
      this,
      `${APP_NAME}ConnectIntegration`,
      {
        apiId: socket.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:ap-northeast-1:lambda:path/2015-03-31/functions/${connectFunction.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const connectRoute = new CfnRoute(this, `${APP_NAME}ConnectRoute`, {
      apiId: socket.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      target: "integrations/" + connectIntegration.ref,
    });

    const disconnectIntegration = new CfnIntegration(
      this,
      `${APP_NAME}DisconnectIntegration`,
      {
        apiId: socket.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:ap-northeast-1:lambda:path/2015-03-31/functions/${disconnectFunction.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const disconnectRoute = new CfnRoute(this, `${APP_NAME}DisconnectRoute`, {
      apiId: socket.ref,
      routeKey: "$disconnect",
      authorizationType: "NONE",
      target: "integrations/" + disconnectIntegration.ref,
    });

    const defaultIntegration = new CfnIntegration(
      this,
      `${APP_NAME}DefaultIntegration`,
      {
        apiId: socket.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:ap-northeast-1:lambda:path/2015-03-31/functions/${defaultFunction.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const defaultRoute = new CfnRoute(this, `${APP_NAME}DefaultRoute`, {
      apiId: socket.ref,
      routeKey: "$default",
      authorizationType: "NONE",
      target: "integrations/" + defaultIntegration.ref,
    });

    const updateIntegration = new CfnIntegration(
      this,
      `${APP_NAME}UpdateIntegration`,
      {
        apiId: socket.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:ap-northeast-1:lambda:path/2015-03-31/functions/${updateFunction.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      }
    );

    const updateRoute = new CfnRoute(this, `${APP_NAME}UpdateRoute`, {
      apiId: socket.ref,
      routeKey: "update",
      authorizationType: "NONE",
      target: "integrations/" + updateIntegration.ref,
    });

    const deployment = new CfnDeployment(this, `${APP_NAME}Deployment`, {
      apiId: socket.ref,
    });
    deployment.addDependsOn(socket);
    deployment.addDependsOn(connectRoute);
    deployment.addDependsOn(disconnectRoute);
    deployment.addDependsOn(defaultRoute);
    deployment.addDependsOn(updateRoute);

    const stage = new CfnStage(this, `${APP_NAME}Stage`, {
      stageName: "dev",
      apiId: socket.ref,
      autoDeploy: true,
      deploymentId: deployment.ref,
    });
    stage.addDependsOn(deployment);

    const wsManageConnnectionPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        this.formatArn({
          service: "execute-api",
          resourceName: `${stage.stageName}/POST/*`,
          resource: socket.ref,
        }),
      ],
      actions: ["execute-api:ManageConnections"],
    });
    disconnectFunction.addToRolePolicy(wsManageConnnectionPolicy);
    updateFunction.addToRolePolicy(wsManageConnnectionPolicy);

    // cf) https://zenn.dev/t_morooka/articles/2951743c240063

    const connectionHandler = new NodejsFunction(
      this,
      `${APP_NAME}ConnectionHandler`,
      {
        entry: "src/handler/connection/connection.ts",
        runtime: Runtime.NODEJS_14_X,
        handler: "handler",
        environment: {
          TABLE_NAME: db.tableName,
          TABLE_KEY: "connectionId",
        },
      }
    );
    db.grantReadWriteData(connectionHandler);

    const connectionApi = new LambdaRestApi(this, `${APP_NAME}RestApi`, {
      restApiName: `${APP_NAME}RestApi`,
      handler: connectionHandler,
      proxy: false,
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS.concat([
          "access-control-allow-origin",
          "x-requested-with",
        ]),
      },
    });
    connectionApi.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const connection = connectionApi.root.addResource("connection");
    connection.addMethod(
      "GET",
      new LambdaIntegration(connectionHandler, { proxy: true })
    );
    connection.addMethod(
      "PUT",
      new LambdaIntegration(connectionHandler, { proxy: true })
    );

    const connectionWithId = connection.addResource(`{id}`);
    connectionWithId.addMethod(
      "PUT",
      new LambdaIntegration(connectionHandler, { proxy: true })
    );
  }
}
