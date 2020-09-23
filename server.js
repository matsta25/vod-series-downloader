const https = require('https');
const {createWriteStream} = require('fs')
const request = require('request')
const progress = require('request-progress')
const jsdom = require("jsdom");
const {JSDOM} = jsdom;


let url = `https://vod.tvp.pl/website/doktor-z-alpejskiej-wioski,40675952/video?sezon=47614512&order=`

getIdsPromise = function (url) {
    return new Promise(function (resolve) {
        let results = []

        https.get(url, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                const dom = new JSDOM(data);

                for (const a of dom.window.document.querySelectorAll("a.strefa-abo__item-link")) {
                    if (a.textContent.includes("")) {
                        results.push(a.href.split(',').pop())
                    }
                }

                resolve(results)

            }).on("error", (err) => {
                console.log("Error: " + err.message);
                reject(new Error(err.message));
            });
        })
    });
}

getVideo = function download(videoId) {
    return new Promise(function (resolve) {
        https.get('https://vod.tvp.pl/sess/TVPlayer2/api.php?id=' + videoId + '&@method=getTvpConfig&@callback=callback', (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                let dataText = data;
                dataText = dataText.slice(23, -3)

                let dataJson = JSON.parse(dataText);

                let itemWithFullHd = {}
                let maxBitrate = 0

                let fileName = dataJson.content.info.title + ' - ' + dataJson.content.info.season + ' - ' + dataJson.content.info.episode + ' - ' + dataJson.content.info.subtitle;

                dataJson.content.files.forEach(item => {
                    if (item.quality.bitrate > maxBitrate) {
                        maxBitrate = item.quality.bitrate
                        itemWithFullHd = item
                    }
                })

                progress(request(itemWithFullHd.url))
                    .on('progress', state => {
                        process.stdout.write('\033c')
                        console.log(state)
                    })
                    .on('error', err => console.log(err))
                    .on('end', () => {
                        resolve()
                    })
                    .pipe(createWriteStream(fileName+'.mp4'))

            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    });
}

//main

getIdsPromise(url).then(
    (ids) => {
        const forLoop = async _ => {
            console.log('Start')

            for (let index = 9; index < ids.length; index++) {
                const id = ids[index]
                await getVideo(id)
            }

            console.log('End')
        }
        forLoop()
    }
)
