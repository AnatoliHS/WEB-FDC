const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginBundle = require("@11ty/eleventy-plugin-bundle");
const pluginNavigation = require("@11ty/eleventy-navigation");
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const sectionizePlugin = require("./src/_plugins/eleventy-plugin-sectionize");

module.exports = function(eleventyConfig) {
  // Consolidate all assets into /assets/
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/style.css": "/style.css" });

  // Explicitly map root-level files that need to stay at the root for SEO and icons
  eleventyConfig.addPassthroughCopy({
    "src/assets/favicon.ico": "/favicon.ico",
    "src/assets/apple-touch-icon.png": "/apple-touch-icon.png",
    "src/assets/favicon-32x32.png": "/favicon-32x32.png",
    "src/assets/favicon-16x16.png": "/favicon-16x16.png",
    "src/assets/site.webmanifest": "/site.webmanifest",
    "src/assets/android-chrome-192x192.png": "/android-chrome-192x192.png",
    "src/assets/android-chrome-512x512.png": "/android-chrome-512x512.png"
  });

  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(sectionizePlugin);
  eleventyConfig.addTemplateFormats("md");
  
  eleventyConfig.addLayoutAlias("default", "default.njk");
  eleventyConfig.addGlobalData("layout", "default");

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
  };
};
