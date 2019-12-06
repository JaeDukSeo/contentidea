const express = require("express");
const passport = require("passport");

const router = express.Router();

router.get("/login",
    passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }),
    (req, res) => res.redirect("/"));

router.get("/callback", (req, res, next) => {
    passport.authenticate("google", (err, user) => {
        if (err) return next(err);
        if (!user) return res.redirect("/login");
        req.logIn(user, (err) => {
            if (err) return next(err);
            res.redirect("/");
        });
    })(req, res, next);
});

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;