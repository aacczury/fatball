var express = require('express');
var router = express.Router();

var mongoskin = require('mongoskin');
var db = mongoskin.db("mongodb://localhost:27017/story");
db.bind('story');
db.bind('contents');
db.bind('comments');

var crypto = require('crypto');
var fs = require('fs');
var lwip = require('lwip');
var ss = require('socket.io-stream');

function init(io){
	var storyID = "";

	router.get('/', function(req, res) {
		storyID = "";
		db.story.find().sort({'_id':-1}).toArray(function(err, articles){
			console.log("articles: " + JSON.stringify(articles[0]));
			res.render('pages/stories', {
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
			var dbStory = result[0];
			fs.mkdir(__dirname + "/public/uploads/fullsize/" + dbStory._id, function(err){});
			fs.mkdir(__dirname + "/public/uploads/thumbs/" + dbStory._id, function(err){});
			/*dbArticle.time = dbArticle._id.getTimestamp();
			io.sockets.emit('getArticle', art);*/
			res.redirect('/story');
		});
	});

	router.get('/:id', function(req, res) {
		storyID = req.params.id;
		var id = req.params.id;
		db.contents.find({'article_id': id}).toArray(function(err, contents){
			db.comments.find({'article_id': id}).sort({'_id':1}).toArray(function(err, comments) {
				res.render('pages/story', { storyId: id, contents: contents, comments: comments});
			});
		});
	});

	router.post('/:id', function(req, res){
		console.log(req.files);
		fs.readFile(req.files.image.path, function (err, data) {
			console.log(req.body.text);
			var imageTitle = req.files.image.originalname;

			if(!imageTitle){
				console.log("There was an error")
				res.redirect("/story/" + req.params.id);
				res.end();
			} else {
				var sha1 = crypto.createHash('sha1');
				sha1.update(String((new Date()).getTime()));
				sha1.update(imageTitle);
				imageName = sha1.digest('hex')  + "." + req.files.image.extension;
				var imgPath = "./public/uploads/fullsize/" + req.params.id + "/" + imageName;
				var thumbPath = "./public/uploads/thumbs/" + req.params.id + "/" + imageName;

				lwip.open(data, req.files.image.extension, function(err, image){
					console.log(err);

					image.batch()
					.resize(200)
					.writeFile(thumbPath, function(err){
						console.log(err);

						fs.writeFile(imgPath, data, function (err) {
							console.log(err);

							var content = {
								title : imageTitle,
								image : imageName,
								text : req.body.text,
								article_id : req.params.id
							};

							// add to db
							db.contents.insert(content, function(err, result){
								console.log(result);
								if(err) throw err;
								//io.sockets.emit('getImage' + req.params.id, content);
								res.redirect("/story/" + req.params.id);
							});
						});
					});
				});
			}
		});
	});

	io.of('/story').on('connection', function(socket){
		storyID == "" ? console.log('A user read stories') : console.log('A user read story: ' + storyID);
		socket.join('story' + storyID);

		socket.on('story comment', function(comment){
			comment.article_id = storyID;
			comment.plus = 0;

			db.comments.insert(comment, function(err, result){
				console.log(result);
				result[0].time = result[0]._id.getTimestamp();
				socket.emit('story comment', result[0]);
				socket.to('story' + storyID).emit('story comment', result[0]);
			});
		});

		ss(socket).on('story image', function(stream, img_data){
			var title = img_data.title.split('.')[0];
			var ext = img_data.title.split('.')[1];
			var text = img_data.text;

			var sha1 = crypto.createHash('sha1');
			sha1.update(String((new Date()).getTime()));
			sha1.update(title);
			imageName = sha1.digest('hex')  + "." + ext;
			var imgPath = "./public/uploads/fullsize/" + storyID + "/" + imageName;
			var thumbPath = "./public/uploads/thumbs/" + storyID + "/" + imageName;

			stream.pipe(fs.createWriteStream(imgPath), {end: false});
			stream.on('end', function(){
				lwip.open(imgPath, function(err, image){
					console.log(err);

					image.batch().resize(200).writeFile(thumbPath, function(err){
						console.log(err);

						var content = {
							title : title,
							image : imageName,
							text : text,
							article_id : storyID
						};
						// add to db
						db.contents.insert(content, function(err, result){
							console.log(result);
							if(err) throw err;
							//io.sockets.emit('getImage' + req.params.id, content);
						});
					});
				});
			});

		});

		socket.on('disconnect', function(){
			socket.leave('story' + storyID);
			storyID == "" ? console.log('A user left stories') : console.log('A user left story: ' + storyID);
		});
	});

	return router;
}

module.exports = init;
