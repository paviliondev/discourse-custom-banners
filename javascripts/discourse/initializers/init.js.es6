import { withPluginApi } from "discourse/lib/plugin-api";
import {
    default as computed,
    observes,
    on
  } from "ember-addons/ember-computed-decorators";
  import { scheduleOnce, schedule } from "@ember/runloop";

  export default {
    name: 'custom-banners-init',
    initialize(){
        withPluginApi("0.8.33", init);
    }
}

const jsonParseSafe = (json) => {
    let obj;
    try {
         obj = JSON.parse(json);
    } catch(e) {
        obj = false;
    }
    return obj;
}

const init = (api) => {
   api.modifyClass('component:topic-list', {
    @on('didRender')
    applyMods() {
        schedule('afterRender', () => {
            const category = this.get('category');
            if(category) {
                this.$().closest('#main-outlet').find('.rstudio-banner').remove();
                const catList = settings.discovery_categories_html.split('|');
                const catListParsed = catList.map(obj => jsonParseSafe(obj));
                const cat = catListParsed.find(obj => obj.category_slug == category.slug);
                if(!cat) return;
                const renderSettings = cat;
                const categoryHeaderHtml = $.parseHTML(`<div class="rstudio-banner"></div>`);
                $(categoryHeaderHtml).css('height', renderSettings.height);
                renderSettings.boxes.forEach((box) => {
                    const node = $.parseHTML(`<div class="rstudio-cat-block">${box.content}</div>`);
                    $(node).css("width", box.width);
                    $(categoryHeaderHtml).append(node);
                });

                this.$().closest('#main-outlet').prepend(categoryHeaderHtml);
                eval(settings.categories_javascript_code);
            } else {
                // discovery page
                // show banner
                this.$().closest('#main-outlet').find('.rstudio-banner').remove();

                const headerHtml = `<div class="rstudio-banner">
                    <div class="rstudio-block b1">${settings.discovery_page_block_html_1}</div>
                    <div class="rstudio-block b2">${settings.discovery_page_block_html_2}</div>
                    <div class="rstudio-block b3">${settings.discovery_page_block_html_3}</div>
                    </div>`;
                
                this.$().closest('#main-outlet').prepend(headerHtml);
            }
            eval(settings.discovery_javascript_code);
          });
    }
   });
} 