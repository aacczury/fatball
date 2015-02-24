var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer'); 
var path = require('path');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var routes = require('./routes/index');
var users = require('./routes/users');
var story = require('./routes/story');

var app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data
app.use(session({
	secret: '=911#e4)ad@849e+c21{35/4c*ee4[21$d8!b2}d_69790&350(9]',
	cookie: { maxAge: 172800000 },
	store: new MongoStore({
		url : 'mongodb://localhost:27017/story/sessions'
	})
}));

app.use('/', routes);
app.use('/users', users);
app.use('/story', story);

app.get('/about', function(req, res){
	res.render('pages/about');
});

app.listen(4104);
console.log('4104 is the fatball port');

module.exports = app;