"use strict";

const cheerio = require("cheerio");
const fs = require("fs");
const https = require("https");
const turndown = require("turndown");

fs.readFile("sources.json", (err, data) => {
  if (err) {
    console.error(err);
  } else {
    JSON.parse(data).map((source) => evaluateSource(source));
  }
});

async function evaluateSource(source) {
  const td = new turndown();
  const basePath = `histories/${source.name}`;
  await fs.mkdir(basePath, { recursive: true }, (err) =>
    err ? console.error(err) : ""
  );
  source.copy.map((copy) => {
    https
      .get(copy.url, (response) => {
        let html = "";
        response.on("data", (chunk) => {
          html += chunk;
        });
        response.on("end", function () {
          const content = cheerio.load(html);
          if (!content) {
            console.error("Unable to load html content:", content, response)
            return
          }

          const selectorHtml = content(source.selector || copy.selector).html()
          if (!selectorHtml) {
            console.error("Selector did not find HTML content:", copy, source, content.html())
            return
          }

          const markdown = td.turndown(selectorHtml);
          fs.writeFile(`${basePath}/${copy.title}.md`, markdown, (err) =>
              err ? console.error(err) : ""
          );
        });
      })
      .on("error", (error) => {
        console.error(error);
      })
      .end();
  });
}
