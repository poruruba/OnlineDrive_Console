'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');
const jsonfile = require(HELPER_BASE + 'jsonfile-utils');
const httpUtils = require(HELPER_BASE + 'http-utils');
const { URLSearchParams } = require('url');

const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/entra/access_token.json';
const ENTRAID_URL_BASE = "https://login.microsoftonline.com";
const ENTRAID_TENANT_ID = process.env.ENTRAID_TENANT_ID;
const ENTRAID_CLIENT_ID = process.env.ENTRAID_CLIENT_ID;
const ENTRAID_CLIENT_SECRET = process.env.ENTRAID_CLIENT_SECRET;
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const ENTRAID_REDIRECT_URL = process.env.ENTRAID_REDIRECT_URL;

const ENTRAID_API_KEY = process.env.ENTRAID_API_KEY;

var ENTRAID_SCOPES = [
  "openid",
  'profile',
  'email',
  'Files.ReadWrite'
];
var MICROSOFT_SCOPES = [
  "openid",
  'profile',
  'email',
  'Files.ReadWrite',
  'Notes.ReadWrite',
  'Calendars.ReadWrite'
];

exports.handler = async (event, context, callback) => {
  if( event.path == "/entra/client_info"){
    if( event.requestContext.apikeyAuth?.apikey != ENTRAID_API_KEY )
      throw Error("invalid apikey");

    var tenant = event.queryStringParameters.tenant;
    if( tenant == 'entra' ){
      return new Response({
        entra_id: ENTRAID_TENANT_ID,
        client_id: ENTRAID_CLIENT_ID,
        redirect_url: ENTRAID_REDIRECT_URL
      });
    }else{
      return new Response({
        entra_id: "consumers",
        client_id: MICROSOFT_CLIENT_ID,
        redirect_url: ENTRAID_REDIRECT_URL
      });
    }
  }else

	if( event.path == '/entra/authorize' ){
    console.log(event.queryStringParameters);
    var tenant = event.queryStringParameters.tenant;

    var params = {
      authorize_endpoint: this.oidc_authorize_endpoint,
      client_id: (tenant == 'entra') ? ENTRAID_CLIENT_ID : MICROSOFT_CLIENT_ID,
      redirect_uri: ENTRAID_REDIRECT_URL,
      response_type: "code",
      scope: (tenant == 'entra') ? ENTRAID_SCOPES.join(' ') : MICROSOFT_SCOPES.join(' '),
    };
		if( event.queryStringParameters.offline_access == "true" )
      params.scope += " offline_access";
		if( event.queryStringParameters.prompt == "true" )
			params.prompt = "consent";
		if( event.queryStringParameters.state )
			params.state = event.queryStringParameters.state;
    if( tenant == 'entra' )
  		return new Redirect(ENTRAID_URL_BASE + "/" + ENTRAID_TENANT_ID + "/oauth2/v2.0/authorize?" + to_urlparam(params));
    else
  		return new Redirect(ENTRAID_URL_BASE + "/" + "consumers" + "/oauth2/v2.0/authorize?" + to_urlparam(params));
	}else

	if( event.path == '/entra/token'){
    if( event.requestContext.apikeyAuth?.apikey != ENTRAID_API_KEY )
      throw Error("invalid apikey");

    var body = JSON.parse(event.body);
    var tenant = body.tenant;
    var input = {
      url: (tenant == 'entra') ? (ENTRAID_URL_BASE + "/" + ENTRAID_TENANT_ID + "/oauth2/v2.0/token") : (ENTRAID_URL_BASE + "/" + "consumers" + "/oauth2/v2.0/token"),
      content_type: "application/x-www-form-urlencoded",
      params: {
        client_id: (tenant == 'entra') ? ENTRAID_CLIENT_ID : MICROSOFT_CLIENT_ID,
        client_secret: (tenant == 'entra') ? ENTRAID_CLIENT_SECRET : MICROSOFT_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: body.code,
        redirect_uri: ENTRAID_REDIRECT_URL
      }
    };
    var result = await httpUtils.do_http(input);
    console.log(result);

    var json = await jsonfile.read_json(TOKEN_FILE_PATH, {});
    var token = {};
    if( tenant == 'entra' ){
      if( !json['entra'] )
        json['entra'] = {};
      token = json['entra'];
    }else{
      if( !json['microsoft'] )
        json['microsoft'] = {};
      token = json['microsoft'];
    }
    token.access_token = result.access_token;
    token.id_token = result.id_token;
    if (result.refresh_token ){
      token.refresh_token = result.refresh_token;
    }
    token.scope = result.scope;
    token.token_type = result.token_type;
    token.expires_in = result.expires_in;
    token.created_at = new Date().getTime();
    token.refreshed_at = 0;

    await jsonfile.write_json(TOKEN_FILE_PATH, json);    

    return new Response(token);
  }else

  if (event.path == '/entra/token-refresh') {
    if( event.requestContext.apikeyAuth?.apikey != ENTRAID_API_KEY )
      throw Error("invalid apikey");

    var body = JSON.parse(event.body);
    var tenant = body.tenant;

    var json = await jsonfile.read_json(TOKEN_FILE_PATH);
    if (!json) {
      console.log('file is not ready.');
      throw 'file is not ready.';
    }

    try{
      var input = {
        url: (tenant == 'entra') ? (ENTRAID_URL_BASE + "/" + ENTRAID_TENANT_ID + "/oauth2/v2.0/token") : (ENTRAID_URL_BASE + "/" + "consumers" + "/oauth2/v2.0/token"),
        content_type: "application/x-www-form-urlencoded",
        params: {
          client_id: (tenant == 'entra') ? ENTRAID_CLIENT_ID : MICROSOFT_CLIENT_ID,
          client_secret: (tenant == 'entra') ? ENTRAID_CLIENT_SECRET : MICROSOFT_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: (tenant == 'entra') ? json['entra'].refresh_token : json['microsoft'].refresh_token,
          scope: (tenant == 'entra') ? json['entra'].scope : json['microsoft'].scope
        }
      };
      var result = await httpUtils.do_http(input);
      console.log(result);

      var json = await jsonfile.read_json(TOKEN_FILE_PATH, {});
      var token = {};
      if( tenant == 'entra' ){
        if( !json['entra'] )
          json['entra'] = {};
        token = json['entra'];
      }else{
        if( !json['microsoft'] )
          json['microsoft'] = {};
        token = json['microsoft'];
      }
      token.access_token = result.access_token;
      token.id_token = result.id_token;
      if (result.refresh_token ){
        token.refresh_token = result.refresh_token;
      }
      token.scope = result.scope;
      token.token_type = result.token_type;
      token.expires_in = result.expires_in;
      token.refreshed_at = new Date().getTime();

      await jsonfile.write_json(TOKEN_FILE_PATH, json);    

      return new Response(token);
    }catch(error){
      throw new Error(error);
    }
  }else

  {
    throw new Error("Unknown endpoint");
  }
};

function to_urlparam(qs){
  var params = new URLSearchParams();
  for( var key in qs )
      params.set(key, qs[key] );
  return params.toString();
}