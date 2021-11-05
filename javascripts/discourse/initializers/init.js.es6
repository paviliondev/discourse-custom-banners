import { withPluginApi } from "discourse/lib/plugin-api";
import {
  default as computed,
  observes,
  on,
} from "discourse-common/utils/decorators";
import { scheduleOnce, schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";

export default {
  name: "custom-banners-init",
  initialize() {
    withPluginApi("0.8.33", init);
  },
};

const jsonParseSafe = (json) => {
  let obj;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    obj = false;
  }
  return obj;
};

const categoryHtmlDisplay = (categorySlug, queryParams) => {
  removeBanners();
  const catList = settings.discovery_categories_html.split("|");
  const catListParsed = catList.map((obj) => jsonParseSafe(obj));
  const catSettingsList = catListParsed.filter(
    (obj) => obj.category_slug == categorySlug
  );

  const perTagRenderSettings = catSettingsList.find(
    (obj) => obj.tag == queryParams.tags
  );

  const fallbackRenderSettings = catSettingsList.find((obj) => !obj.tag);

  const renderSettings = perTagRenderSettings
    ? perTagRenderSettings
    : fallbackRenderSettings;

  if (!renderSettings) return;

  const categoryHeaderHtml = $.parseHTML(`<div class="custom-banner"></div>`);
  $(categoryHeaderHtml).css("height", renderSettings.height);

  renderSettings.boxes.forEach((box) => {
    const node = $.parseHTML(
      `<div class="custom-cat-block">${box.content}</div>`
    );
    $(node).css("width", box.width);
    if (box.id) {
      $(node).attr("id", box.id);
    }
    $(categoryHeaderHtml).append(node);
  });

  $(".category-heading").hide();

  if ($("#banner").length) {
    $(categoryHeaderHtml).insertAfter($("#banner").closest(".container"));
  } else if ($('[id^="global-notice"]').length) {
    $(categoryHeaderHtml).insertAfter($('[id^="global-notice"]').last());
  } else {
    $("#main-outlet").prepend(categoryHeaderHtml);
  }

  if (renderSettings.javascript_code) {
    eval(renderSettings.javascript_code);
  }
};

const topicHtmlDisplay = (categorySlug) => {
  removeBanners();
  const catList = settings.discovery_categories_html.split("|");
  const catListParsed = catList.map((obj) => jsonParseSafe(obj));
  const catSettingsList = catListParsed.filter(
    (obj) => obj.category_slug == categorySlug
  );

  const topicCatList = settings.topic_categories_html.split("|");
  const topicCatListParsed = topicCatList.map((obj) => jsonParseSafe(obj));
  const topicCatSettingsList = topicCatListParsed.filter(
    (obj) => obj.category_slug == categorySlug
  );

  const topicRenderSettings = topicCatSettingsList.find(
    (obj) => obj.category_slug == categorySlug
  );

  // we'll fall back to a tagless category setting if exists
  const categoryRenderSettings = catSettingsList.find((obj) => !obj.tag);

  const renderSettings = topicRenderSettings
    ? topicRenderSettings
    : categoryRenderSettings;

  if (!renderSettings) return; // topic not in category with banner

  const topicHeaderHtml = $.parseHTML(`<div class="custom-banner"></div>`);
  $(topicHeaderHtml).css("height", renderSettings.height);

  renderSettings.boxes.forEach((box) => {
    const node = $.parseHTML(
      `<div class="custom-cat-block">${box.content}</div>`
    );
    $(node).css("width", box.width);
    if (box.id) {
      $(node).attr("id", box.id);
    }
    $(topicHeaderHtml).append(node);
  });

  if ($("#banner").length) {
    $(topicHeaderHtml).insertAfter($("#banner").closest(".container"));
  } else if ($('[id^="global-notice"]').length) {
    $(topicHeaderHtml).insertAfter($('[id^="global-notice"]').last());
  } else {
    $("#main-outlet").prepend(topicHeaderHtml);
  }

  if (renderSettings.javascript_code) {
    eval(renderSettings.javascript_code);
  }
};

const discoveryHtmlDisplay = () => {
  removeBanners();
  const headerHtml = `<div class="custom-banner">
    <div class="banner-block b1">${settings.discovery_page_block_html_1}</div>
    <div class="banner-block b2">${settings.discovery_page_block_html_2}</div>
    <div class="banner-block b3">${settings.discovery_page_block_html_3}</div>
    </div>`;

  const topBlock = `<div class="custom-top-block">
    ${settings.discovery_page_top_block_html}
  </div>`;

  if ($("#banner").length) {
    $(topBlock + headerHtml).insertAfter($("#banner").closest(".container"));
  } else if ($('[id^="global-notice"]').length) {
    $(topBlock + headerHtml).insertAfter($('[id^="global-notice"]').last());
  } else {
    $("#main-outlet").prepend(topBlock + headerHtml);
  }

  if (settings.discovery_javascript_code) {
    eval(settings.discovery_javascript_code);
  }
};

const removeBanners = () => {
  $(".custom-top-block").remove();
  $(".custom-banner").remove();
};

const nonCategorySettings = [
  "discovery_page_block_html_1",
  "discovery_page_block_html_2",
  "discovery_page_block_html_3",
  "discovery_page_top_block_html",
];

const init = (api) => {
  api.modifyClass("component:topic-list", {
    pluginId: "discourse-custom-banners",
    // need the router for query params
    router: service(),

    @on("didRender")
    applyMods() {
      if (this.site.isMobileDevice || !this.get("discoveryList")) {
        return;
      }

      scheduleOnce("afterRender", () => {
        const category = this.get("category");
        const nonCategoryEnabled = nonCategorySettings.some((name) => {
          return settings[name].length;
        });
        const queryParams = this.get("router.currentRoute.queryParams");

        if (category) {
          categoryHtmlDisplay(category.slug, queryParams);
        } else if (nonCategoryEnabled) {
          discoveryHtmlDisplay();
        }
      });
    },

    @on("willDestroyElement")
    removeBanner() {
      if (this.site.isMobileDevice) {
        return;
      }
      removeBanners();
    },
  });

  api.modifyClass("component:categories-only", {
    @on("didRender")
    applyMods() {
      const nonCategoryEnabled = nonCategorySettings.some((name) => {
        return settings[name].length;
      });

      if (this.site.isMobileDevice) {
        return;
      }

      if (nonCategoryEnabled) {
        discoveryHtmlDisplay();
      }
    },

    @on("willDestroyElement")
    removeBanner() {
      if (this.site.isMobileDevice) {
        return;
      }
      removeBanners();
    },
  });

  api.modifyClass("component:discourse-topic", {
    router: service(),

    @on("didRender")
    applyMods() {
      if (this.site.isMobileDevice) return;
      const category = this.get("topic.category");
      if (category) {
        scheduleOnce("afterRender", () => topicHtmlDisplay(category.slug));
      }
    },

    @on("willDestroyElement")
    removeMods() {
      if (this.site.isMobileDevice) {
        return;
      }
      removeBanners();
    },
  });
};
