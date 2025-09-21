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
                state: searchs.state,
                offline_access: searchs.offline_access,
                tenant: searchs.tenant
            };
            if( searchs.prompt )
                qs.prompt = searchs.prompt;
//            alert(JSON.stringify(qs));
            window.location = "/entra/authorize?" + to_urlparam(qs);
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
