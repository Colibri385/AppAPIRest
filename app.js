const express = require('express');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const exphbs = require("express-handlebars");
const methodeOverride = require("method-override");
const path = require("path");
const sharp = require("sharp");

//Algolia
const mongooseAlgolia = require('mongoose-algolia');
const algoliasearch = require('algoliasearch')
const client = algoliasearch('IAG0EXPQ28','f691920c3adc61a523cbf1a4e7d3068a')


// Upload image
const multer = require("multer")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {

        const ext = path.extname(file.originalname)
        const date = Date.now()

        cb(null, date + '-' + file.originalname)
        // cb(null, file.originalname +'-'+ date + ext)
    }
})


// var upload = multer({ dest: 'uploads/' })
var upload = multer({
            storage: storage,
            limits: {
                files : 1
            },
            fileFilter: function (req, file, cb) {
                if (
                    file.mimetype === "image/png" ||
                    file.mimetype === "image/jpeg" ||
                    file.mimetype === "image/jpg" ||
                    file.mimetype === "image/gif"
                ) {
                    cb(null, true)

                } else {
                    cb(new Error('Le fichier doit être au format png, jpg ou gif'))
                }
            }
        })

        // fonctionalités de express dans app
        const port = 1966;
        const app = express();

        // Express static

        app.use(express.static('public'));

        // Method-Override

        app.use(methodeOverride("_method"))

        // Handlebars (moteur templeting)
        app.engine('hbs', exphbs({
            defaultLayout: 'main',
            extname: 'hbs'
        })); app.set('view engine', 'hbs')

        // BodyParser  ( transporteur )
        app.use(bodyParser.urlencoded({
            extended: true
        }));

        // MongoDB connection à MongoDb et création d'un élément dans la base

        mongoose.connect("mongodb://localhost:27017/boutiqueGame", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })

        const productSchema = new mongoose.Schema ({
            title: String,
            content: String,
            price: Number,
            category:{type:mongoose.Schema.Types.ObjectId, ref: "category" },
            cover: {
                name: String,
                originalName: String,
                path: String,
                urlSharp: String,
                createAt: Date
            }
        });
        const categorySchema = new mongoose.Schema({
            title: String,
            createAt: Date
        })

        productSchema.plugin(mongooseAlgolia,{
            appId: "IAG0EXPQ28",
            apiKey: "f691920c3adc61a523cbf1a4e7d3068a",
            indexName: 'product', //The name of the index in Algolia, you can also pass in a function
            selector: 'title category', //You can decide which field that are getting synced to Algolia (same as selector in mongoose)
            populate: {
              path: 'category',
              select: 'title'
            },
            defaults: {
              author: 'unknown'
            },
            mappings: {
              title: function(value) {
                return value
              }
            },
            virtuals: {
              whatever: function(doc) {
                return `Custom data ${doc.title}`
              }
            },
            debug: true // Default: false -> If true operations are logged out in your console
          });
           
        const Product = mongoose.model("product", productSchema)
        const Category = mongoose.model("category", categorySchema)

        // Routes

        //Algolia
        app.route("/search")
        .get ((req,res) => {
            let queries = [
                {
                    indexName : "product",
                    query : req.query.q,
                    params : {
                        hitsPerpage : 8
                     }
                }
            ]
            
            client.search(queries, function(err,data){
                console.log(data);
            })
            res.render("search")  
        })        

        app.route("/category")
        .get ((req,res) => {

           Category.find(function (err, category) {
                if (!err) {
                    // va chercher le fichier category.hbs
                    res.render("category", {
                        categorie: category
                        })
                } else {
                    res.send(err)
                }
            })
        })
        
        .post((req,res) => {
            const neuwCategory = new Category({
                title : req.body.title,
                createAt: Date.now()
            })
            neuwCategory.save( function(err) {
                if (!err) {
                    res.send("Category save")
                } else {
                    res.send(err)
                }
            })
        })

        app.route("/")
        .get((req, res) => {
    
            Product
            .find()
            .populate("category")
            .exec(function (err, produit) {
                if (!err) {
                    // va chercher le fichier index.hbs
                    Category.find(function(err, category) {
                        res.render("index", {
                            product: produit,
                            categorie : category
                        })
                    })
                } else {
                    res.send(err)
                }
            })
        })

        // Sauvergarde dans la constante
        .post(upload.single("cover"), (req, res) => {

            const file = req.file;

            sharp(file.path)
            .resize (200)
            .webp({quality:80})
            .toFile('./public/uploads/web/' + file.originalname.split(".").slice(0,-1).join(".")+ ".webp", (err, info) => { });

            const newProduct = new Product({
                title: req.body.title,
                content: req.body.content,
                price: req.body.price,
                category: req.body.category
            });

            if (file) {
                newProduct.cover = {
                    name: file.filename,
                    originalName: file.originalname,
                    path: file.path.replace("public", " "),
                    urlSharp : '/uploads/web/' + file.originalname.split(".").slice(0,-1).join(".")+ ".webp",
                    createAt: Date.now()
                }
            }

            // Sauvegarde dans la base de données
            newProduct.save(function (err) {
                if (!err) {
                    res.send('Save ok !')
                } else {
                    res.send(err)
                }
            })
        })

        .delete(function (req, res) {
            Product.deleteMany(function (err) {
                if (!err) {
                    res.send("All delete")
                } else {
                    res.send(err)
                }
            })
        })

        // Route édition
        app.route("/:id")
        .get(function (req, res) {
            // Adventure.findOne({ type: 'iphone' }, function (err, adventure) {});
            Product.findOne({
                    _id: req.params.id
                },
                function (err, produit) {
                    if (!err) {
                        res.render("edition", {
                            _id: produit.id,
                            title: produit.title,
                            content: produit.content,
                            price: produit.price
                        })
                    } else {
                        res.send("err")
                    }
                })
        })

        .put(function (req, res) {
            // MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, fn);
            Product.update(
                // condition
                {
                    _id: req.params.id //maj par rapport à l'ID dans le champ url de la page
                },
                // Update (prend le conenu des champs input)
                {
                    title: req.body.title,
                    content: req.body.content,
                    price: req.body.price
                },

                // Option plusieurs modifications en même temps
                
                {
                    multi: true
                },

                // exec
                function (err) {
                    if (!err) {
                        res.send("Update OK !")
                    } else {
                        res.send(err)
                    }
                }
            )
        })

        .delete(function (req, res) {
            Product.deleteOne({
                    _id: req.params.id
                },
                function (err) {
                    if (!err) {
                        res.send("product delete")
                    } else {
                        res.send(err)
                    }
                }
            )
        })

        app.listen(port, function () {
            console.log(`écoute le port ${port}, lancé à ${new Date().toLocaleString()}`);
        })