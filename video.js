const videojs = require('video.js')

require('videojs-contrib-quality-levels')
require('videojs-hls-quality-selector')

var player = videojs(document.querySelector('.video-js'))

player.qualityLevels()

player.hlsQualitySelector({
  displayCurrentQuality: true,
})
