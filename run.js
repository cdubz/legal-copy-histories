"use strict";

const cheerio = require("cheerio");
const fs = require("fs");
const https = require("https");
const turndown = require("turndown");

fs.readFile("sources.json", (err, data) => {
  if (err) {
    console.log(err);
  } else {
    JSON.parse(data).map((source) => evaluateSource(source));
  }
});

async function evaluateSource(source) {
  const td = new turndown();
  const basePath = `histories/${source.name}`;
  await fs.mkdir(basePath, { recursive: true }, (err) =>
    err ? console.log(err) : ""
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
          const markdown = td.turndown(
            content(source.selector || copy.selector).html()
          );
          fs.writeFile(`${basePath}/${copy.title}.md`, markdown, (err) =>
            err ? console.log(err) : ""
          );
        });
      })
      .on("error", (error) => {
        console.error(error);
      })
      .end();
  });
}
