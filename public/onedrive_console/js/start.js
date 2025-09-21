'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const base_url = "";

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        special_list: [],
        dir_list: [],
        parent: null,
        folder: null,
        myDriveId: null,
    },
    computed: {
        folderPath: function(){
            var path;
            if( this.parent && this.parent.path )
                path = this.parent.path + "/";
            else
                path = "/";
            if( this.folder && this.folder.name )
                path += this.folder.name;
            return path;
        },
    },
    methods: {
        utc2jst: function(utc){
            var date = new Date(utc);
            return this.toLocaleString(date.getTime());
        },

        make_directory: async function(){
            var name = prompt("ディレクトリ名を入力してください。");
            if( !name )
                return;

            try{
                this.progress_open();

                var input = {
                    url: base_url + "/onedrive-make-dir",
                    body: {
                        name: name,
                        itemId: this.folder.id
                    },
                    api_key: this.apikey
                };
                if( this.folder.parentReference )
                    input.body.driveId = this.folder.parentReference.driveId;
                else if( this.folder.remoteItem )
                    input.body.driveId = this.folder.remoteItem.parentReference.driveId;
                else
                    input.body.driveId = this.folder.driveId;
                var result = await do_http(input);
                console.log(result);            

                await this.reload_dir();
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }

        },
        delete_file: async function(item){
            if( !confirm("本当に削除しますか？") )
                return;

            try{
                this.progress_open();

                var input = {
                    url: base_url + "/onedrive-delete-file",
                    body: {
                        itemId: item.id,
                    },
                    api_key: this.apikey
                };
                if( item.parentReference )
                    input.body.driveId = item.parentReference.driveId;
                else if( item.remoteItem )
                    input.body.driveId = item.remoteItem.parentReference.driveId;
                else
                    input.body.driveId = item.driveId;
                var result = await do_http(input);
                console.log(result);

                await this.reload_dir();
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },

        select_upload_file: async function(files){
            console.log(files);
            if( files.length <= 0 )
                return;

            this.file = files[0];
        },

        upload_file: async function(){
            if( !confirm("アップロードしますか？") )
                return;

            try{
                this.progress_open();

                var input = {
                    url: base_url + "/onedrive-upload-file",
                    body: {
                        name: this.file.name,
                        itemId: this.folder.id
                    },
                    api_key: this.apikey
                };
                if( this.folder.parentReference )
                    input.body.driveId = this.folder.parentReference.driveId;
                else if( this.folder.remoteItem )
                    input.body.driveId = this.folder.remoteItem.parentReference.driveId;
                else
                    input.body.driveId = this.folder.driveId;
                var result = await do_http(input);
                console.log(result);

                await uploadLargeFile(this.file, result.url);
                this.dialog_close('#file_upload_dialog');

                await this.reload_dir();
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },
        download_file: async function(item){
            if( !confirm("ダウンロードしますか？") )
                return;

            try{
                var input = {
                    url: base_url + "/onedrive-download-file",
                    body: {
                        itemId: item.id,
                    },
                    api_key: this.apikey
                };
                if( item.parentReference )
                    input.body.driveId = item.parentReference.driveId;
                else if( item.remoteItem )
                    input.body.driveId = item.remoteItem.parentReference.driveId;
                else
                    input.body.driveId = item.driveId;
                var result = await do_http(input);
                console.log(result);

                triggerDownload(result.url, result.name);
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },

        change_special: async function(special){
            try{
                this.progress_open();

                var input = {
                    url: base_url + "/onedrive-get-info",
                    body: {
                        special: special,
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);
                this.folder = result.info;
                this.parent = result.info.parentReference;
                
                var input = {
                    url: base_url + "/onedrive-list-dir",
                    body: {
                        special: special,
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);
                this.dir_list = result.list;
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },
        change_dir: async function(item){
            try{
                this.progress_open();

                var input = {
                    url: base_url + "/onedrive-get-info",
                    body: {
                        itemId: item.id
                    },
                    api_key: this.apikey
                };
                if( !item.id && item.driveId && item.driveId != this.myDriveId )
                    input.body.special = 'sharedWithMe';
                if( item.parentReference ){
                    input.body.driveId = item.parentReference.driveId;
                }else if( item.remoteItem ){
                    input.body.driveId = item.remoteItem.parentReference.driveId;
                }else{
                    input.body.driveId = item.driveId;
                }
                var result = await do_http(input);
                console.log(item);
                console.log(result);
                this.folder = result.info;
                this.parent = result.info.parentReference;

                var input = {
                    url: base_url + "/onedrive-list-dir",
                    body: input.body,
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);
                this.dir_list = result.list;
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },
        reload_dir: async function(){
            if( this.folder?.special == "sharedWithMe" )
                await this.change_special("sharedWithMe");
            else
                await this.change_dir(this.folder);
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();
        
        this.apikey = localStorage.getItem("entra_api_key");
        try{
            var input = {
                url: base_url + "/onedrive-list-special",
                api_key: this.apikey
            }
            var result = await do_http(input);
            console.log(result);
            this.special_list = result.list;
            this.myDriveId = result.drive.id;

        }catch(error){
            console.log(error);
            alert(error);
        }

        await this.change_special("");
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function uploadLargeFile(file, uploadUrl) {
  const chunkSize = 1 * 1024 * 1024;
  const totalSize = file.size;
  let start = 0;

  while (start < totalSize) {
    const end = Math.min(start + chunkSize, totalSize);
    const chunk = file.slice(start, end);

    var input = {
        url: uploadUrl,
        method: "PUT",
        content_type: "application/octet-stream",
        headers: {
            'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        },
        body: chunk
    };
    var result = await do_http(input);
    console.log(result);

    start = end;
  }
}