import fetch from "node-fetch"
import config = require("../../config.json")

interface Artist {
    name: string;
}

interface SpotifyTrack {
    artists: Artist[];
    name: string;
    // eslint-disable-next-line camelcase
    duration_ms: number;
}
interface PlaylistTracks {
    items: [
        {
            track: SpotifyTrack;
        }
    ];
    next: string | null;
}

interface Playlist {
    tracks: PlaylistTracks;
    name: string;
}

export default class SpotifyParser {
    private _REGEX: RegExp;
    private _auth: string;
    private _token: string;
    private _requestHeaders: { "Content-Type": string; Authorization: any; };
    private _baseURL: string;

    constructor () {
        this._baseURL = "https://api.spotify.com/v1"
        this._REGEX = /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?playlist[/:]([A-Za-z0-9]+)/
        this._auth = Buffer.from(`${config.spotify.id}:${config.spotify.secret}`).toString("base64")
        this._token = ""
        this._requestHeaders = {
            "Content-Type": "application/json",
            Authorization: this._token
        }

        this.renew()
    }

    async getID (url: string): Promise<string|boolean> {
        const [, id] = url.match(this._REGEX) ?? []

        if (!id) return false

        return id
    }

    async getTracks (id: string) {
        if (!this._token) { await this.renew() }
        const playlist: Playlist = await fetch(`${this._baseURL}/playlists/${id}`, {
            headers: this._requestHeaders
        }).then(r => r.json())

        const tracks = playlist.tracks.items.map((item) => this.resolveTrack(item.track))
        let next = playlist.tracks.next

        while (next) {
            const data: PlaylistTracks = await fetch(next!!, {
                headers: this._requestHeaders
            }).then(r => r.json())
            tracks.push(...data.items.map(item => this.resolveTrack(item.track)))
            next = data.next
        }
        return { tracks, name: playlist.name }
    }

    private async resolveTrack (track: SpotifyTrack) {
        if (!track) throw new ReferenceError("The Spotify track object was not provided")
        if (!track.artists) throw new ReferenceError("The track artists array was not provided")
        if (!track.name) throw new ReferenceError("The track name was not provided")
        if (!Array.isArray(track.artists)) throw new TypeError(`The track artists must be an array, received type ${typeof track.artists}`)
        if (typeof track.name !== "string") throw new TypeError(`The track name must be a string, received type ${typeof track.name}`)

        return {
            title: track.name,
            author: track.artists[0].name,
            duration: track.duration_ms
        }
    }

    private async renewToken (): Promise<number|null> {
        try {
            const res = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                body: "grant_type=client_credentials",
                headers: {
                    Authorization: `Basic ${this._auth}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(r => r.json())

            this._token = `Bearer ${res.access_token}`
            this._requestHeaders.Authorization = this._token

            return res.expires_in * 1000
        } catch (error) {
            throw new Error(error)
        }
    }

    private async renew (): Promise<any> {
        return setTimeout(this.renew.bind(this), (await this.renewToken())!!)
    }
}
