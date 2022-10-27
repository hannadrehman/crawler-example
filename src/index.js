import Crawler from 'crawler';
import { parse } from 'json2csv'
import fastQ from 'fastq';
import fs from 'fs';
import { unlink } from 'fs/promises'


const base = 'https://www.1000bulbs.com'
const filename = './bulbs.csv'


var stream = fs.createWriteStream(filename, { flags: 'a' });


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
      const meta = {};

      const heading = $('.product-heading-align');

      meta.id = $($('form')[2]).attr('data-id')

      product.Title = $(heading).find('h1').text().replaceAll('\n', '')
      product.Handle = product.Title.replaceAll(' ', '-')
      product.Body = $('.description').html()
      product.Vendor = '';
      product['Product Category'] = '';
      product.Tags = ''
      product.Published = 'TRUE'


      meta.subtitle = $(heading).find('h2').text().replaceAll('\n', '')

      meta.documents = [];

      $('.documents').find('ul').find('li').each((i, elem) => {
        const $elem = $(elem);
        const doc = {
          title: $elem.text().replaceAll('\n', ''),
          href: $elem.find('a').attr('href')
        }
        meta.documents.push(doc)
      })

      meta.specification = []

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
          meta.specification.push(row)
        })
      })

      meta.specification.forEach(({ key, value }, index) => {
        if (key === 'Brand') {
          product.Vendor = value
        }
        product[`Option${index + 1} Name`] = key;
        product[`Option${index + 1} Value`] = value;
      })

      product['Variant SKU'] = ''
      product['Variant Grams'] = '';
      product['Variant Inventory Tracker'] = ''
      product['Variant Inventory Qty'] = 1
      product['Variant Inventory Policy'] = 'deny'
      product['Variant Fulfillment Service'] = 'manual'
      const price = Number($('strong.price').text().replace('\n', '').replace('$', ''))

      product['Variant Price'] = price
      product['Variant Compare At Price'] = price + (price * 0.2);
      product['Variant Requires Shipping'] = 'TRUE'
      product['Variant Taxable'] = 'FALSE'
      product['Variant Barcode'] = ''
      product['Image Src'] = $('.default.image-thumb.no-click').attr('data-image')
      product['Image Position'] = 1
      product['Image Alt Text'] = product.Title
      product['Gift Card'] = 'FALSE'
      product['SEO Title'] = product.Title
      product['SEO Description'] = $('.description').text().replace('Description', '').trim()
      product['Google Shopping / Gender'] = ''
      product['Google Shopping / Age Group'] = ''
      product['Google Shopping / MPN'] = ''
      product['Google Shopping / AdWords Grouping'] = ''
      product['Google Shopping / AdWords Labels'] = ''
      product['Google Shopping / Condition'] = ''
      product['Google Shopping / Custom Product'] = ''
      product['Google Shopping / Custom Label 0'] = ''
      product['Google Shopping / Custom Label 1'] = ''
      product['Google Shopping / Custom Label 2'] = ''
      product['Google Shopping / Custom Label 3'] = ''
      product['Google Shopping / Custom Label 4'] = ''
      product['Variant Image'] = $('.default.image-thumb.no-click').attr('data-image')
      product['Variant Weight Unit'] = ''
      product['Variant Tax Code'] = ''
      product['Cost per item'] = ''
      product['Price / Canada'] = ''
      product['Compare At Price / Canada'] = ''
      product['Price / International'] = ''
      product['Compare At Price / International'] = ''
      product['Status'] = 'active'

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


unlink(filename).then(() => {
  console.log('old file deleted')
  baseCrawler.queue(searchUrl);
}).catch(console.log)


