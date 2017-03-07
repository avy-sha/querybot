/**
 * Created by Abhinav on 05-03-2017.
 */
var express = require('express');
var app = express();
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var type = require('type-of-is');
var base64url = require('base64-url');
var historyid;
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
var SCOPES = ['https://mail.google.com'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';
var HISTORY_PATH = TOKEN_DIR + 'History_id.txt';

app.listen(3000);

app.get('/users/google/callback', function(req, res) {
    console.log(req.query.code);
    res.end("boo");
});
// Load client secrets from a local file.
authorize(start);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback) {
    var clientSecret = "YOUR CLIENT SECRET";
    var clientId = "YOUR CLIENT ID";
    var redirectUrl ="YOUR REDIRECT URL";

    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    google.options({
        auth: oauth2Client
    });

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */

function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}
function storehistoryid(token) {
    try {
        fs.mkdirSync(HISTORY_PATH);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(HISTORY_PATH, JSON.stringify(token));
    console.log('Token stored to ' + HISTORY_PATH);
}


function start(auth){
    var gmail = google.gmail('v1');
    fs.readFile(HISTORY_PATH,function(err, hId) {
        if (err) {
            console.log(err);
        } else {
            historyid=JSON.parse(hId);

            list(auth);
        }
    });

}

function list(auth){console.log(historyid);
    var gmail = google.gmail('v1');
    gmail.users.history.list({
        auth: auth,
        userId: 'me',
        startHistoryId: historyid,
        historyTypes:'messageAdded',
        labelId:'INBOX'


    },  function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
          /* auth.refreshAccessToken(function(err, tokens) {
           storeToken(tokens)
           });*/
        }
        var id = response.history;
        var newhistoryid=response.historyId;
        storehistoryid(newhistoryid);
        console.log(response);
        var msg="";
        try
        {
            for(var i=0;id[i];i++){
                // console.log(id[i].messages[0].id);

                getmessage(id[i].messages[0].id,auth,gmail);
            }
        }
        catch(err) {console.log("no new messages");
            return;}
    });

}

function getmessage(id,auth,gmail) {
    gmail.users.messages.get({
        auth: auth,
        userId: 'me',
        id: id,
        format:'metadata',
        metadataHeaders: 'From'
    },function (err,response){

        var mailto=response.payload.headers[0].value;
        var string="To:"+mailto +"\n" +
            "Subject: hello";
        var r=base64url.escape(base64url.encode(string));
        console.log(r);
        gmail.users.messages.send({
            auth: auth,
            userId: 'me',
            resource: {raw:r}}
        )
    })

}
/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels1(auth) {
    var gmail = google.gmail('v1');
    gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        maxResults: 5,
        labelIds: "INBOX"


    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var id = response.messages;
        {
            console.log(id);
            getmessage(id[0].id,auth,gmail);
        }
    });
}


