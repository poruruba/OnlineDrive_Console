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
        dir_list: [],
        parent: null,
        folder: null,
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
                    url: base_url + "/dropbox-make-dir",
                    body: {
                        path: this.folder,
                        name: name,
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
                    url: base_url + "/dropbox-delete-file",
                    body: {
                        path:item.path_display,
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
                    url: base_url + "/dropbox-upload-file",
                    body: {
                        path: this.folder,
                        name: this.file.name
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);

                var input = {
                    url: result.url,
                    content_type: "application/octet-stream",
                    body: this.file
                }
                var result = await do_http(input);
                console.log(result);

                // await uploadLargeFile(this.folder + "/" + this.file.name, this.file, result.session_id);

                var input = {

                }
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
                    url: base_url + "/dropbox-download-file",
                    body: {
                        path: item,
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

                if( item && item != "/" ){
                    var input = {
                        url: base_url + "/dropbox-get-info",
                        body: {
                            path: item,
                        },
                        api_key: this.apikey
                    };
                    var result = await do_http(input);
                    console.log(result);

                    var paths = result.info.path_display.split('/');
                    paths.pop();
                    this.folder = result.info.path_display;
                    this.parent = paths.join('/');
                    if( this.parent == "" )
                        this.parent = "/";
                }else{
                    this.folder = "/";
                    this.parent = null;
                }

                var input = {
                    url: base_url + "/dropbox-list-dir",
                    body: {
                        path: item
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
        reload_dir: async function(){
            await this.change_dir(this.folder);
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        this.apikey = localStorage.getItem("dropbox_api_key");
        await this.change_dir("/");
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
