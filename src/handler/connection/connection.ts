import {
  APIGatewayProxyEvent,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import * as AWS from "aws-sdk";
import * as utils from "../util";
import * as service from "../../service/connection";

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
      const ret = await service.loadConnections(tableName);
      return utils.successResult(ret);
    } else if (method === "PUT") {
      if (event.body == null) {
        return utils.errorResult({ message: `event.body is null` });
      }

      const payload = JSON.parse(event.body);
      if (id) {
        const ret = await service.updateConnection(tableName, id, payload);
        return utils.successResult(ret);
      }

      const connections = await service.loadConnections(tableName);
      if (connections.Items) {
        await Promise.all(
          connections.Items.map(async (connection) => {
            return await service.updateConnection(
              tableName,
              connection.connectionId,
              payload
            );
          })
        );
      }
      return utils.successResult({});
    }

    return utils.errorResult({ message: `unexpected method = ${method}` });
  } catch (error) {
    console.error(error);
    return utils.errorResult(error);
  }
};
