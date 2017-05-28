var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , Twit = require('twit')
  , io = require('socket.io').listen(server)
  , path = require("path")
  , watson = require("watson-developer-cloud")
  , GoogleSearch = require("google-search")
  , csv = require("csvtojson");
  
server.listen(8000);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

var T = new Twit({
    consumer_key:         'U3103EqCx371xy2DOBmiYZeq5'
  , consumer_secret:      'dCUHg9ihPEUnIJJ2BCPTe9IQfmmqjJRFVV1oEyjqzBqA3zP5wV'
  , access_token:         '863250364467994625-E55mX0a72kXf6urlVGtiDrG3eu6UeJt'
  , access_token_secret:  'MFBpsDt2e2ezdAudYSd5UZsXt9as9Uqvn2n4uMiUSwUsV'
});

var tone_analyzer = watson.tone_analyzer({
    username: '455c7ceb-3c2a-42d0-8d88-d4d69b12adec',
    password: 'p42wV5jE6SRh',
    version: 'v3',
    version_date: '2016-05-19'
});

var stockSymbols = [];

function findHashtags(tweet)
{
	// Gets all hashtags in a tweet and adds it to data as an array
	
	var text = tweet.text;
	var hashtagFound = false;
	var hashtag = "";
	var hashtags = [];
	
	for (var i = 0; i < text.length; i++)
	{
		if (text[i] === " " && hashtagFound === true)
		{
			hashtagFound = false;
			if (hashtag !== "$" && hashtag !== "")
			{
				hashtags.push(hashtag);
			}
			hashtag = "";
		}
		if (text[i] === "$")
		{
			hashtagFound = true;
		}
		if (hashtagFound)
		{
			hashtag += text[i];
		}
	}
	return hashtags;
}

var nasdaqFilePath = "csv/top400.csv";
csv().fromFile(nasdaqFilePath)
	.on("json", function(jsonObj) {
		stockSymbols.push(jsonObj["BLK"])
	})
	.on("done", function(error) {
		io.sockets.on("connection", function(socket) {
			console.log("connected");
			var stream = T.stream("statuses/filter", {track: stockSymbols});
			stream.on("tweet", function(tweet) {
				try
				{
					var toneList = null;
					tone_analyzer.tone({ text: tweet.text },
						function(err, tone) {
							if (err)
							{
								console.log(err);
							}
							else
							{
								toneList = tone["document_tone"]["tone_categories"][0]["tones"];
								var hashtags = findHashtags(tweet);
								for (var i = 0; i <	hashtags.length; i++)
								{
									if (hashtags[i])
									{
										//:-( fk async in js, comment later
										console.log("we there");
										io.sockets.emit("stream", [hashtags[0], toneList]);
									}
								}
							}
						});
				}
				catch(err)
				{
					console.log(err);
				}
			});
		});
	});