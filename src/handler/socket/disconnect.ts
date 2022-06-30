import {
  APIGatewayProxyEvent,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import * as AWS from "aws-sdk";

const apigateway = (domainName: any, stage: any): AWS.ApiGatewayManagementApi =>
  new AWS.ApiGatewayManagementApi({ endpoint: `${domainName}/${stage}` });
const client = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResultV2> => {
  console.log("start disconnect handler");
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("tableName not specified in process.env.TABLE_NAME");
    }

    const params = {
      TableName: tableName,
      Key: {
        connectionId: event.requestContext.connectionId,
      },
    };
    await client.delete(params).promise();

    const ret = await client.scan({ TableName: tableName }).promise();
    const connections = await Promise.all(ret.Items || []);
    console.log("connections ", connections);

    await Promise.all(
      connections.map(async ({ connectionId }) => {
        try {
          const sendParams: AWS.ApiGatewayManagementApi.Types.PostToConnectionRequest =
            {
              ConnectionId: connectionId,
              Data: JSON.stringify({
                connectionId,
                connections,
              }),
            };
          return await apigateway(
            event.requestContext.domainName,
            event.requestContext.stage
          )
            .postToConnection(sendParams)
            .promise();
        } catch (e: any) {
          throw e;
        }
      })
    );
    return {
      statusCode: 200,
      body: JSON.stringify(""),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
};
