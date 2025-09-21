'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const jsonfile = require(HELPER_BASE + 'jsonfile-utils');
const HttpUtils = require(HELPER_BASE + 'http-utils');
const fetch = require('node-fetch');

const TOKEN_FILE_PATH = process.env.THIS_BASE_PATH + '/data/gapi/access_token.json';
const GOOGLEAPI_CLIENT_ID = process.env.GOOGLEAPI_CLIENT_ID;
const GOOGLEAPI_CLIENT_SECRET = process.env.GOOGLEAPI_CLIENT_SECRET;
const GOOGLEAPI_REDIRECT_URL = process.env.GOOGLEAPI_REDIRECT_URL;
const GAPI_API_KEY = process.env.GAPI_API_KEY;
const token_url_base = process.env.PUBLIC_HOST_NAME;

const { google } = require('googleapis');
const googleAuth = new google.auth.OAuth2(GOOGLEAPI_CLIENT_ID, GOOGLEAPI_CLIENT_SECRET, GOOGLEAPI_REDIRECT_URL);

exports.handler = async (event, context, callback) => {
	var json = await getAccessToken();
	console.log(json);
	googleAuth.setCredentials(json);

	const drive = google.drive({version: 'v3', auth: googleAuth});

	if( event.path == '/googledrive-list-dir' ){
		if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var param = (body.folderId) ? `'${body.folderId}'` : "'root'";
		param += " in parents and trashed = false";
		console.log("param=" + param);
		var list = await drive.files.list({
			corpora: 'user',
			spaces: 'drive',
			fields: 'files(id, name, mimeType, parents, size, createdTime, modifiedTime)',
			pageSize: 1000,
			q: param,
		});
		return new Response({ list: list });
	}else

	if( event.path == '/googledrive-get-info'){
		if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
			throw Error("invalid apikey");

		var body = JSON.parse(event.body);
		console.log(body);

		var result = await drive.files.get({
			fileId: body.fileId,
			fields: 'parents, id, name'
		});
		console.log(result);
		return new Response({ info: result.data });
	}else

	if( event.path == '/googledrive-download-file'){
		if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
			throw Error("invalid apikey");
		
		var body = JSON.parse(event.body);
		console.log(body);

		var result = await drive.files.get({
			fileId: body.fileId,
			fields: 'webContentLink'
		});
		console.log(result);
		return new Response({ url: result.data.webContentLink });
	}else

	if( event.path == '/googledrive-make-dir' ){
		if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
			throw Error("invalid apikey");
		
		var body = JSON.parse(event.body);
		console.log(body);

		var fileMetadata = {
			name: body.name,
			mimeType: "application/vnd.google-apps.folder",
			parents: [body.parentId]
		};
		var result = await drive.files.create({
			resource: fileMetadata,
			fields: 'id'
		});
		console.log(result);
		return new Response({ list: result.data });
	}else

	if( event.path == '/googledrive-delete-file'){
		if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
			throw Error("invalid apikey");
		
		var body = JSON.parse(event.body);
		console.log(body);

		var result = await drive.files.update({
			fileId: body.fileId,
			resource: { trashed: true },
		});
		console.log(result);
		return new Response({});
	}else

	if( event.path == '/googledrive-upload-file'){
		// var result = await drive.files.create({
		// 	requestBody: {
		// 		name: body.name,
		// 		mimeType: body.mimeType,
		// 		parents: [ body.parentId ]
		// 	},
		// 	media: {}
		// }, {
		// 	params: {
		// 		uploadType: "resumable"
		// 	}
		// });
		// return new Response({ url: result });

		if( event.requestContext.apikeyAuth?.apikey != GAPI_API_KEY )
			throw Error("invalid apikey");
		
		var body = JSON.parse(event.body);
		console.log(body);

		var metadata = {
			name: body.name,
			mimeType: body.mimeType,
			parents: [ body.parentId],
			starred: true
		};
		var json = await getAccessToken();		
		const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${json.access_token}`,
				'Content-Type': 'application/json; charset=UTF-8',
			},
			body: JSON.stringify(metadata),
		});
		console.log(res);

		return new Response({ url: res.headers.get('location')} );
	}else

	if( event.path == '/googledrive-uploading'){
		var json = await getAccessToken();		
    const headers = {
			'Authorization': `Bearer ${json.access_token}`,
      'Content-Length': event.body.length,
      'Content-Type': 'application/octet-stream',
      'Content-Range': event.headers["content-range"],
    };
    const res = await fetch(event.headers["target"], {
      method: 'PUT',
      headers,
      body: event.body,
    });

    if (!res.ok && res.status !== 308) {
      throw new Error(`Upload failed at chunk ${res.statusText}`);
    }

		return new Response({ message: "OK"}, res.status);
	}else

	{
		throw new Error("Unknown endpoint");
	}
};

async function getAccessToken(){
		var json = await jsonfile.read_json(TOKEN_FILE_PATH);
	if (!json) {
		console.log('file is not ready.');
		throw 'file is not ready.';
	}
	if( (json.expiry_date - 3 * 60 * 1000) < new Date().getTime() ){
		var input = {
			url: token_url_base + "/gapi/token-refresh",
			api_key: GAPI_API_KEY
		};
		var result = await HttpUtils.do_http(input);
		console.log(result);
		json = await jsonfile.read_json(TOKEN_FILE_PATH);
	}
	return json;
}