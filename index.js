const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();

// middleware
app.use(
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    console.log("Value In The Token", decoded);
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efkktro.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // SERVICES
    const usersCollection = client.db("carDoctors").collection("appliedUsers");
    const servicesCollection = client.db("carDoctors").collection("services");
    const productsCollection = client.db("carDoctors").collection("products");
    const bookingsCollection = client.db("carDoctors").collection("bookings");

    // auth related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1000h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: "none",
        })
        .send({ success: true });
    });

    // services related

    // user posting
    app.post("/appliedUsers", async (req, res) => {
      try {
        const userData = req.body;
        const result = await usersCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    // all applied users getting
    app.get("/appliedUsers", async (req, res) => {
      try {
        const userData = req.body;
        const result = await usersCollection.find(userData).toArray();
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    // 1 applied user getting
    app.get("/appliedUsers:id", async (req, res) => {
      try {
        const userData = req.body;
        const result = await usersCollection.findOne(userData);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    // services get
    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });
    // services GET With sorting
    app.get("/services1", async (req, res) => {
      // console.log("console from here");
      const filter = req.query;
      const query = {};

      // Check if search query is provided
      if (filter.search) {
        query.serviceName = { $regex: filter.search, $options: "i" };
      }

      const options = {};

      // Check if sort query is provided
      if (filter.sort === "acd") {
        options.sort = { price: 1 }; // Ascending order by price
      } else {
        options.sort = { price: -1 }; // Descending order by price
      }
      console.log(filter.search, filter.$options)
      try {
        // Use try-catch block for error handling
        const cursor = servicesCollection.find(query, options);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        // Handle error
        console.error("Error occurred while fetching services:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // specific services
    app.get("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await servicesCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    // products collection
    // post product
    app.post("/products", async (req, res) => {
      try {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });
    // get all products
    app.get("/products", async (req, res) => {
      try {
        const product = req.body;
        const result = await productsCollection.find(product).toArray();
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });
    // get a product
    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    // service bookings
    // post
    app.post("/bookings", async (req, res) => {
      const newCart = req.body;
      console.log(newCart);
      const result = await bookingsCollection.insertOne(newCart);
      res.send(result);
    });
    // get all bookings
    app.get("/bookingsAll", async (req, res) => {
      try {
        const bookings = req.body;
        const result = await bookingsCollection.find(bookings).toArray();
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })
    // get all && some bookings user based
    app.get("/bookings", verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    // Deleting bookings data
    app.delete("/bookings/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });
    // Update bookings
    app.patch("/bookings/:id", async (req, res) => {
      const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { confirmationStatus: req.body.confirmationStatus } }
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor server is running");
});

app.listen(port, () => {
  console.log(`car doctor server listening on port ${port}`);
});
