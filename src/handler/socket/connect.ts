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
  console.log("start connect handler", event);
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("tableName not specified in process.env.TABLE_NAME");
    }

    const connectionId = event.requestContext.connectionId;
    console.log("connectionId", connectionId);
    if (!connectionId) throw new Error("connectionId is undefined!");

    const params = {
      TableName: tableName,
      Item: {
        connectionId,
      },
    };
    await client.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(connectionId),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
};
