const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// midleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c4vcn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // get featured products
    const productsCollection = client.db("productHunt").collection("products");

    app.get('/featured-products', async(req, res) => {
       try{
        
        const featuredProducts = await productsCollection.find({ isFeatured: true}).sort({ timestamp: -1}).limit(4).toArray();
        res.send(featuredProducts);

       }catch(error){
        console.error("Error fetching featured products ", error);
        res.send({message: "Error fetching featured products", error});
       }
    });

    app.post('/upvote/:id', async(req, res) => {
        const { id } = req.params;
        const { userId } = req.body;

        try{
            const product = await productsCollection.findOne({ _id: new ObjectId(id)});

            if(product.voteBy.includes(userId)){
                return res.send({ message: "User has already voted"});
            }
            await productsCollection.updateOne(
                { _id: new ObjectId(id)},
                { $inc: { votes: 1}, $push: { votedBy: userId}}
            );
            res.send({ message: "Voted counted"});
        } catch(error){
            console.error("Error up voting product", error);
            res.send({ message: "Error up voting product ", error});
        }
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('product hunt')
})



app.listen(port, () => {
    console.log(`product hunt: ${port}`)
})
