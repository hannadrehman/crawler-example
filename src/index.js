import Crawler from 'crawler';
import { parse } from 'json2csv'
import fastQ from 'fastq';
import fs from 'fs';


const base = 'https://www.1000bulbs.com'
var stream = fs.createWriteStream('./bulbs.csv', { flags: 'a' });


const queue = fastQ.promise(async (args) => {
  try {
    const csv = parse(args);
    stream.write(csv, function() {
      console.log(
        '...........record written to csv..............'
      )
    });

  } catch (err) {
    console.error(err);
  }

}, 1)



const descriptionCrawler = new Crawler({
  maxConnections: 20,
  callback: function(error, res, done) {
    if (error) {
      console.log(error);
    } else {
      var $ = res.$;

      const product = {};

      const heading = $('.product-heading-align');
      product.id = $($('form')[2]).attr('data-id')
      product.title = $(heading).find('h1').text().replaceAll('\n', '')
      product.subtitle = $(heading).find('h2').text().replaceAll('\n', '')
      product.imageUrl = $('.default.image-thumb.no-click').attr('data-image')
      product.description = $('.description').find('ul,p').text()
      product.documents = [];

      $('.documents').find('ul').find('li').each((i, elem) => {
        const $elem = $(elem);
        const doc = {
          title: $elem.text().replaceAll('\n', ''),
          href: $elem.find('a').attr('href')
        }
        product.documents.push(doc)
      })
      product.specification = []

      $('#Specifications').find('table').each((i, elem) => {
        const $elem = $(elem);
        $elem.find('tr').each((_, tr) => {
          const row = {}
          $(tr).find('td').each((index, item) => {
            const $item = $(item)
            if (index === 0) {
              row.key = $item.text().replaceAll('\n', '');
            }
            if (index === 1) {
              row.value = $item.text().replaceAll('\n', '');
            }
          })
          product.specification.push(row)
        })
      })
      queue.push(product)
        .catch((e) => console.log('......queue failure', e))
    }
    done();
  }
});



let searchUrl = `${base}/fil/search?page=1`;

const baseCrawler = new Crawler({
  maxConnections: 1,
  rateLimit: 5000,
  callback: function(error, res, done) {
    if (error) {
      console.log(error);
    } else {

      var $ = res.$;
      const searchPageProducts = []

      $('.product-overview').each((_, product) => {
        const $product = $(product)
        const link = $product.find('a');
        const targetLink = link['3'];

        const title = $(targetLink).find('h5').text().replaceAll('\n', '')
        const subtitle = $(targetLink).find('h6').text().replaceAll('\n', '')
        const href = $(targetLink).attr('href')
        searchPageProducts.push({ title, subtitle, href })
      })

      const urls = searchPageProducts.map(item => `${base}${item.href}`)
      descriptionCrawler.queue(urls)

      const crawlUrl = new URL(searchUrl);
      const page = Number(crawlUrl.searchParams.get('page'));
      console.log(`.............crawled page ${page}...................`)
      const nextPage = page + 1;

      searchUrl = searchUrl.replace(`=${page}`, `=${nextPage}`);

      baseCrawler.queue(searchUrl);
    }
    done();
  }
});


baseCrawler.queue(searchUrl);
