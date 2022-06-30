export const CORS_HEADER = {
  "Access-Control-Allow-Origin": "*",
};

export const CONTENT_JSON = {
  "Content-Type": "application/json",
};

export const successResult = (ret: any, logging = true) => {
  if (logging) {
    console.log("SUCCESS:");
    console.log(JSON.stringify(ret));
  }
  return {
    statusCode: 200,
    headers: { ...CORS_HEADER, ...CONTENT_JSON },
    body: JSON.stringify(ret),
  };
};

export const errorResult = (e: any, logging = true) => {
  if (logging) {
    console.log("ERROR:");
    console.log(JSON.stringify(e.stack));
  }
  return {
    statusCode: 500,
    headers: { ...CONTENT_JSON },
    body: JSON.stringify(e.message),
  };
};
