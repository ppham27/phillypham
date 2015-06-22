PhillyPham
===

This is the code for my personal blog written in Node.js with Express. The main feature of this blog is a customized version of the [Ace editor](http://ace.c9.io/) on top of the [PageDown Markdown converter](https://code.google.com/p/pagedown/). 

Developer Guide
---

### External Dependencies

To get this app up and running there are several requirements:
1. Redis, used for sessions and the Application Settings model
2. A SQL database for the rest of the models (I used Postgres)
3. Obviously, [Node.js](https://nodejs.org/)

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
- The configuration is determined by 
```js
process.env.NODE_ENV
```
and inherits from [default.js](https://github.com/ppham27/phillypham/blob/master/config/default.js).
- To run this in production (see [production.js](https://github.com/ppham27/phillypham/blob/master/config/production.js)), you'll need your own:
  - siteUrl
  - secret key to secure cookies and sessions
  - RSA key pair (passwords are encrypted client-side before being sent to the server, where they are decrypted; this is poor man's SSL).
  - Facebook, Google, and Twitter app keys

### Testing

There are unit tests, integration tests, and functional tests.

#### Unit Tests

Run with
```
gulp test:unit
```

#### Integration Tests

Run with
```
gulp test:integration
```

You'll need to start with the databases for these tests. The gulp db:start task may be helpful. You'll probably need to edit it for your particular configuration.

#### Functional Tests

Run with
```
gulp test:functional
```

You'll also need to start the databases for this. You'll need an internet connection as well because it redirects to Facebook. These require a [Selenium](http://www.seleniumhq.org/) server. The default configuration is to test with Chrome, so you'll need [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/), too. Of course, you can use a different browser by editing [test/support/browser.js](https://github.com/ppham27/phillypham/blob/master/test/support/browser.js).

### Editor

It may be worth while to extract the editor and customize it for your open purposes. I'll write more on this later...
