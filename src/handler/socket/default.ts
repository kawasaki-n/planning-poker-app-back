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
  console.log("start default handler", event);
  try {
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
