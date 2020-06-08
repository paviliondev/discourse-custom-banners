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

const categoryHtmlDisplay = (categorySlug) => {
  removeBanners();
  const catList = settings.discovery_categories_html.split('|');
  const catListParsed = catList.map(obj => jsonParseSafe(obj));
  const cat = catListParsed.find(obj => obj.category_slug == categorySlug);
  if (!cat) return;
  const renderSettings = cat;
  const categoryHeaderHtml = $.parseHTML(`<div class="rstudio-banner"></div>`);
  $(categoryHeaderHtml).css('height', renderSettings.height);

  renderSettings.boxes.forEach((box) => {
    const node = $.parseHTML(`<div class="rstudio-cat-block">${box.content}</div>`);
    $(node).css("width", box.width);
    if (box.id) {
      $(node).attr('id', box.id);
    }
    $(categoryHeaderHtml).append(node);
  });
  
  $('.category-heading').hide();
  
  if ($('#banner').length){
    $(categoryHeaderHtml).insertAfter($('#banner').closest('.container'));
  } else if ($('[id^="global-notice"]').length) {
    $(categoryHeaderHtml).insertAfter($('[id^="global-notice"]').last());
  } else {
    $('#main-outlet').prepend(categoryHeaderHtml);
  }
  
  if (renderSettings.javascript_code) {
    eval(renderSettings.javascript_code);
  }
}

const discoveryHtmlDisplay = () => {
  removeBanners();
  const headerHtml = `<div class="rstudio-banner">
    <div class="rstudio-block b1">${settings.discovery_page_block_html_1}</div>
    <div class="rstudio-block b2">${settings.discovery_page_block_html_2}</div>
    <div class="rstudio-block b3">${settings.discovery_page_block_html_3}</div>
    </div>`;

  const topBlock = `<div class="rstudio-top-block">
    ${settings.discovery_page_top_block_html}
  </div>`;
  
  if ($('#banner').length){
    $(topBlock+headerHtml).insertAfter($('#banner').closest('.container'));
  } else if($('[id^="global-notice"]').length) {
    $(topBlock+headerHtml).insertAfter($('[id^="global-notice"]').last());
  } else {
    $('#main-outlet').prepend(topBlock+headerHtml);
  }
  
  if (settings.discovery_javascript_code) {
    eval(settings.discovery_javascript_code);
  }
}

const removeBanners = () => {
  $('.rstudio-top-block').remove();
  $('.rstudio-banner').remove();
}

const nonCategorySettings = [
  'discovery_page_block_html_1',
  'discovery_page_block_html_2',
  'discovery_page_block_html_3',
  'discovery_page_top_block_html'
]

const init = (api) => {
  api.modifyClass('component:topic-list', {
    @on('didRender')
    applyMods() {
      if (this.site.isMobileDevice || !this.get('discoveryList')) {
        return;
      }
      
      scheduleOnce('afterRender', () => {
        const category = this.get('category');
        const nonCategoryEnabled = nonCategorySettings.some(name => {
          return settings[name].length;
        });
        
        if (category) {
          categoryHtmlDisplay(category.slug);
        } else if (nonCategoryEnabled) {
          discoveryHtmlDisplay();
        }
      });
    },

    @on('willDestroyElement')
    removeBanner(){
      if (this.site.isMobileDevice) {
        return;
      }
      removeBanners();
    }
  });

  api.modifyClass('component:categories-only', {
    @on('didRender')
    applyMods(){
      if (this.site.isMobileDevice) {
        return;
      }

      discoveryHtmlDisplay();
    },

    @on('willDestroyElement')
    removeBanner(){
      if (this.site.isMobileDevice) {
        return;
      }
      removeBanners();
    }
  });

  api.modifyClass('component:discourse-topic', {
    @on('didRender')
    applyMods(){
      if (this.site.isMobileDevice) {
        return;
      }
      scheduleOnce('afterRender',() => {
        const category = this.get('topic.category');
        categoryHtmlDisplay(category.slug);
      });
    },

    @on('willDestroyElement')
    removeMods(){
      if (this.site.isMobileDevice) {
        return;
      }
      removeBanners();
    }
  });
}
