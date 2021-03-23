import * as ytsr from "ytsr"

export default class YoutubeConnector {
    static async searchTrack (song: string, artist: string) {
        const basicFilters = await ytsr.getFilters(`${song} ${artist}`)
        const normalFilter = basicFilters.get("Type")?.get("Video")

        const resultData = await ytsr(normalFilter?.url!!)

        return (resultData.items.length <= 0 ? null : resultData.items[0].url)
    }
}
