const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;


// middle wares
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.47nvmfs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// JWT middleware
function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).send('unauthorized access')
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'});
        }

        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const appointmentOptionCollection = client.db('doctorPortal').collection('appointmentOptions');
        const bookingsCollection = client.db('doctorPortal').collection('bookings');
        const usersCollection = client.db('doctorPortal').collection('users');

        app.get('/appointmentOptions', async(req, res) => {
            const date = req.query.date;
            // all option query
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            
            // get the booking of the provided date
            const bookingQuery = {appointmentDate: date};
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            
            // code carefully :D
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);

                // remove booked slots
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
                // console.log(date, option.name, remainingSlots.length)
            })
            res.send(options);
        })

        /**
         * API Naming Convention
         * app.get('/bookings')
         * app.get('/bookings/:id')
         * app.post('/bookings')
         * app.patch('/bookings/:id')
         * app.delete('/bookings/:id')
         */

        // get bookings
        app.get('/bookings', verifyJWT, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if(email !== decodedEmail){
                return res.status(403).send({message: 'unauthorized'});
            }

            const query = { email: email};
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // send appointment
        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            console.log(booking)

            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment
            }

            const bookedAlready = await bookingsCollection.find(query).toArray();

            if(bookedAlready.length){
                const message = `You already have a booking on ${booking.treatment} ${booking.appointmentDate} ${booking.slot}`
                return res.send({acknowledged: false, message});
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })


        // JWT
        app.get('/jwt', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);

            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'});
                return res.send({accessToken: token});
            }
            res.status(403).send({accessToken: ''});
        })

        // save users
        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // get admin
        app.get('/users/admin/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email};
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
        })

        // get all users
        app.get('/users', async(req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        // make admin
        app.put('/users/admin/:id', verifyJWT, async(req, res) => {
            const decodedEmail = req.decoded.email;
            const query = {email: decodedEmail};
            const user = await usersCollection.findOne(query);

            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'unauthorized'});
            }

            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
    }
    finally{

    }
}
run().catch(console.log);


app.get('/', async(req, res) => {
    res.send('doctors portal server is running');
})

app.listen(port, async(req, res) => {
    console.log('server is running on port', port);
})