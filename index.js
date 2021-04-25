const cookieParser = require("cookie-parser");
const express = require("express");
const Datastore = require("nedb");
const path = require("path");
const fs = require("fs");
const { Entropy, charset64 } = require("entropy-string");
const fileUpload = require("express-fileupload");

const createThumbnail = require("./thumb");

const app = express();

app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const database = new Datastore("pipe.db");
database.loadDatabase();

// database.insert({ type: 'video' })

const entropy = new Entropy({ charset: charset64 });

function getId() {
  return entropy.mediumID();
}

function getUnusedId() {
  let found = false;
  let id = getId();
  database.findOne({ video_id: id }, function(err, doc) {
    if (err) {
      return;
    }
    if (doc) {
      found = true;
    }
  });
  if (found) {
    return getUnusedId();
  }
  return id;
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/video", (req, res) => {
  let id = req.query.id;
  console.log(id);
});

app.get("/api/videos", (req, res) => {
  database.find({ type: "video" }, (err, data) => {
    if (err) {
      res.end();
      return;
    }
    res.json(data);
  });
});

app.post("/api/videos", (req, res) => {
  if (!(req.files && req.files.video)) {
    res.status(400).send("No video given!");
    return;
  }
  if (req.files.video.mimetype !== "video/mp4") {
    res.status(400).send("Invalid video given! Must be mp4");
    return;
  }
  if (req.files.video.size > 10000000) {
    res.status(400).send("Video too large! 10 mb or less, punk.");
    return;
  }
  const data = req.body;
  if (!(data && data.name && data.name.length > 0 && data.name.length <= 30)) {
    res
      .status(400)
      .send(
        "No or invalid name given! Must be non-empty and less than 30 chars"
      );
    return;
  }
  const id = getUnusedId();
  const filePath = path.join(__dirname, "public", "videos", id + ".mp4");
  req.files.video.mv(filePath);
  const thumbnail = createThumbnail(filePath, id);
  database.insert({
    type: "video",
    video_id: id,
    video_file: `/videos/${id}.mp4`,
    video_date: Date.now(),
    video_thumb: thumbnail,
    video_description: (data.description || "").slice(0, 200),
    video_name: data.name
  });
  res.redirect("/upload");
});

app.get("/v/:id", (req, res) => {
  if (!req.params || !req.params.id) {
    res.status(404);
    return;
  }
  res.redirect(`/video/${req.params.id}`);
});

app.get("/video/:id", (req, res) => {
  if (!req.params || !req.params.id) {
    res.status(404);
    return;
  }
  res.render("video", { id: req.params.id });
});

app.get("/upload", (req, res) => {
  res.render("upload");
});

app.get("/about", (req, res) => {
  res.render("about");
});

const PORT = process.env.PORT
app.listen(PORT, () => {
  let pathVideos = path.join(__dirname, "public", "videos");
  if (!fs.existsSync(pathVideos)) {
    fs.mkdir(pathVideos, err => {
      if (err) {
        return console.error(err);
      }
    });
  }
  let pathThumbs = path.join(__dirname, "public", "thumb");
  if (!fs.existsSync(pathThumbs)) {
    fs.mkdir(pathThumbs, err => {
      if (err) {
        return console.error(err);
      }
    });
  }
});
