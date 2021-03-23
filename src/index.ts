import * as express from "express"
import * as jwt from "jsonwebtoken"
import * as cookieParser from "cookie-parser"
import { google } from "googleapis"
import config = require("../config.json")

const OAuth2 = google.auth.OAuth2
const oauthClient = new OAuth2(config.creds.web.client_id, config.creds.web.client_secret, config.creds.web.redirect_uris[0])
const authURL = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: config.creds.web.scopes
})

const app = express()
app.use(cookieParser())

app.get("/", async (req: express.Request, res: express.Response) => {
    res.send("WIP")
})

app.get("/login", async (req: express.Request, res: express.Response) => {
    res.redirect(authURL)
})

app.get("/auth_callback", async (req: express.Request, res: express.Response) => {
    if (req.query.error) {
        return res.redirect("/")
    } else {
        oauthClient.getToken(req.query.code, function (err, tokenData) {
            if (err) { return res.redirect("/") }

            res.cookie("auth", jwt.sign(tokenData!!, config.secret))
            return res.redirect("/logged_in")
        })
    }
})

app.get("/logged_in", async (req: express.Request, res: express.Response) => {
    if (!req.cookies.auth) return res.status(401).send("kek")

    res.send("logged in ")
})

app.listen(config.port, () => {
    console.log("Server ready to roll")
})
