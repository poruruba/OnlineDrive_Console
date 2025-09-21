'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');
const jsonfile = require(HELPER_BASE + "jsonfile-utils");
const httpUtils = require(HELPER_BASE + "http-utils");
const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/entra/access_token.json';
const ENTRAID_API_KEY = process.env.ENTRAID_API_KEY;
const token_url_base = process.env.PUBLIC_HOST_NAME;
const { Client } = require("@microsoft/microsoft-graph-client");

const client_microsoft = Client.initWithMiddleware({
	authProvider: {
		getAccessToken: async () => {
			return await getAccessToken("microsoft");
		},
	},
});

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	console.log(body);

	if( event.requestContext.apikeyAuth?.apikey != ENTRAID_API_KEY )
		throw Error("invalid apikey");

	if( event.path == '/onedrive-list-special' ){
		var param = "/me/drive";
		var result = await client_microsoft.api(param)
		.select('name,id,createdDateTime,lastModifiedDateTime,parentReference')
		.get();

		var list = [
			{ id: "", name: "ルート" },
			{ id: "sharedWithMe", name: "共有" },
			{ id: "documents", name: "ドキュメント" },
			{ id: "photos", name: "画像" },
			{ id: "cameraroll", name: "カメラ" },
			{ id: "music", name: "音楽" },
			{ id: "videos", name: "ビデオ" },
			{ id: "recordings", name: "録音" },
		];
		return new Response( { list : list, drive: result });
	}else

	if( event.path == '/onedrive-list-dir' ){
		var param;
		if( body.special == 'sharedWithMe' ){
			param = "/me/drive/sharedWithMe";
		}else{
			param = (body.driveId) ? `/drives/${body.driveId}`: "/me/drive";
			if( body.itemId ){
				param += `/items/${body.itemId}`;
			}else{
				if( body.special )
					param += `/special/${body.special}`;
				else
					param += "/root";
			}
			if( body.path )
				param += `:${encodeURI(body.path)}:`;
			param += "/children";
		}
		console.log("param=" + param);
		var result = await client_microsoft.api(param)
		.select('name,id,size,createdDateTime,lastModifiedDateTime,file,folder,parentReference,remoteItem')
		.get();
		return new Response({ list: result.value });
	}else

	if( event.path == '/onedrive-upload-file'){
		var param = (body.driveId) ? `/drives/${body.driveId}`: "/me/drive";
		if( body.itemId ){
			param += `/items/${body.itemId}`;
		}else{
			if( body.special )
				param += `/special/${body.special}`;
			else
				param += "/root";
		}
		var path = (body.path) ? (body.path + "/" + body.name) : ("/" + body.name);
		param += `:${encodeURI(path)}:`;
		param += "/createUploadSession";
		console.log("param=" + param);
		var result = await client_microsoft.api(param)
		.post();
		return new Response({ url: result.uploadUrl });
	}else

	if( event.path == '/onedrive-make-dir' ){
		var param = (body.driveId) ? `/drives/${body.driveId}`: "/me/drive";
		if( body.itemId ){
			param += `/items/${body.itemId}`;
		}else{
			if( body.special )
				param += `/special/${body.special}`;
			else
				param += "/root";
		}
		var path = (body.path) ? (body.path + "/" + body.name) : ("/" + body.name);
		if(body.path)
			param += `:${encodeURI(body.path)}:`;
		param += "/children";
		var item = {
			name: body.name,
			folder: {}
		};
		console.log("param=" + param);
		var result = await client_microsoft.api(param)
		.select('name,id,size,createdDateTime,lastModifiedDateTime,file,folder,parentReference,remoteItem')
		.post(item);
		return new Response({ list: result.value });
	}else

	if( event.path == '/onedrive-download-file'){
		var param = (body.driveId) ? `/drives/${body.driveId}`: "/me/drive";
		if( body.itemId ){
			param += `/items/${body.itemId}`;
		}else{
			if( body.special )
				param += `/special/${body.special}`;
			else
				param += "/root";
		}
		if( body.path )
			param += `:${encodeURI(body.path)}:`;
		console.log("param=" + param);
		var result = await client_microsoft.api(param)
		.get();
		console.log(result);
		return new Response({ url: result['@microsoft.graph.downloadUrl'], name: result.name, size: result.size, mimeType: result.file.mimeType });
	}else

	if( event.path == '/onedrive-delete-file'){
		var param = (body.driveId) ? `/drives/${body.driveId}`: "/me/drive";
		if( body.itemId ){
			param += `/items/${body.itemId}`;
		}else{
			if( body.special )
				param += `/special/${body.special}`;
			else
				param += "/root";
		}
		if( body.path )
			param += `:${encodeURI(body.path)}:`;
		console.log("param=" + param);
		var result = await client_microsoft.api(param)
		.select('name,id,size,createdDateTime,lastModifiedDateTime,file,folder,parentReference,remoteItem')
		.delete();
		return new Response({});
	}else

	if( event.path == '/onedrive-get-info'){
		if( body.special == 'sharedWithMe' )
			return new Response({ info: { parentReference: { special: "sharedWithMe" } } });
		var param = (body.driveId) ? `/drives/${body.driveId}`: "/me/drive";
		if( body.itemId ){
			param += `/items/${body.itemId}`;
		}else{
			if( body.special )
				param += `/special/${body.special}`;
			else
				param += "/root";
		}
		if( body.path )
			param += `:${encodeURI(body.path)}:`;
		console.log("param=" + param);
		var result = await client_microsoft.api(param)
		.select('name,id,size,createdDateTime,lastModifiedDateTime,file,folder,parentReference,remoteItem')
		.get();
		return new Response({ info: result });
	}else

	{
		throw new Error("Unknown endpoint");
	}
};

async function getAccessToken(tenant)
{
	var json = await jsonfile.read_json(TOKEN_FILE_PATH, {});
	var token;
	if( tenant == 'entra')
		token = json['entra'];
	else
		token = json['microsoft'];

	if( (token.created_at + token.expires_in * 1000 - 3 * 60 * 1000) < new Date().getTime() ){
		var input = {
			url: token_url_base + "/entra/token-refresh",
			body: {
				tenant: tenant
			},
			api_key: ENTRAID_API_KEY
		};
		var result = await httpUtils.do_http(input);
		console.log(result);

		json = await jsonfile.read_json(TOKEN_FILE_PATH);
		if( tenant == 'entra')
			token = json['entra'];
		else
			token = json['microsoft'];
	}

	return token.access_token;
}