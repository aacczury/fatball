var express = require('express');
var router = express.Router();

var mongoskin = require('mongoskin');
var db = mongoskin.db("mongodb://localhost:27017/story");
db.bind('story');
db.bind('contents');
db.bind('comments');

var crypto = require('crypto');
var fs = require('fs');

/* GET users listing. */
router.get('/', function(req, res, next) {
	db.story.find().sort({'_id':-1}).toArray(function(err, articles){
		console.log("articles: " + JSON.stringify(articles[0]));
		
		res.render('pages/story', {
			articles: articles
		});
	});
});

router.post('/', function(req, res, next) {
	var sha1 = crypto.createHash('sha1');
	sha1.update(req.body.password);
	var story = {
		title : req.body.title,
		author : req.body.author,
		password : sha1.digest('hex'),
		display : true
	}
	
	db.story.insert(story, function(err, result){
		console.log(result);
		/*var dbArticle = result[0];
		dbArticle.time = dbArticle._id.getTimestamp();
		io.sockets.emit('getArticle', art);*/
		res.redirect('/story');
	});
});

router.get('/:id', function(req, res) {
	var id = req.params.id;
	var auth = req.session.valid ? req.session.valid[id] : null;
	var plus = req.session.plus ? req.session.plus : {};
	db.contents.find({'article_id': id}).toArray(function(err, content){
		db.comments.find({'article_id': id}).sort({'_id':1}).toArray(function(err, comments) {
			res.render('story', { reqid: id, contents: contents, comments: comments, auth: auth, plus: plus});
		});
	});
});

router.post('/:id', function(req, res){
	fs.readFile(req.files.image.path, function (err, data) {
		var imageName = req.files.image.name;
		console.log(req.body.text);
		
		if(!imageName){
			console.log("There was an error")
			res.redirect("/articles/" + req.params.id);
			res.end();
		} else {
			var sha1 = crypto.createHash('sha1');
			sha1.update(String((new Date()).getTime()));
			sha1.update(imageName);
			imageName = sha1.digest('hex') + "_" + imageName;
			var newPath = __dirname + "/public/uploads/fullsize/" + imageName;
			var thumbPath = __dirname + "/public/uploads/thumbs/" + imageName;
			fs.writeFile(newPath, data, function (err) {
				im.resize({
					srcPath: newPath,
					dstPath: thumbPath,
					width: 200
				}, function(err, stdout, stderr){
					if (err) throw err;
					console.log('resized image to fit within 200x200px');
				});
				var imageText = {};
				imageText.name = imageName;
				imageText.text = req.body.text;
				imageText.article_id = req.params.id;
				db.collection('images').insert(imageText, function(err, result){
					console.log(result);
					if(err) throw err;
					io.sockets.emit('getImage' + req.params.id, imageText);
					res.redirect("/articles/" + req.params.id);
				});
			});
		}
	});
});

module.exports = router;
