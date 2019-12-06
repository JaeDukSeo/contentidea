// Required!
require("dotenv").config();
require('isomorphic-fetch');

// Main
const http = require("http");
const next = require("next");
const express = require('express')
const session = require("express-session");

// Configuration 
const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";

// Auth
const passport = require("passport");
const Auth0Strategy = require("passport-google-oauth").OAuth2Strategy;
const uid = require('uid-safe');

// Next
const app = next({ dev, dir: "./frontend" });
const handle = app.getRequestHandler();

// Custome API
const googleTrends = require("./google_trends");
const authRoutes = require("./auth-routes");

// Run the Server
app.prepare().then(() => {

    const server = express();
    const sessionConfig = {
        secret: uid.sync(18),
        cookie: {
            maxAge: 86400 * 1000 // 24 hours in milliseconds
        },
        resave: false,
        saveUninitialized: true
    };
    server.use(session(sessionConfig));
    const auth0Strategy = new Auth0Strategy(
        {
            clientID: process.env.AUTH_CLIENT_ID,
            clientSecret: process.env.AUTH_SEC,
            callbackURL: [process.env.AUTH_CALLBACK_URL]
        },
        function (accessToken, refreshToken, extraParams, profile, done) {
            return done(null, profile);
        }
    );

    // 4 - configuring Passport
    passport.use(auth0Strategy);
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    // 5 - adding Passport and authentication routes
    server.use(passport.initialize());
    server.use(passport.session());
    server.use(authRoutes);
    server.use(googleTrends);

    // 6 - you are restricting access to some routes
    const restrictAccess = (req, res, next) => {
        if (!req.isAuthenticated()) return res.redirect("/login");
        next();
    };

    // handling everything else with Next.js
    server.get("*", handle);
    http.createServer(server).listen(process.env.PORT, () => {
        console.log(`listening on port ${process.env.PORT}`);
    });
});