/* eslint-disable no-undef */
async function onConvertClick() {
    const playlistURL = document.getElementById("playlist").value
    if (!playlistURL) {
        Swal.fire({
            icon: "error",
            title: "Invaid input"
        })
        return
    }
    const res = await fetch(`/convert?playlist=${playlistURL}`, {
        method: "POST"
    })

    if (res.status !== 200) {
        Swal.fire({
            icon: "error",
            title: "Something went wrong",
            text: (await res.text())
        })
        return
    }

    Swal.fire(
        "Initialized",
        "The playlist shall be available in your profile soon",
        "success"
    )
}