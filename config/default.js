module.exports = {
  secret: 'keyboard cat',
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
  // behavior is undetermined without at least one user group that matches
  // the default user group id
  applicationSettings: { title: 'PhillyPham',                         
                         defaultUserGroupId: 1,
                         sidebarTitle: 'About Me',
                         sidebarPhotoUrl: 'https://dl.dropboxusercontent.com/u/29552058/1504453_10151953824578353_1084290774_o.jpg',
                         sidebarInfo: 'Hello, World!'
                       },
  fixtures: [
    {model: 'Role', data: {id: 1, name: 'poster', description: 'can post'}},
    {model: 'Role', data: {id: 2, name: 'commenter', description: 'can comment'}},
    {model: 'Role', data: {id: 3, name: 'post_editor', description: 'can edit posts'}},
    {model: 'Role', data: {id: 4, name: 'comment_editor', description: 'can edit comments'}},
    {model: 'Role', data: {id: 5, name: 'user_manager', description: 'can manage users'}},
    {model: 'UserGroup', data: {id: 1, name: 'admin', description: 'all-powerful users',
                                Roles: [{name: 'poster'}, {name: 'commenter'}, {name: 'post_editor'},
                                        {name: 'comment_editor'}, {name: 'user_manager'}]}},
    {model: 'UserGroup', data: {id: 2, name: 'standard', description: 'default',
                                Roles: [{name: 'commenter'}]}},
    {model: 'UserGroup', data: {id: 3, name: 'power', description: 'extra privileges',
                                Roles: [{name: 'commenter'}, {name: 'poster'}]}},
    {model: 'UserGroup', data: {id: 4, name: 'moderator', description: 'extra extra privileges',
                                Roles: [{name: 'commenter'}, {name: 'poster'},
                                        {name: 'post_editor'}, {name: 'comment_editor'}]}},
    {model: 'User', data: {id: 1, displayName: 'admin', password: 'password', email: 'admin@admin.com', emailVerified: true, UserGroup: {name: 'admin'}}}
  ]   
}