var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var path = require('path');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(4104);
console.log('4104 is the fatball port');

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer({dest:'./public/tmp/'})); // for parsing multipart/form-data
app.use(session({
	secret: '=911#e4)ad@849e+c21{35/4c*ee4[21$d8!b2}d_69790&350(9]',
	cookie: { maxAge: 172800000 },
	store: new MongoStore({
		url : 'mongodb://localhost:27017/story/sessions'
	}),
	resave: true,
    saveUninitialized: true
}));

var routes = require('./routes/index');
var about = require('./routes/about')(io);
var users = require('./routes/users');
var story = require('./routes/story')(io);

app.use('/', routes);
app.use('/about', about);
app.use('/users', users);
app.use('/story', story);
/*app.use(function(req, res, next){
	var err = req.session.err;
	var msg = req.session.message;
	var success = req.session.success;

	delete req.session.err;
	delete req.session.message;
	delete req.session.success;

	if(err) res.locals.error = err;
	if(msg) res.locals.message = msg;
	if(success) rew.locals.success = success;

	next();
});*/


module.exports = app;
