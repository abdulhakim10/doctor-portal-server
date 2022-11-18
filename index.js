const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;


// middle wares
app.use(cors());
app.use(express.json());



const uri = "mongodb+srv://<username>:<password>@cluster0.47nvmfs.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});



app.get('/', async(req, res) => {
    res.send('doctors portal server is running');
})

app.listen(port, async(req, res) => {
    console.log('server is running on port', port);
})