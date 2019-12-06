// Mains
const bodyParser = require("body-parser");
const express = require("express");
const router = express.Router();

// apis 
const googleTrends = require('google-trends-api');
router.use(bodyParser.json());

router.get("/api/daily", (req, res) => {

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
                    daily.push(trendingSearches.title.query)
                })
            });
            const onlysearch = results_json.trendingSearchesDays

            res.json({ daily })
        }
    });

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




module.exports = router;