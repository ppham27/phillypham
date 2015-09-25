PhillyPham
===

This is the code for my personal blog written in Node.js with Express. The main feature of this blog is a customized version of the [Ace editor](http://ace.c9.io/) on top of [PageDown](https://code.google.com/p/pagedown/) and [marked](https://github.com/chjj/marked). 

Developer Guide
---

### External Dependencies

To get this app up and running there are several requirements:
1. Redis, used for sessions and the Application Settings model
2. A SQL database for the rest of the models (I used Postgres)
3. Obviously, [Node.js](https://nodejs.org/).

The easiest way to get these things is [Homebrew](http://brew.sh/). 

### Configuration

- SQL configuration is in [config/config.json](https://github.com/ppham27/phillypham/blob/master/config/config.json). Notice that we have
```json
  {
      "production": {
          "use_env_variable": "DATABASE_URL"
      }
  }
```
for Heroku.
- The configuration is determined by `process.env.NODE_ENV`.

and inherits from [default.js](https://github.com/ppham27/phillypham/blob/master/config/default.js).
- To run this in production (see [production.js](https://github.com/ppham27/phillypham/blob/master/config/production.js)), you'll need your own:
  - siteUrl
  - secret key to secure cookies and sessions
  - RSA key pair (passwords are encrypted client-side before being sent to the server, where they are decrypted; this is poor man's SSL).
  - Facebook, Google, and Twitter app keys

To generate an RSA key pair, run 
```
$ openssl genrsa -out test_rsa_privkey.pem 2048 
```
for the private key and
```
$ openssl rsa -in test_rsa_privkey.pem -pubout -out test_rsa_pubkey.pem
```
for the public key.

### Building

1. `npm install`, the following subtasks are automatically run post install
  1. envify
  2. uglifyify
  3. browserify
  4. closurecompiler
2. `gulp markdown`
3. `npm start`

Now you can visit the site at [http://localhost:3000](http://localhost:3000).

### Deploying

After pushing to master, the repo will automatically deploy to Heroku. 
If any changes were made to the JavaScript, run `gulp markdown` first. 
I would prefer to compile on deployment, but Heroku doesn't provide sufficient memory.

### Testing

There are unit tests, integration tests, and functional tests.

#### Unit Tests

Run with `gulp test:unit`.


#### Integration Tests

Run with `gulp test:integration`.


You'll need to start with the databases for these tests. The gulp db:start task may be helpful. You'll probably need to edit it for your particular configuration.

#### Functional Tests

Run with `gulp test:functional`.

You'll also need to start the databases for this. You'll need an internet connection as well because it redirects to Facebook and Google. These require a [Selenium](http://www.seleniumhq.org/) server. The default configuration is to test with Chrome, so you'll need [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/), too. Of course, you can use a different browser by editing [test/support/browser.js](https://github.com/ppham27/phillypham/blob/master/test/support/browser.js). 

You will need to enable the Google+ API, and you will also need a `google.json` file in your config directory. It should look something like:

```
{
  "appKey": {
    "clientID": "GET THIS FROM GOOGLE DEVELOPER CONSOLE",
    "clientSecret": "GET THIS FROM GOOGLE DEVELOPER CONSOLE"
  },
  "testUsers": [
    {
      "email": "create users by hand",
      "password": "since it requires",
      "displayName": "a captcha"
    },
    {
      "email": "make a user that has",
      "password": "the same email as",
      "displayName": "a fixture for testing a merge"
    }
  ]
}
```

Config files for Facebook and SweetCaptcha are also needed. For Facebook you can create test users. Your `facebookTest.json` file should look like:
```
{
  "clientID": "",
  "clientSecret": "",
  "testUsers": [
    {
      "email": "",
      "password": "",
      "displayName": ""
    },
    {
      "email": "",
      "password": "",
      "displayName": ""
    }
  ]
}
```
You'll need to create `facebookDevelopment.json`, too. One of the tests requires a user that has the same email as a Facebook test user and a Google test user. See the comment in `test.js`.

`sweetCaptcha.json` looks like:
```
{
  "id": "239163",
  "key": "b3d024a06d8ee4225743a357bf63d43f",
  "secret": "db7f0cc141eaac91c99a434ea2fdb8fb"
}
```

### Customization

#### New Menubar Items

To add a new menubar item, go to `config/default.js` and add a `menu:newItem` entry to application settings. Then, go to `views/includes/header` and add a header link. Then, to allow yourself to update the link to the new item, go to `views/settings.jade` and add an input field with the name `menu:newItem` and change:
```javascript
var data = {};
['sidebar:info', 'sidebar:photoUrl', 'sidebar:title',
 'contact:email', 'contact:facebook', 'contact:instagram', 'contact:twitter',
 'menu:dataViz', 'menu:resume'].forEach(function(key) {
  data[key] = getValue(key);
});
```
to
```javascript
var data = {};
['sidebar:info', 'sidebar:photoUrl', 'sidebar:title',
 'contact:email', 'contact:facebook', 'contact:instagram', 'contact:twitter',
 'menu:dataViz', 'menu:resume', 'menu:newItem'].forEach(function(key) {
  data[key] = getValue(key);
});
```
in order for the menu item to be part of the `PUT` request.

### Editor

It may be worth while to extract the editor and customize it for your own purposes. To customize, use the `onPreviewRefresh` hook. It passes the editor itself as an argument and expects your function to return the editor back again.
