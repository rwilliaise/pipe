const cookieParser = require('cookie-parser')
const express = require('express')
const Datastore = require('nedb')
const path = require('path')
const fs = require('fs')
const { Entropy, charset64 } = require('entropy-string')
const fileUpload = require('express-fileupload')
const rateLimit = require('express-rate-limit')
const bodyParser = require('body-parser')
const { hash, compare } = require('bcrypt')

const { body, param } = require('express-validator')

const createThumbnail = require('./thumb')

const app = express()


const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200
});

app.use("/api/", apiLimiter);
app.use(cookieParser())
app.use(fileUpload())
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

const database = new Datastore('pipe.db')
database.loadDatabase();

// database.insert({ type: 'video' })

const entropy = new Entropy({ charset: charset64 })

function getId() {
  return entropy.mediumID();
}

function getUnusedId() {
  let found = false
  let id = getId()
  database.findOne({ video_id: id }, function (err, doc) {
    if (err) {
      return
    }
    if (doc) {
      found = true
    }
  })
  if (found) {
    return getUnusedId()
  }
  return id
}

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/video', (req, res) => {
  let id = req.query.id
  console.log(id)
})

app.get('/api/videos', (req, res) => {
  database.find({ type: 'video' }, (err, data) => {
    if (err) {
      res.end();
      return;
    }
    let out = []
    for (let video of data) {
      out.push({ video_thumb: video.video_thumb, video_date: video.video_date, video_name: video.video_name, video_id: video.video_id })
    }
    res.json(out);
  })
})

app.post('/api/videos',
  body('name').isString().isLength({ min: 1, max: 30 }).trim().escape().withMessage('Name must be non-empty and less than 30 chars!'),
  body('description').isString().trim().escape(),
  body('password').not().isEmpty().isStrongPassword().withMessage('Password must be strong!'),
  (req, res) => {
    if (!(req.files && req.files.video)) {
      res.status(400).send('No video given!')
      return
    }
    if (req.files.video.mimetype !== 'video/mp4') {
      res.status(400).send('Invalid video given! Must be mp4')
      return
    }
    if (req.files.video.size > 10_000_000) {
      res.status(400).send('Video too large! 10 mb or less, punk.')
      return
    }
    const data = req.body
    const id = getUnusedId()
    const filePath = path.join(__dirname, 'public', 'videos', id + ".mp4")
    req.files.video.mv(filePath)
    const thumbnail = createThumbnail(filePath, id)
    hash(data.password, 10, (err, encrypted) => {
      if (err) {
        res.status(500).send('Failed to encrypt password!')
        return
      }
      database.insert({
        type: 'video',
        video_id: id,
        video_file: `/videos/${id}.mp4`,
        video_date: Date.now(),
        video_thumb: thumbnail,
        video_description: (data.description || '').slice(0, 200),
        video_name: data.name,
        video_relevance: 10,
        video_password: encrypted
      })
      res.redirect('/upload')
    })
  })

app.post('/api/videos/:id',
  body('auth').isString().not().isEmpty().withMessage('Authentication must be provided'),
  param('id').isString().isLength({ max: 12, min: 12 }).withMessage('Video not found'),
  (req, res) => {
    if (!req.body) {
      res.status(403).send('Not authorized')
      return
    }
    const data = req.body
    database.findOne({ video_id: req.params.id }, (err, doc) => {
      if (err) {
        res.status(500).send('Server error')
        return
      }
      if (!doc) {
        res.status(404).send('Video not found')
        return
      }
      if (data.auth === 'verylongandcooladminpasswordlol') {
        const videoPath = path.join(__dirname, 'public', 'videos', `${req.params.id}.mp4`)
        const thumbPath = path.join(__dirname, 'public', 'thumb', `${req.params.id}.png`)
        if (!fs.existsSync(videoPath)) {
          res.status(404).send('Video not found')
          return
        }
        database.remove({ video_id: req.params.id })
        if (fs.existsSync(thumbPath)) {
          fs.rmSync(thumbPath)
        }
        fs.rmSync(videoPath)
        res.status(200).send('Success')
        return
      }
      compare(data.auth, doc.video_password, (hashError, status) => {
        if (hashError) {
          res.status(500).send('Password authentication failure, please try again later')
          return
        }
        if (status) {
          const videoPath = path.join(__dirname, 'public', 'videos', `${req.params.id}.mp4`)
          const thumbPath = path.join(__dirname, 'public', 'thumb', `${req.params.id}.png`)
          if (!fs.existsSync(videoPath)) {
            res.status(404).send('Video not found')
            return
          }
          database.remove({ video_id: req.params.id }, (err, del) => {
            if (err) {
              console.log(err)
            }
            console.log(`${del} videos deleted`)
          })
          if (fs.existsSync(thumbPath)) {
            fs.rmSync(thumbPath)
          }
          fs.rmSync(videoPath)
          res.status(200).send('Success')
        } else {
          res.status(403).send('Invalid password')
          return
        }
      })
    })
  })

app.get('/v/:id',
  param('id').isString().isLength({ max: 12, min: 12 }).withMessage('Video not found'),
  (req, res) => {
    res.redirect(`/video/${req.params.id}`)
  })

app.get('/video/:id',
  param('id').isString().isLength({ max: 12, min: 12 }).withMessage('Video not found'),
  (req, res) => {
    database.findOne({ video_id: req.params.id }, function (err, doc) {
      if (err) {
        res.status(500).send(err)
        return
      }
      if (!doc) {
        res.status(404).send('Video not found')
        return
      }
      res.render('video', { video: doc })
    })
  })

app.get('/upload', (req, res) => {
  res.render('upload')
})

app.get('/faq', (req, res) => {
  res.render('faq')
})

app.get('/tos', (req, res) => {
  res.render('tos')
})

app.get('/api', (req, res) => {
  res.render('api')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  let pathVideos = path.join(__dirname, 'public', 'videos')
  if (!fs.existsSync(pathVideos)) {
    fs.mkdir(pathVideos, (err) => {
      if (err) {
        return console.error(err);
      }
    })
  }
  let pathThumbs = path.join(__dirname, 'public', 'thumb')
  if (!fs.existsSync(pathThumbs)) {
    fs.mkdir(pathThumbs, (err) => {
      if (err) {
        return console.error(err);
      }
    })
  }
})
