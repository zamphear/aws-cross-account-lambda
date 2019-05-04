import AWS from 'aws-sdk';

AWS.config.apiVersions = {
  lambda: '2015-03-31',
  sts: '2011-06-15'
};


// cached creds
const CREDS_DURATION = 3600;
const CREDS_EXIRE_MODIFIER = 600;
let creds, credsExpireTimestamp = 0;


export const resolver = async (event, context, callback) => {
  // this allows the handler to exit immediately on callback
  context.callbackWaitsForEmptyEventLoop = false;

  const now = Date.now();
  if (!creds || now >= credsExpireTimestamp) {
    try {
      const sts = new AWS.STS();
      const params = {
        DurationSeconds: CREDS_DURATION,
        RoleArn: process.env.PROXY_LAMBDA_ROLE_ARN,
        RoleSessionName: 'steve'
      };
      const data = await sts.assumeRole(params).promise();
      creds = {
        accessKeyId: data.Credentials.AccessKeyId,
        secretAccessKey: data.Credentials.SecretAccessKey,
        sessionToken: data.Credentials.SessionToken
      };

      // set the local expiration to shortly before the actual expiration
      credsExpireTimestamp = now + (CREDS_DURATION * 1000) - (CREDS_EXIRE_MODIFIER * 1000);
    } catch (e) {
      callback(e);
    }
  } else {
    console.log('using cached creds');
  }

  // collection of test requests
  const requests = [
    {
      uri: 'https://ifuelnpcv5.execute-api.us-west-2.amazonaws.com/prod/pets',
      json: true
    }
  ];

  try {
    // instantiate lambda with assumed creds
    const lambda = new AWS.Lambda(creds);

    for (let i = 0, x = requests.length; i < x; i++) {
      const params = {
        FunctionName: process.env.PROXY_LAMBDA_ARN,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(requests[i])
      };
      await new Promise((resolve, reject) => {
        lambda.invoke(params, (error, data) => {
          if (error) {
            return reject(error);
          }
          console.log(data);
          resolve(data);
        });
      });
    }
  } catch (e) {
    callback(e);
  }
};
