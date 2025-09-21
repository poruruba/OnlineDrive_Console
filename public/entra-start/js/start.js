'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const base_url = "";
var new_win;

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        apikey: "",
        state: "",
        token: {},
        client_id: "",
        redirect_url: "",
        chk_offline_access: true,
        prompt:true,
        tenant_type: "microsoft"
    },
    computed: {
    },
    methods: {
        set_apikey: function(){
            var apikey = prompt("apikey");
            if( !apikey )
                return;

            localStorage.setItem("entra_api_key", apikey);
            alert("リロードしてください。");
        },

        do_token: async function(qs){
            console.log(qs);
            if( qs.state != this.state ){
                console.error("state mismatch");
                alert('state mismatch');
                return;
            }

            try{
                var input = {
                    url: base_url + "/entra/token",
                    method: "POST",
                    body: {
                        code: qs.code,
                        tenant: this.tenant_type,
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);

                this.token = result;

                this.dialog_open("#view_token_dialog");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },

        start_token_refresh: async function(){
            try{
                var input = {
                    url: base_url + "/entra/token-refresh",
                    method: "POST",
                    body: {
                        tenant: this.tenant_type,
                    },
                    api_key: this.apikey
                };
                var result = await do_http(input);
                console.log(result);

                this.token = result;

                this.dialog_open("#view_token_dialog");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        start_authorize: async function(){
            this.state = randomString(16);

            var params = {
                state: this.state,
                offline_access: this.chk_offline_access,
                prompt: this.prompt,
                tenant: this.tenant_type,
            };
            new_win = open(base_url + '/entra-login' + '?' + to_urlparam(params), null, 'width=600,height=750');
        },
        change_type: async function(){
            var input = {
                url: base_url + '/entra/client_info',
                method: "GET",
                qs: {
                    tenant: this.tenant_type
                },
                api_key: this.apikey
            };
            var result = await do_http(input);
            console.log(result);
            this.client_id = result.client_id;
            this.redirect_url = result.redirect_url;
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        this.apikey = localStorage.getItem("entra_api_key");
        try{
            var input = {
                url: base_url + '/entra/client_info',
                method: "GET",
                api_key: this.apikey
            };
            var result = await do_http(input);
            console.log(result);
            this.client_id = result.client_id;
            this.redirect_url = result.redirect_url;
        }catch(error){
            console.error(error);
            alert(error);
        }
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function to_urlparam(qs){
  var params = new URLSearchParams();
  for( var key in qs )
      params.set(key, qs[key] );
  return params.toString();
}

function randomString(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

