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
        path: "",
        dir_list: [],
        parent: null,
        folderId: null,
        folderName: "",
    },
    computed: {
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
                    url: base_url + "/googledrive-make-dir",
                    body: {
                        name: name,
                        parentId: this.folderId
                    },
                    api_key: this.apikey
                };
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
                    url: base_url + "/googledrive-delete-file",
                    body: {
                        fileId: item,
                    },
                    api_key: this.apikey
                };
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
                    url: base_url + "/googledrive-upload-file",
                    body: {
                        name: this.file.name,
                        parentId: this.folderId,
                        mimeType: this.file.type,
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);

                await uploadInChunks(this.file, result.url, base_url + "/googledrive-uploading");
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
                this.progress_open();
                var input = {
                    url: base_url + "/googledrive-download-file",
                    body: {
                        fileId: item,
                    },
                    api_key: this.apikey
                };
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

        change_dir: async function(item){
            try{
                this.progress_open();

                if( item ){
                    var input = {
                        url: base_url + "/googledrive-get-info",
                        body: {
                            fileId: item,
                        },
                        api_key: this.apikey
                    };
                    var result = await do_http(input);
                    console.log(result);

                    this.folderId = item;
                    this.folderName = result.info.name;
                    this.parent = result.info.parents ? result.info.parents[0] : null;
                }else{
                    this.folderId = null;
                    this.folderName = "マイドライブ";
                    this.parent = null;
                }

                var input = {
                    url: base_url + "/googledrive-list-dir",
                    body: {
                        folderId: item
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);
                this.dir_list = result.list.data.files;
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },
        reload_dir: async function(){
            await this.change_dir(this.folderId);
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        this.apikey = localStorage.getItem("gapi_api_key");
        await this.change_dir(null);
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

async function uploadInChunks(file, uploadUrl, forwardUrl) {
  const chunkSize = 1 * 1024 * 1024;
  const totalSize = file.size;
  let start = 0;

  while (start < totalSize) {
    const end = Math.min(start + chunkSize, totalSize);
    const chunk = file.slice(start, end);

    var input = {
        url: forwardUrl,
        method: "PUT",
        content_type: "application/octet-stream",
        headers: {
            'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
            target: uploadUrl,
        },
        body: chunk
    };
    var result = await do_http(input);
    console.log(result);

    start = end;
  }

  console.log('✅ Upload complete');
}
