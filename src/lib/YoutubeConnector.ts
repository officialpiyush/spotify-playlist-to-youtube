import * as ytsr from "ytsr"

export default class YoutubeConnector {
    static async searchTrack (song: string, artist: string) {
        const basicFilters = await (await ytsr.getFilters(`${song} ${artist}`)).get("Type")?.get("Video")

        const resultData = await ytsr(basicFilters?.url!!)

        return (resultData.items.length <= 0 ? null : resultData.items[0].id)
    }
}
