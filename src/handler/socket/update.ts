import {
  APIGatewayProxyEvent,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import * as AWS from "aws-sdk";

const apigateway = (domainName: any, stage: any): AWS.ApiGatewayManagementApi =>
  new AWS.ApiGatewayManagementApi({ endpoint: `${domainName}/${stage}` });
const client = new AWS.DynamoDB.DocumentClient();

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResultV2> => {
  console.log("start update handler");
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("tableName not specified in process.env.TABLE_NAME");
    }
    const ret = await client.scan({ TableName: tableName }).promise();
    const connectionIds = await Promise.all(ret.Items || []);
    console.log("connectionIds ", connectionIds);

    await Promise.all(
      connectionIds.map(async ({ connectionId }) => {
        try {
          const sendParams: AWS.ApiGatewayManagementApi.Types.PostToConnectionRequest =
            {
              ConnectionId: connectionId,
              Data: JSON.stringify({
                connectionId,
                connectionIds,
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
