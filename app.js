const express = require('express');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// moteur templeting
const exphbs = require("express-handlebars");

// fonctionalités de express dans app
const app = express();

// Handlebars (moteur templeting)
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: 'hbs'
}));
app.set('view engine', 'hbs')

// BodyParser
app.use(bodyParser.urlencoded({
    extended: true
}));

// MongoDB connection à MongoDb et création d'un élément dans la base

mongoose.connect("mongodb://localhost:27017/boutiqueGame", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const productSchema = {
    title: String,
    content: String,
    price: Number
};

const Product = mongoose.model("product", productSchema)

// Routes
app.route("/")
    .get((req, res) => {
        // MyModel.find({ name: 'john', age: { $gte: 18 }}, function (err, docs) {});
        Product.find(function (err, produit) {
            if (!err) {
                // va chercher le fichier index.hbs
                res.render("index", {
                    product: produit
                })
            } else {
                res.send(err)
            }

        })
    })
    // Sauvergarde dans la constante
    .post((req, res) => {
       const newProduct = new Product ({
           title: req.body.title,
           content: req.body.content,
           price: req.body.price
       });

       // Sauvegarde dans la base de données
       newProduct.save(function(err) {
           if (!err) {
               res.send('Save ok !')
           }
           else {
               res.send(err)
           }
       })
    })

 .delete()



// Route édition
app.route("/:id")
.get(function(req,res) {
    // Adventure.findOne({ type: 'iphone' }, function (err, adventure) {});
    Product.findOne(
        {_id : req.params.id},
        function(err, produit){
            if(!err) {
                res.render("edition", {
                    _id: produit.id,
                    title: produit.title,
                    content:produit.content,
                    price:produit.price
                })
            } else {
                res.send("err")
            }
        }
    )
})

.put()

app.listen(4000, function() {
    console.log("écoute le port 4000");
    
})