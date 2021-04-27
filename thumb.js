const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const path = require('path')

module.exports = (videoFile, videoId) => {
  ffmpeg(videoFile)
    .takeScreenshots(
      {
        count: 1,
        filename: `thumb.png`
      },
      path.join(__dirname, 'public', 'videos', videoId)
    )
  return `/videos/${videoId}/thumb.png`
}
