const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const path = require('path')

module.exports = (videoFile, videoId) => {
  console.log(path.join(__dirname, 'public', 'videos', videoId, 'master.m3u8'))
  ffmpeg(videoFile)
    .outputOptions([
      '-preset ultrafast',
      '-g 50',
      '-sc_threshold 0',
      '-map 0:0',
      '-map 0:1',
      '-map 0:0',
      '-map 0:1',
      '-map 0:0',
      '-map 0:1',
      '-map 0:0',
      '-map 0:1',
      '-s:v:0 640x360',
      '-c:v:0 libx264',
      '-b:v:0 800k',
      '-b:a:0 96k',
      '-s:v:1 842x480',
      '-c:v:1 libx264',
      '-b:v:1 1400k',
      '-b:a:1 128k',
      '-s:v:2 1280x720',
      '-c:v:2 libx264',
      '-b:v:2 2800k',
      '-b:a:2 128k',
      '-s:v:3 1920x1080',
      '-c:v:3 libx264',
      '-b:v:3 5000k',
      '-b:a:3 196k',
      '-c:a copy',
      `-master_pl_name master.m3u8`,
      '-master_pl_publish_rate 32',
      '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3',
      '-f hls',
      '-hls_time 6',
      '-hls_list_size 0',
      `-hls_segment_filename ${path.join(__dirname, 'public', 'videos', videoId, 'v%v', 'fileSequence%d.ts')}`,
    ])
    .output(path.join(__dirname, 'public', 'videos', videoId, 'v%v', 'prog_index.m3u8'))
    .on('error', (err) => {
      console.log(err)
    })
    .run()
  return [
    `/videos/${videoId}/master.m3u8`
  ]
}
