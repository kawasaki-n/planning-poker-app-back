import {
  APIGatewayProxyEvent,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import * as AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient();

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,access-token",
};

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResultV2> => {
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("tableName not specified in process.env.TABLE_NAME");
    }

    const params = {
      TableName: tableName,
    };

    const ret = await client.scan(params).promise();

    return {
      statusCode: 200,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify(ret.Items),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify(error),
    };
  }
};
