import * as AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

export const loadConnections = async (tableName: string) => {
  const ret = await client.scan({ TableName: tableName }).promise();
  return ret;
};

export const updateConnection = async (
  tableName: string,
  id: string,
  payload: any
) => {
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
  return ret;
};
