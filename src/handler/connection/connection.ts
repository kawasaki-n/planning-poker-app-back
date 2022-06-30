import {
  APIGatewayProxyEvent,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import * as AWS from "aws-sdk";
import * as utils from "../util";

const client = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResultV2> => {
  const method: string = event.requestContext.httpMethod;
  const id: string | undefined = event.pathParameters?.id;

  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("tableName not specified in process.env.TABLE_NAME");
    }

    if (method === "GET") {
      const params = {
        TableName: tableName,
      };

      const ret = await client.scan(params).promise();
      return utils.successResult(ret);
    } else if (method === "PUT") {
      if (event.body == null) {
        return utils.errorResult({ message: `event.body is null` });
      }
      if (!id) {
        return utils.errorResult({ message: `id is required!` });
      }

      const payload = JSON.parse(event.body);

      const params = {
        TableName: tableName,
        Key: { connectionId: id },
        ExpressionAttributeNames: {
          "#v": "value",
        },
        ExpressionAttributeValues: {
          ":newValue": payload.value,
        },
        UpdateExpression: "SET #v = :newValue",
        ReturnValues: "UPDATED_NEW",
      };
      const ret = await client.update(params).promise();
      return utils.successResult(ret);
    }

    return utils.errorResult({ message: `unexpected method = ${method}` });
  } catch (error) {
    console.error(error);
    return utils.errorResult(error);
  }
};
