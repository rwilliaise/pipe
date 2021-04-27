const ffmpeg = require('fluent-ffmpeg')
const path = require('path')

module.exports = (videoFile, videoId) => {
  new ffmpeg(videoFile)
    .takeScreenshots(
      {
        count: 1,
        filename: `thumb.png`
      },
      path.join(__dirname, 'public', 'videos', videoId)
    )
  return `/videos/${videoId}/thumb.png`
}
