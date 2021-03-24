import * as express from "express"
import * as jwt from "jsonwebtoken"
import * as cookieParser from "cookie-parser"
import { google, Auth } from "googleapis"
import SpotifyParser from "./lib/SpotifyParser"
import YoutubeConnector from "./lib/YoutubeConnector"
import config = require("../config.json")

const OAuth2 = google.auth.OAuth2
const oauthClient = new OAuth2(config.creds.web.client_id, config.creds.web.client_secret, config.creds.web.redirect_uris[0])
const authURL = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: config.creds.web.scopes
})
const parser = new SpotifyParser()

const app = express()
app.use(cookieParser())
app.use(express.static("public"))
app.set("views", "views")
app.set("view engine", "ejs")

app.get("/", async (req: express.Request, res: express.Response) => {
    let isLoggedIn = false
    if (req.cookies.auth) {
        try {
            jwt.verify(req.cookies.auth, config.secret)
            isLoggedIn = true
        } catch (error) {

        }
    }

    res.render("index.ejs", {
        logButtonText: isLoggedIn ? "Logout" : "Login"
    })
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
            return res.redirect("/")
        })
    }
})

app.get("/api/handleuser", async (req: express.Request, res: express.Response) => {
    if (req.cookies.auth) {
        res.clearCookie("auth")
        res.redirect("/")
        return
    }

    res.redirect("/login")
})

app.get("/api/user", async (req: express.Request, res: express.Response) => {
    if (!req.cookies.auth) return res.status(401).send("kek")

    console.log(jwt.verify(req.cookies.auth, config.secret) as Auth.Credentials)
    res.send("logged in ")
})

app.post("/convert", async (req: express.Request, res: express.Response) => {
    if (!req.cookies.auth) return res.status(401).send("Please login and continue")
    const playlist = req.query.playlist

    if (!playlist) res.status(400).send("no playlist")
    const localOauthClient = new OAuth2(config.creds.web.client_id, config.creds.web.client_secret, config.creds.web.redirect_uris[0])
    localOauthClient.credentials = jwt.verify(req.cookies.auth, config.secret) as Auth.Credentials

    const playlistId = await parser.getID(playlist as string)
    if (!playlistId) {
        res.status(417).send("can't parse spotify playlist ID")
        return
    }

    res.status(200).send("Started service, playlist shall be available in your youtube profile when completed")

    const data = await parser.getTracks(playlistId as string)
    const ytService = google.youtube("v3")

    const playlistCreateData = await ytService.playlists.insert({
        auth: localOauthClient,
        part: [
            "snippet"
        ],
        requestBody: {
            snippet: {
                title: data.name
            }
        }
    })

    for (const track of data.tracks) {
        const t = await YoutubeConnector.searchTrack((await track).title, (await track).author)
        if (t) {
            ytService.playlistItems.insert({
                auth: localOauthClient,
                part: [
                    "snippet"
                ],
                requestBody: {
                    snippet: {
                        playlistId: playlistCreateData.data.id,
                        resourceId: {
                            kind: "youtube#video",
                            videoId: t
                        }
                    }
                }
            })
        }
    }
})

app.listen(config.port, () => {
    console.log("Server ready to roll")
})
