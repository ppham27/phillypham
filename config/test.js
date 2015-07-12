var fs = require('fs');
var path = require('path');
var helper = require(__dirname + '/helper');
var defaultConfig = require('./default.js');

var sequelizeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))[process.env.NODE_ENV];

var config = { 
  siteUrl: 'http://localhost:8888',
  redis: {
    port: 6379,
    host: '127.0.0.1',
    database: 3,
    password: 'password'
  },
  appKeys: {
    facebook: JSON.parse(fs.readFileSync(path.join(__dirname, 'facebookTest.json'), 'utf8')),
    // an object with two keys: clientID and clientSecret
    google: JSON.parse(fs.readFileSync(path.join(__dirname, 'google.json'), 'utf8')).appKey ,
    sweetCaptcha: JSON.parse(fs.readFileSync(path.join(__dirname, 'sweetCaptcha.json'), 'utf8'))
  },
  smtpOptions: JSON.parse(fs.readFileSync(path.join(__dirname, 'smtp.json'), 'utf8')),
  applicationSettings: { title: 'PhillyPham',                         
                         defaultUserGroupId: 2,
                         "sidebar:title": 'About Me',
                         "sidebar:photoUrl": 'picture.jpg',
                         "sidebar:info": 'Hello, World!',
                         "sidebar:infoHtml": '<p>Hello, World!</p>'
                       },
  sequelize: helper.parseSequelizeConfig(sequelizeConfig)
}

config.fixtures = defaultConfig.fixtures;
config.fixtures.push({model: 'User', data: {displayName: 'power', password: 'powerpower', email: 'power@gmail.com', emailVerified: true, UserGroup: {name: 'power'}}});
config.fixtures.push({model: 'User', data: {displayName: 'standard', password: 'standard', email: 'standard@gmail.com', emailVerified: true, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'unverified', password: 'unverified', email: 'phil@phillypham.com', emailVerified: false, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'moderator', password: 'moderator', email: 'moderator@gmail.com', emailVerified: true, UserGroup: {name: 'moderator'}}});
// this user has the same email as the facebook test user
config.fixtures.push({model: 'User', data: {displayName: 'not my real name', password: 'somejunk', email: 'gdsgtzj_sharpesen_1434574400@tfbnw.net', 
                                            emailVerified: true, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'no name joe', password: 'somejunk', email: 'phillyphamtest2@gmail.com', 
                                            emailVerified: true, UserGroup: {name: 'standard'}}});

config.fixtures.push({model: 'Project', 
                      data: {title: 'First Project', 
                             summary: 'My project summary',
                             description: 'My project description',
                             url: 'https://github.com/ppham27',
                             published: true,
                             User: {displayName: 'admin'}}});
config.fixtures.push({model: 'Project', 
                      data: {title: 'Second Project', 
                             summary: 'Longer project summary. Longer project summary. Longer project summary. Longer project summary.',
                             description: 'My project description. My project description. My project description.',
                             url: 'https://github.com/ppham27',
                             published: true,
                             User: {displayName: 'admin'}}});

config.fixtures.push({model: 'Project', 
                      data: {title: 'Unpublished First Project', 
                             summary: 'My project summary',
                             description: 'My project description',
                             url: 'https://github.com/ppham27',
                             User: {displayName: 'admin'}}});
config.fixtures.push({model: 'Project', 
                      data: {title: 'Unpublished Second Project', 
                             summary: 'Longer project summary. Longer project summary. Longer project summary. Longer project summary.',
                             description: 'My project description. My project description. My project description.',
                             url: 'https://github.com/ppham27',
                             User: {displayName: 'admin'}}});

config.fixtures.push({model: 'Tag',
                      data: {name: 'math'}});
config.fixtures.push({model: 'Tag',
                      data: {name: 'computer science'}});
config.fixtures.push({model: 'Tag',
                      data: {name: 'life'}});
config.fixtures.push({model: 'Tag',
                      data: {name: 'jesus'}});
config.fixtures.push({model: 'Tag',
                      data: {name: 'tennis'}});
config.fixtures.push({model: 'Tag',
                      data: {name: 'panda'}});

config.fixtures.push({model: 'Post',
                      data: {title: 'First Post',
                             body: 'Mauris quis purus nec nunc dignissim ultricies vitae non tortor. Maecenas vel sollicitudin neque, quis vehicula tortor. Fusce nec leo tincidunt, lacinia dolor sed, elementum arcu. Aenean vel hendrerit orci. Sed non nisl non velit ultrices ornare sit amet id lectus. Phasellus non sagittis magna. Curabitur ornare risus eget est pretium, vitae molestie diam interdum. Aenean luctus tortor magna, at congue magna tincidunt vitae. Cras tempus libero eget sodales dignissim. Donec mi tellus, faucibus ut elementum eget, cursus vitae odio. Suspendisse eleifend ante et neque gravida, eget semper lacus mattis. Aliquam sit amet quam non dolor blandit fringilla malesuada non elit.\n\nDonec porttitor ullamcorper orci, iaculis imperdiet diam tempus id. Duis sapien lorem, tincidunt quis sagittis sodales, venenatis ac ipsum. Morbi ornare fermentum hendrerit. Cras lorem tellus, consectetur sit amet hendrerit at, sodales in tortor. Phasellus ut arcu lobortis, volutpat dolor non, ornare magna. Aliquam aliquam turpis quis turpis accumsan luctus. Nam at felis mattis, laoreet dui venenatis, tincidunt felis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Integer posuere sit amet ipsum tempus consequat. Maecenas interdum purus non fermentum suscipit. Duis sed ligula ut mauris lacinia lobortis id a erat. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Vestibulum nec ultricies leo. Nulla in dui convallis magna dapibus interdum non sit amet purus. Etiam vel sem velit.\n\nNunc eget lorem nulla. Duis non ante vestibulum, molestie nunc nec, imperdiet tellus. Nam mollis metus diam, et laoreet justo pretium ut. Ut id mattis leo. Curabitur vestibulum, velit eget tristique consequat, enim metus placerat ligula, sed consectetur lorem nisi bibendum purus. Praesent consectetur, eros eget blandit feugiat, nulla lorem blandit diam, id ultricies lorem diam et nibh. Pellentesque mattis metus nec volutpat laoreet. Morbi malesuada dui sit amet sodales porta. Quisque luctus augue sit amet risus tempor semper. Mauris efficitur leo vitae rhoncus aliquam. Nullam ac nisi vitae dolor laoreet faucibus id at purus. Cras elit enim, placerat vitae nisl non, condimentum accumsan sapien. Vivamus maximus ex sed dolor pretium, ac condimentum neque vehicula. Proin at arcu tortor. Morbi sodales faucibus arcu, ac elementum nibh sagittis quis.',
                             photoUrl: 'https://dl.dropboxusercontent.com/u/29552058/2012-12-10%2020.42.39.jpg',
                             published: true,
                             User: {displayName: 'admin'},
                             Tags: [{name: 'life'}, {name: 'jesus'}]
                            }});

config.fixtures.push({model: 'Post',
                      data: {title: 'Second Post',
                             body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque imperdiet mauris vitae ipsum ornare, sed convallis justo mattis. Ut dapibus bibendum mauris egestas iaculis. Vivamus condimentum vel orci tincidunt volutpat. Integer dapibus nibh eros, id rutrum ante ornare et. Integer sapien velit, malesuada ac egestas in, aliquam nec urna. In eleifend viverra felis sed blandit. Donec consectetur iaculis tortor quis iaculis. Nulla lacinia laoreet faucibus. Donec scelerisque at eros vel sagittis. Vivamus felis ex, pellentesque non neque eget, dictum egestas ex. Vivamus efficitur sem a nibh lacinia pulvinar. Praesent at dictum orci. Etiam eget bibendum turpis. Donec sollicitudin eros in iaculis interdum.\n\nNam aliquet dolor ac enim venenatis rutrum. Proin ut lacus id tellus molestie tristique. Maecenas maximus, quam nec efficitur ultricies, nisi justo lacinia dui, in molestie sem risus eu nisi. Quisque pharetra commodo mi, ac faucibus dui condimentum et. Aenean a sapien vel ligula fringilla egestas ac laoreet lacus. Vestibulum erat neque, congue vel aliquam eu, sagittis id nibh. Maecenas fringilla egestas eros non consectetur. Integer auctor auctor orci nec interdum. Fusce sagittis pretium ultrices. Curabitur posuere nibh at diam mattis, ut aliquam dui dignissim. Morbi scelerisque accumsan odio, vel pretium dolor semper venenatis. Nam congue gravida pellentesque. Cras nec neque vitae eros ornare mattis sed sit amet dui. Nullam ullamcorper mi a est fermentum, in gravida nulla imperdiet. Curabitur pulvinar ex vitae lectus pellentesque, nec porta erat posuere. Nunc imperdiet augue et viverra varius.',
                             published: true,
                             User: {displayName: 'admin'},
                             Tags: [{name: 'tennis'}, {name: 'computer science'}]}});

config.fixtures.push({model: 'Post',
                      data: {title: 'Third Post',
                             body: 'Integer volutpat nunc a lectus porta finibus. Aliquam eu malesuada metus. Nulla augue tortor, tempor ac tortor ut, luctus volutpat quam. Morbi tortor urna, consequat in lacinia dictum, mattis at odio. Nam convallis diam ut ullamcorper placerat. Integer tortor odio, maximus bibendum tristique venenatis, luctus in felis. Mauris cursus condimentum ligula id laoreet. Donec vestibulum eros justo, eget pulvinar massa vestibulum vitae. Vivamus non turpis sed tellus ullamcorper mollis. Aenean fermentum felis ac risus tempus, sed laoreet arcu tempor. In hac habitasse platea dictumst. Donec scelerisque lacus a mi condimentum rhoncus. Donec non purus lectus. Sed tincidunt augue non augue egestas eleifend.\n\nProin sed porttitor elit. Sed ut tortor quam. Integer aliquet velit vel enim commodo, a efficitur dolor blandit. Sed augue purus, vehicula sit amet ante sed, tempor congue tellus. In ut imperdiet ipsum. Curabitur interdum magna a posuere bibendum. Nulla facilisi. Donec laoreet, metus id suscipit hendrerit, ligula nibh rhoncus lorem, id volutpat mi magna at enim. Duis justo quam, sodales sit amet odio ac, faucibus congue urna. Etiam auctor ultrices justo at aliquam. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nulla a sem non ipsum viverra auctor nec non dolor. Donec lacus purus, feugiat bibendum lectus et, viverra dapibus est. Quisque blandit accumsan blandit. In eu augue sed dolor lobortis convallis. Donec viverra ligula sed nibh viverra, sed ornare lorem porttitor.',
                             photoUrl: 'https://dl.dropboxusercontent.com/u/29552058/20131219_152823.jpg',
                             published: true,
                             User: {displayName: 'admin'},
                             Tags: [{name: 'math'}]}});
                             
config.fixtures.push({model: 'Comment',
                      data: {body: 'comment',
                             published: true,
                             User: {displayName: 'moderator'},
                             Post: {title: 'First Post'}}});

config.fixtures.push({model: 'Comment',
                      data: {body: 'second comment',
                             published: true,
                             User: {displayName: 'moderator'},
                             Post: {title: 'First Post'}}});

config.fixtures.push({model: 'Comment',
                      data: {body: 'reply comment',
                             published: true,
                             User: {displayName: 'power'},
                             Post: {title: 'First Post'},
                             Comment: {id: 1}}});

config.fixtures.push({model: 'Comment',
                      data: {body: 'super nested comment',
                             published: true,
                             User: {displayName: 'standard'},
                             Post: {title: 'First Post'},
                             Comment: {id: 3}}});

config.fixtures.push({model: 'Comment',
                      data: {body: 'other reply comment',
                             published: true,
                             User: {displayName: 'power'},
                             Post: {title: 'First Post'},
                             Comment: {id: 1}}});

config.fixtures.push({model: 'Comment',
                      data: {body: 'unpublished comment',
                             published: false,
                             User: {displayName: 'standard'},
                             Post: {title: 'First Post'}}});

config.fixtures.push({model: 'Comment',
                      data: {body: 'nested unpublished comment',
                             published: false,
                             User: {displayName: 'power'},
                             Post: {title: 'First Post'},
                             Comment: {id: 3}}});


config.fixtures.push({model: 'Post',
                      data: {title: 'Unpublished Title',
                             body: 'unpublished post',
                             published: false,
                             User: {displayName: 'admin'},
                             Tags: [{name: 'math'}]}});

config.fixtures.push({model: 'Post',
                      data: {title: 'Power Unpublished Title',
                             body: 'Power unpublished post',
                             published: false,
                             User: {displayName: 'power'},
                             Tags: [{name: 'math'}]}});

// an array objects consisting of an email and password
config.appKeys.google.testUsers = JSON.parse(fs.readFileSync(path.join(__dirname, 'google.json'), 'utf8')).testUsers;

module.exports = config;

