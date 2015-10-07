var fs = require('fs');
var path = require('path');

var config = {
  secret: 'keyboard cat',
  rsaPublicKey: fs.readFileSync(path.join(__dirname, 'test_rsa_pubkey.pem'), 'ascii'),
  rsaPrivateKey: fs.readFileSync(path.join(__dirname, 'test_rsa_privkey.pem'), 'ascii'),
  redis: {
    port: 6379,
    host: '127.0.0.1',
    password: null,
    database: 1
  },
  sequelize: {
    dialect: 'postgres',
    username: 'username',
    password: 'password',
    host: 'host',
    port: 'port',
    database: 'database',
    url: 'postgres://username:password@host:port/database'
  },
  appKeys: {
    google: {
      clientID: '',
      clientSecret: '',
    },
    facebook: {
      clientID: '',
      clientSecret: '',
    },
    sweetCaptcha: {
      id: '',
      key: '',
      secret: ''
    }
  },
  smtpOptions: {
    fromDomain: '',
    host: '',
    secure: true,
    port: 465,
    auth: {
      user: '',
      pass: ''
    }    
  },
  // behavior is undetermined without at least one user group that matches
  // the default user group id
  applicationSettings: { title: 'PhillyPham',                         
                         defaultUserGroupId: 2,
                         "sidebar:title": 'About Me',
                         "sidebar:photoUrl": 'https://dl.dropboxusercontent.com/u/29552058/1504453_10151953824578353_1084290774_o.jpg',
                         "sidebar:info": 'Hello, World!',
                         "sidebar:infoHtml": '<p>Hello, World!</p>',
                         "contact:email": '',
                         "contact:facebook": '',
                         "contact:twitter": '',
                         "contact:instagram": '',
                         "menu:dataViz": '',
                         "menu:resume": '',
                         "blog:postsPerPage": 5,
                         "blog:tags": JSON.stringify([])
                       },
  fixtures: [
    {model: 'Role', data: {name: 'poster', description: 'can post'}},
    {model: 'Role', data: {name: 'commenter', description: 'can comment'}},
    {model: 'Role', data: {name: 'post_editor', description: 'can edit posts'}},
    {model: 'Role', data: {name: 'comment_editor', description: 'can edit comments'}},
    {model: 'Role', data: {name: 'user_manager', description: 'can manage users'}},
    {model: 'Role', data: {name: 'settings_manager', description: 'can edit application settings'}},
    {model: 'Role', data: {name: 'project_manager', description: 'can create and edit projects'}},
    {model: 'UserGroup', data: {name: 'admin', description: 'all-powerful users',
                                Roles: [{name: 'poster'}, {name: 'commenter'}, {name: 'post_editor'},
                                        {name: 'comment_editor'}, {name: 'user_manager'}, {name: 'settings_manager'},
                                        {name: 'project_manager'}]}},
    {model: 'UserGroup', data: {name: 'standard', description: 'default',
                                Roles: [{name: 'commenter'}]}},
    {model: 'UserGroup', data: {name: 'power', description: 'extra privileges',
                                Roles: [{name: 'commenter'}, {name: 'poster'}]}},
    {model: 'UserGroup', data: {name: 'moderator', description: 'extra extra privileges',
                                Roles: [{name: 'commenter'}, {name: 'poster'},
                                        {name: 'post_editor'}, {name: 'comment_editor'}]}},
    {model: 'User', data: {displayName: 'admin', password: 'password', email: 'admin@admin.com', emailVerified: true, UserGroup: {name: 'admin'}}}
  ]   
}

module.exports = config;
