"use strict";

const cheerio = require("cheerio");
const fs = require("fs");
const https = require("https");
const turndown = require("turndown");

let sourceArg;
const args = process.argv.slice(2);
if (args.length !== 1) {
  return console.error('Invalid argument(s). Use source name or "--all" to update all sources.');
} else {
  sourceArg = args[0];
}

fs.readFile("sources.json", (err, data) => {
  if (err) {
    return console.error(err);
  } else {
    let sources = JSON.parse(data);
    if (sourceArg === "--all") {
      // Do nothing. Update all sources.
    } else {
      sources = sources.filter((source) => source.name === sourceArg)
    }
    if (sources.length > 0) {
      sources.map((source) => evaluateSource(source));
    } else {
      return console.error(`Invalid source "${sourceArg}".`);
    }
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
            console.error("Unable to load html content:", content, response);
            return;
          }

          const selectorHtml = content(source.selector || copy.selector)
            .map(function () {
              return cheerio(this).html();
            })
            .get()
            .join(" ");
          if (!selectorHtml) {
            console.error(
              "Selector did not find HTML content:",
              copy,
              source,
              content.html()
            );
            return;
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
