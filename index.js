const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require("body-parser");
require('dotenv').config()
let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const { Schema } = mongoose;

const userSchema = Schema({
  username: {
    type: String,
    required: true
  },
});

const taskSchema = Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

app.route('/api/users').get((req, res) => {
  User.find((err, users) => {
    if (err) return console.log(err);
    res.send(users)
  })
}).post((req, res) => {
  let newUser = new User({ username: req.body.username });
  newUser.save((err, user) => {
    if (err) return console.log(err);
    res.json(user)
  });
})

app.post('/api/users/:_id/exercises', (req, res) => {
  let id = req.params._id
  let desc = req.body.description
  let dur = parseInt(req.body.duration)
  let date;

  if (req.body.date) {
    date = isNaN(req.body.date) ? new Date(req.body.date) : new Date(parseInt(req.body.date))
    if (date.toString() === 'Invalid Date') date = new Date();
  } else date = new Date();

  User.findById({ _id: id }, (err, user) => {
    if (err) return console.log(err);

    let task = new Task({
      username: user.username,
      description: desc,
      duration: dur,
      date: date
    });

    task.save((err, task) => {
      if (err) return console.log(err);
    })

    res.json({
      _id: user._id,
      username: user.username,
      description: desc,
      duration: dur,
      date: date.toDateString()
    })
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  let id = req.params._id

  let logInfo = {
    username: "",
    count: 0,
    _id: "",
    log: []
  }

  User.findById({ _id: id }, (err, user) => {
    if (err) return console.log(err);

    logInfo.username = user.username;
    logInfo._id = user._id

    let task = Task.find({ username: user.username })
    if (req.query.from) {
      let from = isNaN(req.query.from) ? new Date(req.query.from) : new Date(parseInt(req.query.from))
      if (from.toString() != 'Invalid Date') task.find({ date: { $gte: from } })
    }
    if (req.query.to) {
      let to = isNaN(req.query.to) ? new Date(req.query.to) : new Date(parseInt(req.query.to))
      if (to.toString() != 'Invalid Date') task.find({ date: { $lte: to } })
    }
    if (req.query.limit) task.limit(parseInt(req.query.limit))

    task.sort('date')
    task.select(['description', 'duration', 'date']);
    task.exec((err, tasks) => {
      if (err) return console.log(err);

      logInfo.count = tasks.length
      logInfo.log = tasks.map((item) => {
        return {
          description: item.description,
          duration: item.duration,
          date: item.date.toDateString()
        }
      })

      res.json(logInfo)
    })
  })
})

app.use(function(err, req, res, next) {
  if (err) {
    res
      .status(err.status || 500)
      .type("txt")
      .send(err.message || "SERVER ERROR");
  }
});
app.use(function(req, res) {
  if (req.method.toLowerCase() === "options") {
    res.end();
  } else {
    res.status(404).type("txt").send("Not Found");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
