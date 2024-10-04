const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 4000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
      return res.status(400).send('No image uploaded.');
  }
  
  // Just send the uploaded image buffer back to the client
  res.set('Content-Type', 'image/png');
  res.send(req.file.buffer);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
