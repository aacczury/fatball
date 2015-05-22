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

	router.get('/', function(req, res) {
		db.story.find().sort({'_id':-1}).toArray(function(err, stories){
			console.log("stories: " + JSON.stringify(stories[0]));
			res.render('pages/stories', {
				stories: stories,
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
		var id = req.params.id;
		req.session.story_id = id;

		var success = req.session.success;
		var error = req.session.error;
		delete req.session.success;
		delete req.session.error;
		db.contents.find({'article_id': id}).toArray(function(err, contents){
			db.comments.find({'article_id': id}).sort({'_id':1}).toArray(function(err, comments) {
				res.render('pages/story', {
					storyId: id,
					contents: contents,
					comments: comments,
					auth: req.session.valid ? req.session.valid[id] : false,
					success: success,
					error: error
				});
			});
		});
	});

	router.post('/:id/login', function(req, res){
		var id = req.params.id;
		db.story.findById(id, function(err, story){
			var sha1 = crypto.createHash('sha1');
			sha1.update(req.body.password);
			if(!req.session.valid) req.session.valid = {};
			if(story.password == sha1.digest('hex')){
				req.session.valid[id] = true;
				req.session.success = "login success";
			}
			else{
				req.session.valid[id] = false;
				req.session.error = "login failed";
			}
			req.session.save();
			res.redirect('/story/' + id);
		});
	});

	io.of('/story').on('connection', function(socket){
		var session = socket.request.session;
		!session.story_id ? console.log('A user read stories') : console.log('A user read story: ' + session.story_id);
		socket.join('story' + session.story_id);

		socket.on('story comment', function(comment){
			comment.auth = session.valid ? session.valid[session.story_id] : false;
			comment.article_id = session.story_id;
			comment.plus = 0;
			comment.hit = false;

			db.comments.insert(comment, function(err, result){
				console.log(result);
				result[0].time = result[0]._id.getTimestamp();
				socket.emit('story comment', result[0]);
				socket.to('story' + session.story_id).emit('story comment', result[0]);
			});
		});

		ss(socket).on('story image', function(stream, img_data){
			if(session.valid && session.valid[session.story_id]){ // avoid upload without login
				var title = img_data.title.split('.')[0];
				var ext = img_data.title.split('.')[1];
				var text = img_data.text;

				var sha1 = crypto.createHash('sha1');
				sha1.update(String((new Date()).getTime()));
				sha1.update(title);
				imageName = sha1.digest('hex')  + "." + ext;
				var imgPath = "./public/uploads/fullsize/" + session.story_id + "/" + imageName;
				var thumbPath = "./public/uploads/thumbs/" + session.story_id + "/" + imageName;

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
								article_id : session.story_id
							};
							// add to db
							db.contents.insert(content, function(err, result){
								console.log(result);
								if(err) throw err;
								socket.emit('story image', result[0]);
								socket.emit('success msg', "success upload" + title);
								socket.to('story' + session.story_id).emit('story image', result[0]);
							});
						});
					});
				});
			}
			else socket.emit('error msg', "not login");
		});

		socket.on('disconnect', function(){
			socket.leave('story' + session.story_id);
			!session.story_id ? console.log('A user left stories') : console.log('A user left story: ' + session.story_id);
		});
	});

	return router;
}

module.exports = init;
