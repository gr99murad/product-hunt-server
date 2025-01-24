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

    

    
    const productsCollection = client.db("productHunt").collection("products");

    // get products by a user
    app.get('/myProducts/:userId', async (req, res) => {
      const {userId} = req.params;

     try{
      const products = await productsCollection.find({ postedBy: userId}).project({ name:1, votes:1, status:1}).toArray();
      res.send(products);
     } catch(error){

      console.error('Error fetching products for user:', error);
      res.send({ message: 'Error fetching products', error});
     }
    });
    // update product details
    app.put('/products/:id', async(req, res) => {
      const {id} = req.params;
      const updatedProduct = req.body;

      try{
        const result = await productsCollection.updateOne({ _id: new ObjectId(id)}, { $set: updatedProduct});
        res.send({ message: 'Product updated successfully', result});

      }catch(error){
        console.error('Error updating product', error);
        res.send({ message: 'Error updating product', error});

      }
    });
    
    // delete product
    app.delete('/products/:id', async(req, res) => {
      const {id} = req.params;
      try{
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id)});
        res.send({ message: 'Product deleted successfully', result});

      }catch(error){
        console.error('Error deleting product', error);
        res.send({ message: 'Error deleting product', error});

      }
    });

    // Add a product
    app.post('/products', async (req, res) => {
      try {
        const product = {
          ...req.body,
          postedBy: req.body.userId,
          timestamp: new Date(),
          votes: 0,
          votedBy: [],
          reportedBy: [],
          status: 'pending',
        };

        const result = await productsCollection.insertOne(product);
        res.send({ message: 'Product added successfully', result});
        
      }catch(error){
        console.error({ message: 'Error added successfully', result});
        res.send({ message: 'Error adding product', error});
      }
    })
    // get products with search and pagination
    app.get('/products', async (req,res) => {
      const { search = '', page=1, limit=6} = req.query;
      const skip = (page - 1) * limit;

      try{
        const query = search? { tags: { $regex: search, $options: 'i'}} : {};

        const products = await productsCollection.find(query).skip(skip).limit(parseInt(limit)).toArray();
        const totalProducts = await productsCollection.countDocuments(query);
        res.send({ products, totalPages: Math.ceil(totalProducts/limit)});
      } catch(error){
        console.error('Error fetching products:', error);
        res.send({ message: 'Error fetching products', error});
      }
    });

    // get featured products
    app.get('/featured-products', async(req, res) => {
       try{
        
        const featuredProducts = await productsCollection.find({ isFeatured: true}).sort({ timestamp: -1}).limit(4).toArray();
        res.send(featuredProducts);

       }catch(error){
        console.error("Error fetching featured products ", error);
        res.send({message: "Error fetching featured products", error});
       }
    });

    // get  trending products api
    app.get('/trendingProducts', async (req, res) => {
      try{
        const trendingProducts = await productsCollection.find({}).sort({ votes: -1}).limit(6).toArray();
        res.send(trendingProducts);

      } catch (error){
        console.error("Error fetching trending products", error);
        res.send({ message: "Error fetching trending products", error});

      }
    });

    // get product details
    app.get('/products/:id', async(req, res) => {
      const {id} = req.params;
      try{
        const product = await productsCollection.findOne({ _id: new ObjectId(id)});
        res.send(product);

      } catch (error){
        console.error('Error fetching product details:', error);
        res.send({message: 'Error fetching product details ', error});
      }
    });

    // report a product
    app.post('/report/:id', async(req, res) => {
      const {id} = req.params;
      const {userId} = req.body;
      try{
        await productsCollection.updateOne(
          { _id: new ObjectId(id)},
          { $push: { reportedBy: userId}}
        );
        res.send({ message: 'Product reported successfully'});
      } catch(error){
        console.error('Error reporting product', error);
        res.send({ message: 'Error reporting product',error});
      }
    });

    // post a review
    const reviewsCollection = client.db('productHunt').collection('reviews');

    app.post('/reviews', async (req, res) =>{
      try{
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.send(result);

      }catch(error){
        console.error('Error posting review', error);
        res.send({ message: 'Error posting review', error});

      }
    }); 

    //get reviews for a product
    app.get('/reviews/:productId', async (req, res) => {
      const {productId} = req.params;
      try{
        const reviews = await reviewsCollection.find({ productId }).toArray();
        res.send(reviews);

      }catch(error){
        console.error('Error fetching reviews', error);
        res.send({ message: 'Error fetching reviews',error});

      }
    });
    // update user subscription
    app.post('/subscribe/:id', async(req, res) => {
      const {id} = req.params;

      try{
        const result = await client.db("productHunt").collection("users").updateOne({ _id: new ObjectId(id)}, { $set: {subscribed: true}});
        res.send({ message: "subscription successful", result});

      }catch(error){
        console.error("Error updating subscription", error);
        res.send({message: "subscription update failed", error});

      }
    })

    app.post('/upvote/:id', async(req, res) => {
        const { id } = req.params;
        const { userId } = req.body;


        if(!userId){
          return res.send({ message: "Invalid userId. Cannot be null or undefined"});
        }

        try{
            const product = await productsCollection.findOne({ _id: new ObjectId(id)});

            if(product.votedBy.includes(userId)){
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
