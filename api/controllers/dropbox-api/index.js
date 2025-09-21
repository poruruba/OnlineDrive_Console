'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');
const jsonfile = require(HELPER_BASE + "jsonfile-utils");
const httpUtils = require(HELPER_BASE + "http-utils");
const token_url_base = process.env.PUBLIC_HOST_NAME;

const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/dropbox/access_token.json';
const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;
const DROPBOX_REDIRECT_URL = process.env.DROPBOX_REDIRECT_URL;
const DROPBOX_API_KEY = process.env.DROPBOX_API_KEY;

const dropbox_base_url = "https://api.dropboxapi.com";

exports.handler = async (event, context, callback) => {
  if( event.path == "/dropbox/client_info"){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

    return new Response({
      client_id: DROPBOX_CLIENT_ID,
      redirect_url: DROPBOX_REDIRECT_URL
    });
  }else

	if( event.path == '/dropbox/token'){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

    var body = JSON.parse(event.body);
		console.log(body);
		var input = {
			url: dropbox_base_url + "/oauth2/token",
			params : {
				code: body.code,
				grant_type: "authorization_code",
				redirect_uri: DROPBOX_REDIRECT_URL,
				client_id: DROPBOX_CLIENT_ID,
				client_secret: DROPBOX_CLIENT_SECRET,
			},
			content_type: "application/x-www-form-urlencoded"
		};
		var result = await httpUtils.do_http(input);
		console.log(result);

    var json = await jsonfile.read_json(TOKEN_FILE_PATH, {});
    json.access_token = result.access_token;
    // json.id_token = token.id_token;
    json.id_token = result.id_token;
    if (result.refresh_token )
      json.refresh_token = result.refresh_token;
		json.expires_in = result.expires_in;
    json.scope = result.scope;
    json.token_type = result.token_type;
    json.created_at = new Date().getTime();
		json.refreshed_at = 0;

    await jsonfile.write_json(TOKEN_FILE_PATH, json);    

    return new Response(json);
  }else

  if (event.path == '/dropbox/token-refresh') {
    if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
      throw Error("invalid apikey");

    var json = await jsonfile.read_json(TOKEN_FILE_PATH);
    if (!json) {
      console.log('file is not ready.');
      throw 'file is not ready.';
    }

    try{
			var input = {
				url: dropbox_base_url + "/oauth2/token",
				params : {
					grant_type: "refresh_token",
					refresh_token: json.refresh_token,
					client_id: DROPBOX_CLIENT_ID,
					client_secret: DROPBOX_CLIENT_SECRET,
				},
				content_type: "application/x-www-form-urlencoded"
			};
			var result = await httpUtils.do_http(input);
			console.log(result);

      json.access_token = result.access_token;
      if (result.refresh_token )
        json.refresh_token = result.refresh_token;
      json.expires_in = result.expires_in;
			if( result.scope )
	      json.scope = result.scope;
      json.token_type = result.token_type;
      json.refreshed_at = new Date().getTime();

      await jsonfile.write_json(TOKEN_FILE_PATH, json);    

      return new Response(json);
    }catch(error){
      throw new Error(error);
    }
  }else


	if( event.path == '/dropbox-list-dir' ){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var token = await getAccessToken();
    var input = {
      url: dropbox_base_url + "/2/files/list_folder",
      body: {
        path: (!body.path || body.path == '/') ? "" : body.path,
      },
      token: token,
    };
    var result = await httpUtils.do_http(input);
		return new Response({ list: result.entries });
	}else

	if( event.path == '/dropbox-upload-file'){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var path = body.path;
		if( body.name )
			path += path.endsWith("/") ? body.name : "/" + body.name;
		
		var token = await getAccessToken();
		var input = {
			url: dropbox_base_url + "/2/files/get_temporary_upload_link",
			body: {
				commit_info: {
					path: path
				}
			},
			token: token
		};
		var result = await httpUtils.do_http(input);
		console.log(result);

		return new Response({ url: result.link });
	}else

	if( event.path == '/dropbox-make-dir' ){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var token = await getAccessToken();
		var input = {
			url: dropbox_base_url + "/2/files/create_folder_v2",
			body: {
				path: body.path,
			},
      token: token,
		};
		if( body.name )
			input.body.path += input.body.path.endsWith("/") ? body.name : "/" + body.name;
		console.log(input);
		var result = await httpUtils.do_http(input);
		console.log(result);
		return new Response({ info: result.metadata });
	}else

	if( event.path == '/dropbox-download-file'){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var token = await getAccessToken();
		var input = {
			url: dropbox_base_url + "/2/files/get_temporary_link",
			body: {
				path: body.path,
			},
      token: token,
		};
		var result = await httpUtils.do_http(input);
		console.log(result);
		return new Response({ url: result.link, name: result.metadata.name, size: result.metadata.size });
	}else

	if( event.path == '/dropbox-delete-file'){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var token = await getAccessToken();
		var input = {
			url: dropbox_base_url + "/2/files/delete_v2",
			body: {
				path: body.path,
			},
      token: token,
		};
		var result = await httpUtils.do_http(input);
		console.log(result);
		return new Response({ info: result.metadata });
	}else

	if( event.path == '/dropbox-get-info'){
		if( event.requestContext.apikeyAuth?.apikey != DROPBOX_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var token = await getAccessToken();
		var input = {
			url: dropbox_base_url + "/2/files/get_metadata",
			body: {
				path: body.path,
			},
      token: token,
		};
		var result = await httpUtils.do_http(input);
		console.log(result);
		return new Response({ info: result });
	}else

	{
		throw new Error("Unknown endpoint");
	}
};

async function getAccessToken()
{
	var token = await jsonfile.read_json(TOKEN_FILE_PATH, {});

	if( (token.created_at + token.expires_in * 1000 - 3 * 60 * 1000) < new Date().getTime() ){
		var input = {
			url: token_url_base + "/dropbox/token-refresh",
			api_key: DROPBOX_API_KEY
		};
		var result = await httpUtils.do_http(input);
		console.log(result);

		token = await jsonfile.read_json(TOKEN_FILE_PATH);
	}

	return token.access_token;
}