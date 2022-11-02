import { withPluginApi } from "discourse/lib/plugin-api";
import {
  default as computed,
  observes,
  on,
} from "discourse-common/utils/decorators";
import { scheduleOnce, schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";
import { getOwner } from "discourse-common/lib/get-owner";
import Session from "discourse/models/session";

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

const categoryHtmlDisplay = (categorySlug, queryParams, isMobileDevice) => {
  removeBanners();

  const discoveryCategoriesHtml = isMobileDevice
    ? settings.discovery_categories_mobile_html
    : settings.discovery_categories_html;

  const catList = discoveryCategoriesHtml.split("|");
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

const topicHtmlDisplay = (categorySlug, isMobileDevice) => {
  removeBanners();

  const discoveryCategoriesHtml = isMobileDevice
    ? settings.discovery_categories_mobile_html
    : settings.discovery_categories_html;

  const catList = discoveryCategoriesHtml.split("|");
  const catListParsed = catList.map((obj) => jsonParseSafe(obj));
  const catSettingsList = catListParsed.filter(
    (obj) => obj.category_slug == categorySlug
  );

  const topicCategoriesHtml = isMobileDevice
    ? settings.topic_categories_mobile_html
    : settings.topic_categories_html;

  const topicCatList = topicCategoriesHtml.split("|");
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

  const darkScheme = Session.currentProp("defaultColorSchemeIsDark");
  const block1 = settings.discovery_page_block_html_1;
  const block2 = settings.discovery_page_block_html_2;
  const block3 = settings.discovery_page_block_html_3;
  const darkBlock1 = settings.discovery_page_block_html_1_dark;
  const darkBlock2 = settings.discovery_page_block_html_2_dark;
  const darkBlock3 = settings.discovery_page_block_html_3_dark;
  const pageBlock = settings.discovery_page_top_block_html;
  const darkPageBlock = settings.discovery_page_top_block_html_dark;

  const headerHtml = `<div class="custom-banner">
    <div class="banner-block b1">${darkScheme ? darkBlock1 : block1}</div>
    <div class="banner-block b2">${darkScheme ? darkBlock2 : block2}</div>
    <div class="banner-block b3">${darkScheme ? darkBlock3 : block3}</div>
    </div>`;

  const topBlock = `<div class="custom-top-block">
    ${darkScheme ? darkPageBlock: pageBlock}
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
  "discovery_page_block_html_1_dark",
  "discovery_page_block_html_2_dark",
  "discovery_page_block_html_3_dark",
  "discovery_page_top_block_html",
  "discovery_page_top_block_html_dark",
];

const init = (api) => {
  api.modifyClass("component:discovery-topics-list", {
    pluginId: "discourse-custom-banners",
    // need the router for query params
    router: service(),

    @on("didRender")
    applyMods() {
      scheduleOnce("afterRender", () => {
        const controller = getOwner(this).lookup("controller:discovery/topics");
        const category = controller.get("category");
        const nonCategoryEnabled = nonCategorySettings.some((name) => {
          return settings[name].length;
        });
        const currentRoute = this.get("router.currentRoute");
        const queryParams = currentRoute.queryParams;

        if (category) {
          categoryHtmlDisplay(
            category.slug,
            queryParams,
            this.site.isMobileDevice
          );
        } else if (nonCategoryEnabled && currentRoute.parent.name === "discovery") {
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
    @on("didRender")
    applyMods() {
      const category = this.get("topic.category");
      if (category) {
        scheduleOnce("afterRender", () =>
          topicHtmlDisplay(category.slug, this.site.isMobileDevice)
        );
      }
    },

    @on("willDestroyElement")
    removeMods() {
      removeBanners();
    },
  });
};
