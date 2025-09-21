'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        message: '',
    },
    computed: {
    },
    methods: {
        do_login: function (searchs) {
            var qs = {
                response_type: "code",
                client_id: searchs.client_id,
                redirect_uri: searchs.redirect_url,
                state: searchs.state,
                include_granted_scopes: "user",
                token_access_type: searchs.access_type,
                prompt: searchs.prompt
            };
            const params = new URLSearchParams(qs);
            window.location = "https://www.dropbox.com/oauth2/authorize?" + params.toString();
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        if( searchs.code ){
            var qs = {
                code: searchs.code,
                state: searchs.state
            };
            window.opener.vue.do_token(qs);
            window.close();
        }else{
            this.do_login(searchs);
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
