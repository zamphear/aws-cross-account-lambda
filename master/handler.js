// import { v4 as uuid } from 'uuid';
import request from 'request-promise';

export const proxy = async (event, context, callback) => {

  // in the context of this function, event is the options collection
  // for an http request.

  // we should add some validation in the future, but for now just
  // pass it through

  let data;
  try {
    data = await request.get(event);
  } catch (e) {
    console.error(e);
    callback(e);
  }
  callback(null, data);
};
