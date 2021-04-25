const ffmpeg = require('fluent-ffmpeg')
const path = require('path')

module.exports = (videoFile, videoId) => {
  new ffmpeg(videoFile)
    .takeScreenshots(
      {
        count: 1,
        filename: `${videoId}.png`
      },
      path.join(__dirname, 'public', 'thumb')
    )
  return `/thumb/${videoId}.png`
}