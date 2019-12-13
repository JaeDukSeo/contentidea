// Mains
const bodyParser = require("body-parser");
const express = require("express");
const router = express.Router();

// apis 
const googleTrends = require('google-trends-api');
const { ExploreTrendRequest, SearchProviders } = require('g-trends')
const explorer = new ExploreTrendRequest()
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SITE_EMAIL,
        pass: process.env.SITE_EMAIL_PASS
    }
})

// 
// 
// 
router.use(bodyParser.json());
router.get("/api/daily", (req, res) => {

    var daily = [];
    var daily_num = []

    googleTrends.dailyTrends({
        trendDate: new Date(),
        geo: 'US',
    }, function (err, results) {
        if (err) {
            console.error('Oh no there was an error', err);
            res.send(err);
        } else {
            const results_json = JSON.parse(results).default
            var daily = [];
            results_json.trendingSearchesDays.forEach(function (trendingSearchesDays) {
                trendingSearchesDays.trendingSearches.forEach(function (trendingSearches) {
                    daily.push([trendingSearches.title.query, trendingSearches.formattedTraffic])
                })
            });

            res.json({ daily })
        }
    })
});
router.get("/api/realtime", (req, res) => {

    googleTrends.realTimeTrends({
        geo: 'US',
        category: 'all',
    }, function (err, results) {
        if (err) {
            console.error('Oh no there was an error', err);
            res.send(err);
        } else {
            const results_json = JSON.parse(results).storySummaries.trendingStories

            var realtime = [];

            Object.keys(results_json).map(function (key, index) {
                realtime.push(results_json[key].title)
            });

            res.json({ realtime })
        }
    });

});
router.get("/api/getnumbers/:keyword", (req, res) => {
    let keyword = req.params.keyword
    var oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() -  1);
    googleTrends.interestOverTime({ keyword: keyword, startTime: oneYearFromNow })
        .then(function (results) {
            var JSON_results = JSON.parse(results).default.timelineData

            var time_and_number = {}
            Object.keys(JSON_results).map(function (key, index) {
                time_and_number[JSON_results[key].time] = parseFloat(JSON_results[key].formattedValue[0].match(/\d/g).join(""))
            });

            res.json({ time_and_number })
        })
        .catch(function (err) {
            console.error(err);
            throw new Error(err)
        });
});
router.get("/api/getrelated/:keyword", (req, res) => {
    let keyword = req.params.keyword
    googleTrends.relatedQueries({ keyword: keyword })
        .then((results) => {
            var top_3_list = JSON.parse(results).default.rankedList[0].rankedKeyword.slice(0, 3).map(e => e.query)
            res.json(top_3_list)
        })
        .catch((err) => {
            console.log(err);
        })
});



module.exports = router;